import { useState } from 'react';
import { computeDiff } from '../services/fileService.ts';

interface FileDiffViewerProps {
  filePath: string;
  originalContent?: string;
  newContent: string;
}

export function FileDiffViewer({ filePath, originalContent = '', newContent }: FileDiffViewerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const diff = computeDiff(originalContent, newContent);

  return (
    <div className="my-2 border border-slate-700/80 rounded-lg overflow-hidden bg-slate-950/90 text-xs font-mono shadow-inner">
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 cursor-pointer select-none hover:bg-slate-800/80 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
          <span className="font-semibold text-sky-300">{filePath}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {diff.addedCount > 0 && (
            <span className="text-emerald-400 font-medium">+{diff.addedCount} lines</span>
          )}
          {diff.removedCount > 0 && (
            <span className="text-rose-400 font-medium">-{diff.removedCount} lines</span>
          )}
          <span className="text-slate-500">
            {isExpanded ? 'Click to collapse' : 'Click to inspect preview'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto p-2 divide-y divide-slate-800/40 text-[11px] leading-relaxed">
          {diff.lines.map((line, idx) => {
            let bgClass = 'bg-transparent text-slate-300';
            let prefix = '  ';
            if (line.type === 'added') {
              bgClass = 'bg-emerald-950/40 text-emerald-300 font-medium';
              prefix = '+ ';
            } else if (line.type === 'removed') {
              bgClass = 'bg-rose-950/40 text-rose-300 line-through opacity-80';
              prefix = '- ';
            }

            return (
              <div key={idx} className={`flex items-start px-2 py-0.5 rounded ${bgClass}`}>
                <span className="w-8 text-right pr-2 text-slate-600 select-none">
                  {line.lineNumber || ''}
                </span>
                <span className="select-none font-bold mr-1.5 opacity-70">{prefix}</span>
                <span className="whitespace-pre-wrap break-all flex-1">{line.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
