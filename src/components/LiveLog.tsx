import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Trash2, Search, Filter, Image as ImageIcon, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface Props {
  logs: LogEntry[];
  onClearLogs: () => void;
  onViewScreenshot?: (url: string) => void;
}

export const LiveLog: React.FC<Props> = ({ logs, onClearLogs, onViewScreenshot }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(term) ||
        (log.website && log.website.toLowerCase().includes(term)) ||
        (log.details && log.details.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getBadgeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'step':
        return <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col h-72">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Terminal Console</h3>
          <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono font-semibold">
            {logs.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search console..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 pl-6 text-[11px] text-slate-800 focus:outline-none focus:border-blue-600 w-28"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Logs</option>
            <option value="success">Success ✔</option>
            <option value="warning">Warnings ⚠</option>
            <option value="error">Errors ✖</option>
            <option value="step">Pipeline Steps</option>
          </select>

          <button
            onClick={onClearLogs}
            title="Clear Log History"
            className="p-1 rounded text-slate-500 hover:text-rose-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Terminal View Body (Dark Slate for High Density Console) */}
      <div
        ref={logContainerRef}
        className="flex-1 bg-[#0f172a] rounded-lg p-3 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Console ready. Click START AUTO-APPLY to launch scraper & apply agent.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="flex items-start gap-2 group hover:bg-slate-800/50 p-1 rounded">
              <span className="text-slate-500 shrink-0 select-none text-[10px] pt-0.5">[{log.timestamp}]</span>
              {getBadgeIcon(log.type)}

              {log.website && (
                <span className="bg-slate-800 text-sky-400 border border-slate-700 px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold shrink-0">
                  {log.website}
                </span>
              )}

              <span
                className={`flex-1 break-words ${
                  log.type === 'success'
                    ? 'text-emerald-400 font-semibold'
                    : log.type === 'warning'
                    ? 'text-amber-300'
                    : log.type === 'error'
                    ? 'text-rose-400 font-bold'
                    : log.type === 'step'
                    ? 'text-sky-300 font-semibold'
                    : 'text-slate-300'
                }`}
              >
                {log.message}
              </span>

              {log.screenshotUrl && onViewScreenshot && (
                <button
                  type="button"
                  onClick={() => onViewScreenshot(log.screenshotUrl!)}
                  className="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-700/60 px-1.5 py-0.5 rounded font-sans shrink-0 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  Snapshot
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
