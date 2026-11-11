import { useEffect, useRef, useState } from 'react';
import {
  ChatMessage as ChatMessageType,
  ServerContext,
  ToolCallRequest,
  ToolCallResult,
} from '../types/index.ts';
import { loadSettings, saveSettings } from '../services/settingsService.ts';
import { sendChatMessage } from '../services/aiClient.ts';
import {
  listServerFiles,
  readServerFile,
  writeServerFile,
} from '../services/fileService.ts';
import { ChatMessage } from './ChatMessage.tsx';
import { SettingsModal } from './SettingsModal.tsx';

interface AiAssistantChatProps {
  serverContext?: ServerContext;
}

const QUICK_PROMPTS = [
  '🔍 Inspect server.properties and summarize configuration',
  '⚡ Recommend memory and performance optimizations for this server',
  '📂 List all files in the root server directory',
  '🛠️ Look at the latest crash/error logs and diagnose any issues',
];

export function AiAssistantChat({ serverContext }: AiAssistantChatProps) {
  const [settings, setSettings] = useState(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize greeting on first load
  useEffect(() => {
    const greeting = serverContext
      ? `👋 Hello! I am your AI Assistant for **${serverContext.name}** (${serverContext.eggName || 'Game Server'}). I can inspect configuration files, help you optimize server settings, diagnose crashes, and make edits—always asking for your explicit approval before reading or writing any files. What would you like help with today?`
      : '👋 Hello! I am your Calagopus AI Assistant. I can help answer questions regarding game servers, panel operations, plugin setups, and configs. Please configure your API key in Settings (⚙️) to get started!';

    setMessages([
      {
        id: 'initial_greeting',
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [serverContext?.uuid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorBanner(null);
    setInputValue('');

    const userMsg: ChatMessageType = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        messages: newMessages,
        settings,
        serverContext,
      });

      const assistantMsg: ChatMessageType = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        toolCall: response.toolCall,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to get response from AI model.');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error**: ${err.message || 'Unable to communicate with AI provider.'}`,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTool = async (toolCall: ToolCallRequest) => {
    if (!serverContext?.uuid) {
      alert('Cannot perform file operations without an active server context.');
      return;
    }

    const serverId = serverContext.uuid;

    // Update status to executing
    setMessages((prev) =>
      prev.map((m) =>
        m.toolCall?.id === toolCall.id
          ? {
              ...m,
              toolCall: { ...m.toolCall, status: 'executing' },
            }
          : m
      )
    );

    let output = '';
    let success = true;

    try {
      if (toolCall.name === 'read_file') {
        const filePath = toolCall.arguments.path || '';
        output = await readServerFile(serverId, filePath);
      } else if (toolCall.name === 'write_file') {
        const filePath = toolCall.arguments.path || '';
        const content = toolCall.arguments.content || '';
        await writeServerFile(serverId, filePath, content);
        output = `Successfully wrote ${content.length} characters to file '${filePath}'.`;
      } else if (toolCall.name === 'list_files') {
        const dir = toolCall.arguments.directory || '/';
        const files = await listServerFiles(serverId, dir);
        output = JSON.stringify(files, null, 2);
      }
    } catch (err: any) {
      success = false;
      output = `Error executing ${toolCall.name}: ${err.message || 'Operation failed'}`;
    }

    const toolResult: ToolCallResult = {
      toolCallId: toolCall.id,
      name: toolCall.name,
      success,
      output,
      timestamp: Date.now(),
    };

    // Update message with completed status and toolResult
    const updatedMessages = messages.map((m) =>
      m.toolCall?.id === toolCall.id
        ? {
            ...m,
            toolCall: {
              ...m.toolCall,
              status: (success ? 'completed' : 'failed') as any,
              userDecisionTimestamp: Date.now(),
            },
            toolResult,
          }
        : m
    );

    // Also push a tool result message for LLM context
    const toolMsg: ChatMessageType = {
      id: `tool_res_${Date.now()}`,
      role: 'tool',
      content: output,
      timestamp: Date.now(),
      toolResult,
    };

    const finalMessages = [...updatedMessages, toolMsg];
    setMessages(finalMessages);

    // Prompt the AI to continue with the tool output
    setIsLoading(true);
    try {
      const followUp = await sendChatMessage({
        messages: finalMessages,
        settings,
        serverContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_a_follow_${Date.now()}`,
          role: 'assistant',
          content: followUp.text,
          timestamp: Date.now(),
          toolCall: followUp.toolCall,
        },
      ]);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to complete assistant response.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectTool = async (toolCall: ToolCallRequest) => {
    // Update message with rejected status
    const output = `User denied permission to execute '${toolCall.name}' on file '${toolCall.arguments.path || toolCall.arguments.directory}'.`;

    const toolResult: ToolCallResult = {
      toolCallId: toolCall.id,
      name: toolCall.name,
      success: false,
      output,
      timestamp: Date.now(),
    };

    const updatedMessages = messages.map((m) =>
      m.toolCall?.id === toolCall.id
        ? {
            ...m,
            toolCall: {
              ...m.toolCall,
              status: 'rejected' as any,
              userDecisionTimestamp: Date.now(),
            },
            toolResult,
          }
        : m
    );

    const toolMsg: ChatMessageType = {
      id: `tool_res_denied_${Date.now()}`,
      role: 'tool',
      content: output,
      timestamp: Date.now(),
      toolResult,
    };

    const finalMessages = [...updatedMessages, toolMsg];
    setMessages(finalMessages);

    // Re-prompt assistant so it knows the user denied the request
    setIsLoading(true);
    try {
      const followUp = await sendChatMessage({
        messages: finalMessages,
        settings,
        serverContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_a_follow_denied_${Date.now()}`,
          role: 'assistant',
          content: followUp.text,
          timestamp: Date.now(),
          toolCall: followUp.toolCall,
        },
      ]);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to update assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setMessages([
        {
          id: `msg_g_${Date.now()}`,
          role: 'assistant',
          content: '✨ Conversation cleared. How can I help you next?',
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-md text-white font-bold text-base">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Calagopus AI Assistant
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {settings.activeProvider} ({settings.activeModel})
              </span>
            </div>
            {serverContext && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>
                  Attached to: <strong className="text-slate-200">{serverContext.name}</strong>
                </span>
                {serverContext.eggName && (
                  <span className="text-slate-500">({serverContext.eggName})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            title="Configure API keys & safety"
          >
            <span>⚙️</span>
            <span>API Keys &amp; Settings</span>
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition cursor-pointer"
            title="Clear conversation"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {errorBanner && (
        <div className="px-5 py-2.5 bg-rose-950/80 border-b border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onApproveTool={handleApproveTool}
            onRejectTool={handleRejectTool}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 my-2 text-xs text-sky-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Assistant is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestion Pills (Shown when few messages) */}
      {messages.length <= 2 && (
        <div className="px-5 py-2 bg-slate-900/50 border-t border-slate-800/60 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 hover:bg-sky-950 text-slate-300 hover:text-sky-300 border border-slate-700/60 hover:border-sky-500/40 transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex items-end gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-2 focus-within:border-sky-500/80 transition shadow-inner">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              serverContext
                ? `Ask about ${serverContext.name}, inspect logs, edit configs (Press Enter to send)...`
                : 'Ask a question or configure your API key...'
            }
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 resize-none focus:outline-hidden leading-relaxed px-1"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white shadow transition cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <span>Send</span>
            <span>➤</span>
          </button>
        </div>

        {/* Safety Note & Status Footer */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span>🛡️</span>
            <span>File modification requires explicit manual approval.</span>
          </span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
      />
    </div>
  );
}
