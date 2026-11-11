export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface ProviderConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

export interface AssistantSettings {
  activeProvider: AiProvider;
  activeModel: string;
  openai: ProviderConfig;
  anthropic: ProviderConfig;
  gemini: ProviderConfig;
  groq: ProviderConfig;
  openrouter: ProviderConfig;
  ollama: ProviderConfig;
  defaultSystemPrompt: string;
  temperature: number;
  maxTokens: number;
  requireApprovalForReads: boolean;
  requireApprovalForWrites: boolean;
  autoApproveReadsThisSession?: boolean;
}

export type ToolName = 'read_file' | 'write_file' | 'list_files';

export type ToolStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

export interface ToolCallRequest {
  id: string;
  name: ToolName;
  arguments: {
    path?: string;
    content?: string;
    directory?: string;
    reason?: string;
  };
  status: ToolStatus;
  userDecisionTimestamp?: number;
  error?: string;
}

export interface ToolCallResult {
  toolCallId: string;
  name: ToolName;
  success: boolean;
  output: string;
  error?: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCall?: ToolCallRequest;
  toolResult?: ToolCallResult;
  isError?: boolean;
}

export interface ServerContext {
  uuid: string;
  name: string;
  eggName?: string;
  nodeName?: string;
  status?: string;
  ip?: string;
  port?: number;
}
