import { useState } from 'react';
import { ToolCallRequest, ToolCallResult } from '../types/index.ts';
import { FileDiffViewer } from './FileDiffViewer.tsx';

interface ToolApprovalCardProps {
  toolCall: ToolCallRequest;
  toolResult?: ToolCallResult;
  onApprove: (toolCall: ToolCallRequest) => void;
  onReject: (toolCall: ToolCallRequest) => void;
}

export function ToolApprovalCard({
  toolCall,
  toolResult,
  onApprove,
  onReject,
}: ToolApprovalCardProps) {
  const [showOutput, setShowOutput] = useState<boolean>(false);
  const { name, arguments: args, status } = toolCall;

  const isPending = status === 'pending_approval';
  const isExecuting = status === 'executing';
  const isCompleted = status === 'completed';
  const isRejected = status === 'rejected';
  const isFailed = status === 'failed';

  const getActionBadge = () => {
    switch (name) {
      case 'read_file':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
            📄 Read File
          </span>
        );
      case 'write_file':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            ✏️ Write File
          </span>
        );
      case 'list_files':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            📂 List Files
          </span>
        );
    }
  };

  const getStatusBadge = () => {
    if (isPending) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          ⏳ Awaiting Your Approval
        </span>
      );
    }
    if (isExecuting) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
          🔄 Executing...
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          ✓ Approved &amp; Executed
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          ✕ Denied by User
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          ⚠️ Execution Failed
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={`my-3 p-3.5 rounded-xl border transition-all duration-200 ${
        isPending
          ? 'bg-slate-900/95 border-amber-500/50 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
          : isCompleted
            ? 'bg-slate-900/70 border-emerald-500/40 shadow-sm'
            : isRejected
              ? 'bg-slate-900/50 border-rose-500/40 opacity-80'
              : 'bg-slate-900/70 border-slate-700/60'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {getActionBadge()}
          <code className="text-xs font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {args.path || args.directory || '/'}
          </code>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Explanation / Reason */}
      {args.reason && (
        <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
          <strong className="text-slate-400 font-medium">Reason: </strong>
          {args.reason}
        </p>
      )}

      {/* If Write Request: Show Diff / Proposed Content Preview */}
      {name === 'write_file' && args.content !== undefined && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Proposed File Content:
          </div>
          <FileDiffViewer
            filePath={args.path || 'file'}
            newContent={args.content}
          />
        </div>
      )}

      {/* Action Buttons for Pending Approval */}
      {isPending && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onApprove(toolCall)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>✓</span>
            <span>
              {name === 'write_file' ? 'Approve & Save Changes' : 'Approve File Read'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onReject(toolCall)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-300 border border-slate-700 hover:border-rose-500/50 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>✕</span>
            <span>Deny Request</span>
          </button>
          <span className="text-[11px] text-slate-500 ml-auto italic">
            Your server files are protected until approved.
          </span>
        </div>
      )}

      {/* Completed Output accordion */}
      {toolResult && (
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowOutput(!showOutput)}
            className="text-[11px] text-slate-400 hover:text-sky-400 flex items-center gap-1 transition cursor-pointer font-mono"
          >
            <span>{showOutput ? '▼' : '▶'}</span>
            <span>
              {showOutput ? 'Hide Result Output' : 'View Result Output'} (
              {toolResult.output.length} characters)
            </span>
          </button>

          {showOutput && (
            <pre className="mt-2 p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 max-h-48 overflow-auto whitespace-pre-wrap break-all">
              {toolResult.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
