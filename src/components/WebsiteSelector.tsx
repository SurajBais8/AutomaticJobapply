import React from 'react';
import { WebsiteConfig } from '../types';
import { Globe, CheckSquare, Square, ShieldCheck } from 'lucide-react';

interface Props {
  websites: WebsiteConfig[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const WebsiteSelector: React.FC<Props> = ({ websites, selectedIds, onChange, disabled }) => {
  const toggleSelect = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(websites.map(w => w.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          Job Sources ({selectedIds.length}/{websites.length})
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50 font-semibold cursor-pointer"
          >
            All
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50 font-medium cursor-pointer"
          >
            None
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {websites.map(site => {
          const isSelected = selectedIds.includes(site.id);
          return (
            <div
              key={site.id}
              onClick={() => toggleSelect(site.id)}
              className={`p-2 rounded border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 font-semibold shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 truncate">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{site.name}</span>
              </div>

              {site.requiresAuth && (
                <span
                  title="Detects session / requires login"
                  className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded"
                >
                  Auth
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Modular connectors detect anti-bot/login & stop gracefully.</span>
      </div>
    </div>
  );
};
