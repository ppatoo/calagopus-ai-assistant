import { faRobot, faBrain } from '@fortawesome/free-solid-svg-icons';
import { Extension, ExtensionContext } from 'shared';
import ServerAiAssistantPage from './pages/ServerAiAssistantPage.tsx';
import AdminAiAssistantPage from './pages/AdminAiAssistantPage.tsx';
import ExtensionConfigPage from './pages/ExtensionConfigPage.tsx';
import './app.css';

function ExtensionSummaryCard() {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <span className="text-base">🤖</span>
        <div>
          <span className="font-semibold text-slate-100">AI Assistant</span>
          <p className="text-[11px] text-slate-400">Interactive file approvals &amp; multi-provider keys</p>
        </div>
      </div>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        Ready
      </span>
    </div>
  );
}

export class CalagopusAiAssistantExtension extends Extension {
  public packageName: string = 'dev.calagopus.aiassistant';
  public cardConfigurationPage = ExtensionConfigPage;
  public cardComponent = ExtensionSummaryCard;

  public initialize(ctx: ExtensionContext): void {
    ctx.extensionRegistry.enterRoutes((routes) => {
      // 1. Add AI Assistant tab to every server's sidebar (/server/:id/assistant)
      routes.addServerRoute({
        path: '/assistant',
        name: () => 'AI Assistant',
        icon: faRobot,
        element: ServerAiAssistantPage,
      });

      // 2. Add Global AI Assistant page to the Admin sidebar (/admin/ai-assistant)
      routes.addAdminRoute({
        path: '/ai-assistant',
        name: () => 'AI Assistant',
        icon: faBrain,
        element: AdminAiAssistantPage,
        permission: 'admin.settings',
      });
    });

    console.log('🤖 Calagopus AI Assistant Extension initialized successfully.');
  }
}

export default new CalagopusAiAssistantExtension();
