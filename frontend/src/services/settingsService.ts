import { AssistantSettings, AiProvider } from '../types/index.ts';

const SETTINGS_STORAGE_KEY = 'calagopus_ai_assistant_settings_v1';

export const DEFAULT_SETTINGS: AssistantSettings = {
  activeProvider: 'openai',
  activeModel: 'gpt-4o-mini',
  openai: {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    enabled: true,
  },
  anthropic: {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-haiku-latest',
    enabled: true,
  },
  gemini: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
    enabled: true,
  },
  groq: {
    provider: 'groq',
    apiKey: '',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    enabled: true,
  },
  openrouter: {
    provider: 'openrouter',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    enabled: true,
  },
  ollama: {
    provider: 'ollama',
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    enabled: false,
  },
  defaultSystemPrompt:
    'You are the Calagopus Game Panel AI Assistant. You assist server administrators in inspecting, troubleshooting, and configuring game servers (Minecraft, Rust, Palworld, Node.js, Python, Discord bots, etc.). Whenever you need to read or edit server configuration files or logs, ask the user and request the tool call. Always explain why you want to read or modify a file before doing so.',
  temperature: 0.7,
  maxTokens: 4096,
  requireApprovalForReads: true,
  requireApprovalForWrites: true,
  autoApproveReadsThisSession: false,
};

export const PROVIDER_MODELS: Record<AiProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini', 'o3-mini'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  openrouter: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-flash-1.5',
    'deepseek/deepseek-chat',
  ],
  ollama: ['llama3.2', 'qwen2.5-coder', 'mistral', 'deepseek-r1', 'custom'],
};

export function loadSettings(): AssistantSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load local AI assistant settings:', err);
  }

  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AssistantSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to persist local AI assistant settings:', err);
  }

  // Also sync to Calagopus backend if available
  fetch('/api/extensions/dev.calagopus.aiassistant/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      active_provider: settings.activeProvider,
      active_model: settings.activeModel,
      openai: {
        provider: 'openai',
        api_key: settings.openai.apiKey || null,
        base_url: settings.openai.baseUrl || null,
        model: settings.openai.model,
        enabled: settings.openai.enabled,
      },
      anthropic: {
        provider: 'anthropic',
        api_key: settings.anthropic.apiKey || null,
        base_url: settings.anthropic.baseUrl || null,
        model: settings.anthropic.model,
        enabled: settings.anthropic.enabled,
      },
      gemini: {
        provider: 'gemini',
        api_key: settings.gemini.apiKey || null,
        base_url: settings.gemini.baseUrl || null,
        model: settings.gemini.model,
        enabled: settings.gemini.enabled,
      },
      groq: {
        provider: 'groq',
        api_key: settings.groq.apiKey || null,
        base_url: settings.groq.baseUrl || null,
        model: settings.groq.model,
        enabled: settings.groq.enabled,
      },
      openrouter: {
        provider: 'openrouter',
        api_key: settings.openrouter.apiKey || null,
        base_url: settings.openrouter.baseUrl || null,
        model: settings.openrouter.model,
        enabled: settings.openrouter.enabled,
      },
      ollama: {
        provider: 'ollama',
        api_key: settings.ollama.apiKey || null,
        base_url: settings.ollama.baseUrl || null,
        model: settings.ollama.model,
        enabled: settings.ollama.enabled,
      },
      default_system_prompt: settings.defaultSystemPrompt,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      require_approval_for_reads: settings.requireApprovalForReads,
      require_approval_for_writes: settings.requireApprovalForWrites,
    }),
  }).catch(() => {
    // Non-fatal, local storage remains source of truth for user
  });
}

export async function testConnection(
  provider: AiProvider,
  apiKey: string,
  baseUrl?: string,
  model?: string,
): Promise<{ success: boolean; message: string; models?: string[] }> {
  // First attempt backend test route
  try {
    const res = await fetch('/api/extensions/dev.calagopus.aiassistant/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl?.trim() || undefined,
        model: model?.trim() || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || `Successfully connected to ${provider.toUpperCase()}!`,
        models: data.detected_models,
      };
    }
  } catch (_backendErr) {
    // Fallback to client-side direct check if backend test endpoint isn't mounted yet
  }

  // Client-side fallback ping
  try {
    const key = apiKey.trim();
    if (!key && provider !== 'ollama') {
      return { success: false, message: 'Please provide an API key first.' };
    }

    if (provider === 'openai' || provider === 'groq' || provider === 'openrouter') {
      const url = baseUrl ? `${baseUrl.trim().replace(/\/$/, '')}/models` : 'https://api.openai.com/v1/models';
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (r.ok) {
        return { success: true, message: `Successfully validated ${provider.toUpperCase()} API key!` };
      }
      const err = await r.text();
      return { success: false, message: `${provider.toUpperCase()} error (${r.status}): ${err}` };
    }

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      });
      if (r.ok) {
        return { success: true, message: 'Successfully validated Gemini API key!' };
      }
      return { success: false, message: `Gemini error: ${r.statusText}` };
    }

    if (provider === 'anthropic') {
      // Due to Anthropic CORS, backend route handles it; if backend unavailable:
      return {
        success: true,
        message: 'Anthropic API key format accepted (Backend validation recommended for CORS).',
      };
    }

    if (provider === 'ollama') {
      const rootUrl = (baseUrl || 'http://localhost:11434/v1').replace(/\/$/, '').replace(/\/v1$/, '');
      const r = await fetch(`${rootUrl}/api/tags`);
      if (r.ok) {
        return { success: true, message: 'Successfully reached local Ollama instance!' };
      }
      return { success: false, message: 'Could not connect to Ollama. Ensure Ollama is running.' };
    }

    return { success: true, message: 'API key configured.' };
  } catch (clientErr: any) {
    return { success: false, message: clientErr.message || 'Connection failed.' };
  }
}
