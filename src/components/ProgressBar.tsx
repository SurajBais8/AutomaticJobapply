import React, { useState } from 'react';
import { AutomationProgress } from '../types';
import { Loader2, Globe, AlertTriangle, PlayCircle, SkipForward, KeyRound, Lock } from 'lucide-react';
import { submitOtp, resumeAutomation, skipCurrentWebsite } from '../services/api';

interface Props {
  progress: AutomationProgress;
}

export const ProgressBar: React.FC<Props> = ({ progress }) => {
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = progress.jobsFound || 1;
  const percentage = Math.min(100, Math.round((progress.jobsProcessed / total) * 100));

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setIsSubmitting(true);
    try {
      await submitOtp(otpInput.trim());
      setOtpInput('');
    } catch (err) {
      console.error('Failed to submit OTP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    setIsSubmitting(true);
    try {
      await resumeAutomation();
    } catch (err) {
      console.error('Failed to resume automation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await skipCurrentWebsite();
    } catch (err) {
      console.error('Failed to skip website:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
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
            {progress.isRunning && !progress.isPaused && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
            )}
            {progress.currentStep}
          </span>
          <span className="font-bold text-slate-900">{percentage}% Total Progress</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progress.isPaused
                ? 'bg-amber-500'
                : progress.isRunning
                ? 'bg-blue-600'
                : 'bg-slate-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Paused Action Banner for OTP / CAPTCHA / Verification */}
      {progress.isPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-amber-900 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>User Action Required for {progress.pausedWebsite || progress.currentWebsite}</span>
            </span>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded text-amber-800 font-medium cursor-pointer"
            >
              <SkipForward className="w-3 h-3" /> Skip Website
            </button>
          </div>

          {progress.requiresLogin && (
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-amber-200">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Credentials or session missing. Please add details in Credentials Manager tab.
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Continue
                </button>
              </div>
            </div>
          )}

          {progress.requiresOtp && (
            <form onSubmit={handleOtpSubmit} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter OTP verification code..."
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-amber-300 rounded bg-white text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !otpInput.trim()}
                className="px-3 py-1.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                Submit OTP
              </button>
            </form>
          )}

          {progress.requiresCaptcha && (
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-amber-200">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Complete CAPTCHA or security prompt in the Playwright window below
              </span>
              <button
                type="button"
                onClick={handleResume}
                disabled={isSubmitting}
                className="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Continue Automation
              </button>
            </div>
          )}

          {!progress.requiresOtp && !progress.requiresCaptcha && (
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-amber-200">
              <span className="text-slate-700 font-medium">
                Automation paused for human review or authentication check.
              </span>
              <button
                type="button"
                onClick={handleResume}
                disabled={isSubmitting}
                className="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Resume Search & Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
