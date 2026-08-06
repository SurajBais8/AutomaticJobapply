import React, { useState } from 'react';
import { AutomationProgress, Job, ApplicationLog } from '../types';
import { ProgressBar } from './ProgressBar';
import { LiveLog } from './LiveLog';
import { BrowserLiveView } from './BrowserLiveView';
import { ResultsTable } from './ResultsTable';
import { Search, CheckCircle2, AlertTriangle, XCircle, Eye, EyeOff } from 'lucide-react';

interface Props {
  progress: AutomationProgress;
  jobs: Job[];
  appLogs: ApplicationLog[];
  onClearLogs: () => void;
  onClearJobs: () => void;
  onExportReport: () => void;
}

export const RightPanel: React.FC<Props> = ({
  progress,
  jobs,
  appLogs,
  onClearLogs,
  onClearJobs,
  onExportReport
}) => {
  const [showBrowserView, setShowBrowserView] = useState(true);
  const [activeModalSnapshot, setActiveModalSnapshot] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Jobs Found */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded bg-blue-50 text-blue-600">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jobs Scanned</p>
            <p className="text-xl font-extrabold text-slate-900">{progress.jobsFound}</p>
          </div>
        </div>

        {/* Processed */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded bg-slate-100 text-slate-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Processed</p>
            <p className="text-xl font-extrabold text-slate-900">{progress.jobsProcessed}</p>
          </div>
        </div>

        {/* Successful Applications */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Successful</p>
            <p className="text-xl font-extrabold text-emerald-600">{progress.successfulApps}</p>
          </div>
        </div>

        {/* Failed / Review Required */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Failed / Blocked</p>
            <p className="text-xl font-extrabold text-rose-600">
              {progress.reviewRequiredCount + progress.failedAttempts}
            </p>
          </div>
        </div>
      </div>

      {/* Live Status Progress Bar */}
      <ProgressBar progress={progress} />

      {/* Toggle Browser Live Snapshot View */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Playwright Live Inspection
        </h3>
        <button
          type="button"
          onClick={() => setShowBrowserView(!showBrowserView)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
        >
          {showBrowserView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showBrowserView ? 'Hide Live View' : 'Show Live View'}
        </button>
      </div>

      {showBrowserView && (
        <BrowserLiveView
          latestScreenshot={progress.latestScreenshot}
          currentWebsite={progress.currentWebsite}
        />
      )}

      {/* Terminal Live Logs */}
      <LiveLog
        logs={progress.logs}
        onClearLogs={onClearLogs}
        onViewScreenshot={url => setActiveModalSnapshot(url)}
      />

      {/* Results Table */}
      <ResultsTable
        jobs={jobs}
        appLogs={appLogs}
        onExportReport={onExportReport}
        onClearJobs={onClearJobs}
        onViewScreenshot={url => setActiveModalSnapshot(url)}
      />

      {/* Modal for viewing active Playwright screenshot */}
      {activeModalSnapshot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <BrowserLiveView
              latestScreenshot={activeModalSnapshot}
              currentWebsite="Inspection View"
              isModal={true}
              onCloseModal={() => setActiveModalSnapshot(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
