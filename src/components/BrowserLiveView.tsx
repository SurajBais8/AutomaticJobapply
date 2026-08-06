import React from 'react';
import { Monitor, RefreshCw, ExternalLink, X } from 'lucide-react';

interface Props {
  latestScreenshot?: string;
  currentWebsite?: string;
  onCloseModal?: () => void;
  isModal?: boolean;
}

export const BrowserLiveView: React.FC<Props> = ({ latestScreenshot, currentWebsite, onCloseModal, isModal }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs ${isModal ? 'max-w-3xl w-full' : ''}`}>
      {/* Mock Browser Header Bar */}
      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-[11px] font-mono text-slate-700 font-semibold pl-2 border-l border-slate-300 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-blue-600" />
            Playwright Live View ({currentWebsite || 'Idle'})
          </span>
        </div>

        {isModal && onCloseModal && (
          <button onClick={onCloseModal} className="text-slate-500 hover:text-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Screenshot Frame */}
      <div className="relative bg-slate-900 min-h-[200px] max-h-[360px] flex items-center justify-center overflow-hidden">
        {latestScreenshot ? (
          <img
            src={latestScreenshot}
            alt="Playwright Automation Frame"
            className="w-full h-auto object-contain max-h-[360px]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Monitor className="w-8 h-8 text-slate-600 stroke-1" />
            <span>Playwright browser inspection frame will render real-time portal screenshots here during run.</span>
          </div>
        )}
      </div>
    </div>
  );
};
