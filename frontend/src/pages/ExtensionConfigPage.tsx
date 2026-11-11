import { useState, useEffect } from 'react';
import { AssistantSettings } from '../types/index.ts';
import { loadSettings, saveSettings } from '../services/settingsService.ts';
import { SettingsModal } from '../components/SettingsModal.tsx';

export default function ExtensionConfigPage() {
  const [settings, setSettings] = useState<AssistantSettings>(loadSettings());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    // Attempt to fetch saved settings from backend
    fetch('/api/extensions/dev.calagopus.aiassistant/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSettings((prev) => ({
            ...prev,
            activeProvider: data.active_provider || prev.activeProvider,
            activeModel: data.active_model || prev.activeModel,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = (newSettings: AssistantSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const configuredProvidersCount = [
    Boolean(settings.openai.apiKey),
    Boolean(settings.anthropic.apiKey),
    Boolean(settings.gemini.apiKey),
    Boolean(settings.groq.apiKey),
    Boolean(settings.openrouter.apiKey),
    settings.ollama.enabled,
  ].filter(Boolean).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h1 className="text-2xl font-bold text-sky-400">Calagopus AI Assistant</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Package: <code className="text-sky-300">dev.calagopus.aiassistant</code> | Version: 1.0.0
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ai-assistant"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow flex items-center gap-1.5"
          >
            <span>Open Assistant UI</span>
            <span>➤</span>
          </a>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            ⚙️ Edit Configuration
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
          <span>✓</span>
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Model
          </div>
          <div className="text-lg font-bold text-sky-300 mt-1 capitalize">
            {settings.activeProvider}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{settings.activeModel}</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Providers Hooked Up
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {configuredProvidersCount} of 6 Available
          </div>
          <div className="text-xs text-slate-400 mt-0.5">OpenAI, Claude, Gemini, Groq, OpenRouter, Ollama</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            File Protection
          </div>
          <div className="text-lg font-bold text-amber-400 mt-1">User Approval Mode</div>
          <div className="text-xs text-slate-400 mt-0.5">Read &amp; Write require interactive confirmation</div>
        </div>
      </div>

      {/* How it Works Overview */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-200">How the AI Assistant Works in Calagopus</h3>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
          <li>
            <strong>Per-Server Sidebar Tab:</strong> Every server gets an <em>AI Assistant</em> tab in its sidebar (<code className="text-sky-300">/server/:id/assistant</code>).
          </li>
          <li>
            <strong>Interactive File Permissions:</strong> When you ask the assistant to inspect logs or modify configs, it generates a structured tool request. An approval card with diff preview appears in chat for you to <strong>Approve</strong> or <strong>Deny</strong> before any file is touched.
          </li>
          <li>
            <strong>Multi-Provider API Keys:</strong> Admins can configure keys panel-wide, or users can set their personal keys in the in-chat Settings modal.
          </li>
        </ul>
      </div>

      {/* Configuration Modal */}
      <SettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settings={settings}
        onSave={handleSave}
      />
    </div>
  );
}
