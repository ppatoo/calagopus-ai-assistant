import { useState, useEffect } from 'react';
import { AiAssistantChat } from '../components/AiAssistantChat.tsx';
import { ServerContext } from '../types/index.ts';

let AdminContentContainer: any = null;
try {
  // @ts-ignore
  AdminContentContainer = require('@/elements/containers/AdminContentContainer.tsx').default;
} catch {
  AdminContentContainer = ({ children, title }: any) => (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold text-slate-100 mb-4">{title}</h1>
      {children}
    </div>
  );
}

export default function AdminAiAssistantPage() {
  const [servers, setServers] = useState<ServerContext[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerContext | undefined>(undefined);

  useEffect(() => {
    // Fetch available servers for admin to choose from
    fetch('/api/client')
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : data.data || [];
        const parsed: ServerContext[] = raw.map((s: any) => ({
          uuid: s.uuid || s.attributes?.uuid || '',
          name: s.name || s.attributes?.name || 'Server',
          eggName: s.egg?.name || s.attributes?.egg?.name,
          nodeName: s.node?.name || s.attributes?.node?.name,
          status: s.status || s.attributes?.status,
        }));
        setServers(parsed);
      })
      .catch(() => {});
  }, []);

  return (
    <AdminContentContainer title="Global AI Assistant">
      <div className="mb-4 flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        <span className="font-semibold text-slate-300">Context Target:</span>
        <select
          value={selectedServer?.uuid || ''}
          onChange={(e) => {
            const match = servers.find((s) => s.uuid === e.target.value);
            setSelectedServer(match);
          }}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 cursor-pointer"
        >
          <option value="">Global Assistant (No specific server)</option>
          {servers.map((s) => (
            <option key={s.uuid} value={s.uuid}>
              {s.name} ({s.uuid.slice(0, 8)})
            </option>
          ))}
        </select>
        {selectedServer && (
          <span className="text-emerald-400 font-mono">
            UUID: {selectedServer.uuid}
          </span>
        )}
      </div>

      <AiAssistantChat serverContext={selectedServer} />
    </AdminContentContainer>
  );
}
