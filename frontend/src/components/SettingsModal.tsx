import { useState } from 'react';
import { AssistantSettings, AiProvider } from '../types/index.ts';
import { PROVIDER_MODELS, testConnection } from '../services/settingsService.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onSave: (newSettings: AssistantSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AssistantSettings>(settings);
  const [selectedTab, setSelectedTab] = useState<AiProvider>(settings.activeProvider);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleKeyChange = (provider: AiProvider, key: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: key,
      },
    }));
  };

  const handleBaseUrlChange = (provider: AiProvider, url: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        baseUrl: url,
      },
    }));
  };

  const handleModelChange = (provider: AiProvider, model: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        model,
      },
      ...(prev.activeProvider === provider ? { activeModel: model } : {}),
    }));
  };

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);

    const cfg = localSettings[selectedTab];
    const res = await testConnection(selectedTab, cfg.apiKey, cfg.baseUrl, cfg.model);

    setTestResult(res);
    setTesting(false);
  };

  const handleSaveAndClose = () => {
    onSave(localSettings);
    onClose();
  };

  const activeConfig = localSettings[selectedTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="text-base font-bold text-slate-100">AI Assistant Configuration</h3>
              <p className="text-xs text-slate-400">
                Hook up your API keys, select default models, and configure file safety settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Provider Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Primary Active Provider
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['openai', 'anthropic', 'gemini', 'groq', 'openrouter', 'ollama'] as AiProvider[]).map((p) => {
                const isActive = localSettings.activeProvider === p;
                const hasKey = Boolean(localSettings[p]?.apiKey) || p === 'ollama';

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        activeProvider: p,
                        activeModel: prev[p].model,
                      }));
                      setSelectedTab(p);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col items-center gap-1 relative ${
                      isActive
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {hasKey && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    <span className="capitalize font-semibold">{p}</span>
                    <span className="text-[10px] text-slate-500">
                      {p === 'ollama' ? 'Local' : 'Cloud'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Specific Configuration Card */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-sky-400 capitalize">
                {selectedTab} Settings
              </span>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testing}
                className="px-3 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                {testing ? '🔄 Testing...' : '⚡ Test Connection'}
              </button>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  testResult.success
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* API Key Input */}
            {selectedTab !== 'ollama' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKeys[selectedTab] ? 'text' : 'password'}
                    value={activeConfig.apiKey}
                    onChange={(e) => handleKeyChange(selectedTab, e.target.value)}
                    placeholder={`Enter your ${selectedTab.toUpperCase()} API key...`}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(selectedTab)}
                    className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    {showKeys[selectedTab] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {/* Base URL (for Ollama, OpenRouter, or Custom Proxies) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                API Base URL {selectedTab === 'ollama' && '(Default: http://localhost:11434/v1)'}
              </label>
              <input
                type="text"
                value={activeConfig.baseUrl || ''}
                onChange={(e) => handleBaseUrlChange(selectedTab, e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 transition"
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Model
              </label>
              <div className="flex gap-2">
                <select
                  value={activeConfig.model}
                  onChange={(e) => handleModelChange(selectedTab, e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-sky-500 transition cursor-pointer flex-1"
                >
                  {(PROVIDER_MODELS[selectedTab] || []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={activeConfig.model}
                  onChange={(e) => handleModelChange(selectedTab, e.target.value)}
                  placeholder="Or custom model name..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Safety & Approval Preferences */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🛡️ File Access &amp; Safety Controls
            </span>

            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Ask Before Reading Files
                </div>
                <div className="text-[11px] text-slate-400">
                  Presents an interactive approval card in chat before the AI reads any server file.
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.requireApprovalForReads}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    requireApprovalForReads: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-800/80">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Ask Before Writing Files (Strictly Enforced)
                </div>
                <div className="text-[11px] text-slate-400">
                  Always displays a diff preview and requires explicit user confirmation before overwriting or modifying any server file.
                </div>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          {/* System Prompt Customization */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              System Instruction
            </label>
            <textarea
              rows={4}
              value={localSettings.defaultSystemPrompt}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultSystemPrompt: e.target.value,
                }))
              }
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-hidden focus:border-sky-500 transition font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-md transition cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
