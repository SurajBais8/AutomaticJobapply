import React from 'react';
import { AutomationProgress } from '../types';
import { Loader2, CheckCircle2, Globe, AlertTriangle, PlayCircle } from 'lucide-react';

interface Props {
  progress: AutomationProgress;
}

export const ProgressBar: React.FC<Props> = ({ progress }) => {
  const total = progress.jobsFound || 1;
  const percentage = Math.min(100, Math.round((progress.jobsProcessed / total) * 100));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.isRunning ? (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {progress.isRunning ? 'Current Task Status' : 'System Idle'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded text-slate-700 font-semibold">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{progress.currentWebsite || 'None'}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-700 font-semibold">
          <span className="truncate max-w-md flex items-center gap-1.5 text-slate-900 font-medium">
            {progress.isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />}
            {progress.currentStep}
          </span>
          <span className="font-bold text-slate-900">{percentage}% Total Progress</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progress.isRunning
                ? 'bg-blue-600'
                : 'bg-slate-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
