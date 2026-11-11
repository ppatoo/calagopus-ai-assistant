import { useEffect, useState } from 'react';
import { AiAssistantChat } from '../components/AiAssistantChat.tsx';
import { ServerContext } from '../types/index.ts';

// Dynamic/safe import for Calagopus container & store
let ServerContentContainer: any = null;
let useServerStoreHook: any = null;

try {
  // @ts-ignore
  ServerContentContainer = require('@/elements/containers/ServerContentContainer.tsx').default;
} catch {
  // Fallback container
  ServerContentContainer = ({ children, title }: any) => (
    <div className="p-4 w-full">
      <h1 className="text-xl font-bold text-slate-100 mb-4">{title}</h1>
      {children}
    </div>
  );
}

try {
  // @ts-ignore
  useServerStoreHook = require('@/stores/server.ts').useServerStore;
} catch {
  useServerStoreHook = null;
}

export default function ServerAiAssistantPage() {
  const [serverContext, setServerContext] = useState<ServerContext | undefined>(undefined);

  // Attempt to read server from Calagopus server store
  let storeServer: any = null;
  if (useServerStoreHook) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      storeServer = useServerStoreHook((state: any) => state.server);
    } catch {
      storeServer = null;
    }
  }

  useEffect(() => {
    if (storeServer) {
      setServerContext({
        uuid: storeServer.uuid || storeServer.id || '',
        name: storeServer.name || 'Game Server',
        eggName: storeServer.egg?.name || storeServer.nest?.name || 'Server',
        nodeName: storeServer.node?.name || 'Node',
        status: storeServer.status || 'unknown',
        ip: storeServer.allocation?.ip || '127.0.0.1',
        port: storeServer.allocation?.port || 25565,
      });
    } else {
      // Extract from URL /server/:id/assistant
      const pathParts = window.location.pathname.split('/');
      const serverIdx = pathParts.indexOf('server');
      if (serverIdx !== -1 && pathParts[serverIdx + 1]) {
        const id = pathParts[serverIdx + 1];
        setServerContext({
          uuid: id,
          name: `Server (${id.slice(0, 8)})`,
        });
      }
    }
  }, [storeServer]);

  return (
    <ServerContentContainer title="AI Assistant">
      <AiAssistantChat serverContext={serverContext} />
    </ServerContentContainer>
  );
}
