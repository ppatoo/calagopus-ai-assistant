import {
  AssistantSettings,
  ChatMessage,
  ServerContext,
  ToolCallRequest,
  ToolCallResult,
} from '../types/index.ts';

export const SYSTEM_TOOLS_DECLARATION = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Requests permission to read the contents of a file on the server. Always specify a clear reason to display to the user.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file relative to the server root, e.g. "server.properties", "config/paper-global.yml", "logs/latest.log".',
          },
          reason: {
            type: 'string',
            description: 'Explanation for the user why you need to read this file.',
          },
        },
        required: ['path', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Requests permission to write or modify a file on the server with new content. The user will be shown a diff preview and must approve it before anything is written.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file relative to the server root, e.g. "server.properties", "eula.txt".',
          },
          content: {
            type: 'string',
            description: 'The full new content of the file.',
          },
          reason: {
            type: 'string',
            description: 'Detailed explanation of why you are modifying this file and what changed.',
          },
        },
        required: ['path', 'content', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists files and directories on the server in a specified directory.',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Directory path relative to server root, e.g. "/" or "plugins/".',
          },
          reason: {
            type: 'string',
            description: 'Reason for listing files in this directory.',
          },
        },
        required: ['directory'],
      },
    },
  },
];

export function buildSystemPrompt(settings: AssistantSettings, serverContext?: ServerContext): string {
  let prompt = settings.defaultSystemPrompt;

  if (serverContext) {
    prompt += `\n\n--- CURRENT SERVER CONTEXT ---
Server Name: ${serverContext.name}
Server UUID: ${serverContext.uuid}
Game / Egg: ${serverContext.eggName || 'Generic'}
Node: ${serverContext.nodeName || 'Default'}
Current Status: ${serverContext.status || 'unknown'}
Address: ${serverContext.ip || 'localhost'}:${serverContext.port || 25565}
------------------------------
You have the ability to inspect and modify server files, but you MUST NEVER assume file contents without reading them first.
Whenever you want to read or write a file, you MUST trigger the corresponding tool ('read_file' or 'write_file').
The user will be prompted with an interactive approval card in the web UI. They can review and Approve or Deny your request.
Always be polite, explain what you are doing, and propose safe, optimized configurations.`;
  } else {
    prompt += `\n\nCurrently, you are running in global panel mode without a specific server selected. You can answer general game server administration, networking, plugin configuration, and panel questions.`;
  }

  return prompt;
}

export interface SendMessageOptions {
  messages: ChatMessage[];
  settings: AssistantSettings;
  serverContext?: ServerContext;
  onToolCallRequested?: (toolCall: ToolCallRequest) => void;
}

export interface SendMessageResult {
  text: string;
  toolCall?: ToolCallRequest;
}

export async function sendChatMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const { messages, settings, serverContext } = options;
  const provider = settings.activeProvider;
  const config = settings[provider];

  if (!config.apiKey && provider !== 'ollama') {
    throw new Error(
      `No API key configured for ${provider.toUpperCase()}. Please click the Settings (⚙️) icon and enter your API key.`
    );
  }

  const systemPrompt = buildSystemPrompt(settings, serverContext);

  if (provider === 'gemini') {
    return sendGeminiRequest(messages, systemPrompt, config.apiKey, config.model, settings.temperature);
  } else if (provider === 'anthropic') {
    return sendAnthropicRequest(messages, systemPrompt, config.apiKey, config.model, settings.temperature);
  } else {
    // OpenAI, Groq, OpenRouter, Ollama (OpenAI-compatible format)
    return sendOpenAiCompatibleRequest(
      messages,
      systemPrompt,
      config.apiKey,
      config.baseUrl || 'https://api.openai.com/v1',
      config.model,
      settings.temperature
    );
  }
}

async function sendOpenAiCompatibleRequest(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  temperature: number
): Promise<SendMessageResult> {
  const formattedMessages: any[] = [{ role: 'system', content: systemPrompt }];

  for (const m of messages) {
    if (m.role === 'tool' && m.toolResult) {
      formattedMessages.push({
        role: 'tool',
        tool_call_id: m.toolResult.toolCallId,
        content: m.toolResult.output,
      });
    } else if (m.toolCall) {
      formattedMessages.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: [
          {
            id: m.toolCall.id,
            type: 'function',
            function: {
              name: m.toolCall.name,
              arguments: JSON.stringify(m.toolCall.arguments),
            },
          },
        ],
      });
    } else {
      formattedMessages.push({
        role: m.role,
        content: m.content,
      });
    }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      tools: SYSTEM_TOOLS_DECLARATION,
      tool_choice: 'auto',
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error('No response returned from model.');
  }

  const assistantMsg = choice.message;
  let text = assistantMsg.content || '';
  let toolCall: ToolCallRequest | undefined = undefined;

  if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    const rawTool = assistantMsg.tool_calls[0];
    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(rawTool.function.arguments);
    } catch {
      parsedArgs = { raw: rawTool.function.arguments };
    }

    toolCall = {
      id: rawTool.id || `tc_${Date.now()}`,
      name: rawTool.function.name as any,
      arguments: parsedArgs,
      status: 'pending_approval',
    };
  } else {
    // Fallback: Check if smaller models output text-based tool call blocks
    const fallbackCall = parseTextToolCall(text);
    if (fallbackCall) {
      toolCall = fallbackCall;
      text = text.replace(/```(?:json)?\s*\{\s*"tool"[\s\S]*?```/i, '').trim();
    }
  }

  return { text, toolCall };
}

async function sendAnthropicRequest(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string,
  temperature: number
): Promise<SendMessageResult> {
  const anthropicMessages: any[] = [];

  for (const m of messages) {
    if (m.role === 'tool' && m.toolResult) {
      anthropicMessages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.toolResult.toolCallId,
            content: m.toolResult.output,
          },
        ],
      });
    } else if (m.toolCall) {
      anthropicMessages.push({
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: m.toolCall.id,
            name: m.toolCall.name,
            input: m.toolCall.arguments,
          },
        ],
      });
    } else if (m.role === 'user' || m.role === 'assistant') {
      anthropicMessages.push({
        role: m.role,
        content: m.content,
      });
    }
  }

  const tools = SYSTEM_TOOLS_DECLARATION.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: anthropicMessages,
      tools,
      max_tokens: 4096,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error (${response.status}): ${err}`);
  }

  const data = await response.json();
  let text = '';
  let toolCall: ToolCallRequest | undefined = undefined;

  for (const block of data.content || []) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'tool_use') {
      toolCall = {
        id: block.id,
        name: block.name,
        arguments: block.input,
        status: 'pending_approval',
      };
    }
  }

  return { text, toolCall };
}

async function sendGeminiRequest(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string,
  temperature: number
): Promise<SendMessageResult> {
  const contents: any[] = [];

  for (const m of messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      if (m.toolCall) {
        contents.push({
          role: 'model',
          parts: [
            {
              functionCall: {
                name: m.toolCall.name,
                args: m.toolCall.arguments,
              },
            },
          ],
        });
      } else {
        contents.push({ role: 'model', parts: [{ text: m.content }] });
      }
    } else if (m.role === 'tool' && m.toolResult) {
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: m.toolResult.name,
              response: { output: m.toolResult.output },
            },
          },
        ],
      });
    }
  }

  const functionDeclarations = SYSTEM_TOOLS_DECLARATION.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: [{ functionDeclarations }],
      generationConfig: { temperature, maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidate returned from Gemini.');
  }

  let text = '';
  let toolCall: ToolCallRequest | undefined = undefined;

  for (const part of candidate.content?.parts || []) {
    if (part.text) {
      text += part.text;
    } else if (part.functionCall) {
      toolCall = {
        id: `gemini_tc_${Date.now()}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
        status: 'pending_approval',
      };
    }
  }

  return { text, toolCall };
}

function parseTextToolCall(text: string): ToolCallRequest | null {
  const match = text.match(/```(?:json)?\s*\{\s*"tool":\s*"([^"]+)",\s*"arguments":\s*(\{[\s\S]*?\})\s*\}\s*```/i);
  if (match) {
    try {
      const name = match[1] as any;
      const args = JSON.parse(match[2]);
      return {
        id: `manual_tc_${Date.now()}`,
        name,
        arguments: args,
        status: 'pending_approval',
      };
    } catch {
      return null;
    }
  }
  return null;
}
