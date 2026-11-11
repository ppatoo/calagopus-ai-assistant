import { useState } from 'react';
import { ChatMessage as ChatMessageType, ToolCallRequest } from '../types/index.ts';
import { ToolApprovalCard } from './ToolApprovalCard.tsx';

interface ChatMessageProps {
  message: ChatMessageType;
  onApproveTool: (toolCall: ToolCallRequest) => void;
  onRejectTool: (toolCall: ToolCallRequest) => void;
}

export function ChatMessage({ message, onApproveTool, onRejectTool }: ChatMessageProps) {
  const { role, content, timestamp, toolCall, toolResult, isError } = message;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple and safe markdown formatter for code blocks, inline code, bold, lists
  const renderFormattedContent = (rawText: string) => {
    if (!rawText) return null;

    const parts = rawText.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const language = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
        const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

        return (
          <div key={pIdx} className="my-2 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="text-[11px] font-semibold uppercase">{language || 'code'}</span>
              <button
                type="button"
                onClick={() => copyCode(code, pIdx)}
                className="text-[11px] hover:text-slate-200 transition cursor-pointer"
              >
                {copiedIndex === pIdx ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed">{code}</pre>
          </div>
        );
      }

      // Inline rendering for paragraphs, bold, lists
      const lines = part.split('\n');
      return (
        <div key={pIdx} className="space-y-1.5">
          {lines.map((line, lIdx) => {
            if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

            // Replace **bold** with <strong> and `code` with <code>
            const renderedLine = line
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[11px]">$1</code>');

            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');

            return (
              <p
                key={lIdx}
                className={isBullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-1 before:text-sky-400' : ''}
                dangerouslySetInnerHTML={{ __html: isBullet ? renderedLine.replace(/^[-*]\s+/, '') : renderedLine }}
              />
            );
          })}
        </div>
      );
    });
  };

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex flex-col my-3.5 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-medium">
        <span>{isUser ? 'You' : 'Calagopus Assistant'}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-500">{formattedTime}</span>
      </div>

      <div
        className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed shadow-sm transition-all ${
          isUser
            ? 'bg-sky-600/90 text-white rounded-tr-sm border border-sky-500/40 shadow-sky-900/10'
            : isError
              ? 'bg-rose-950/70 text-rose-200 border border-rose-500/50 rounded-tl-sm'
              : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-black/20'
        }`}
      >
        {content && <div className="space-y-2">{renderFormattedContent(content)}</div>}

        {/* Embedded Interactive Tool Approval Card */}
        {toolCall && (
          <ToolApprovalCard
            toolCall={toolCall}
            toolResult={toolResult}
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        )}
      </div>
    </div>
  );
}
