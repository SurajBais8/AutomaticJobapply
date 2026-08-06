import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  ResumeFile,
  WebsiteConfig,
  Job,
  ApplicationLog,
  AutomationProgress
} from './types';
import {
  fetchResumes,
  fetchProfile,
  saveProfile,
  fetchWebsites,
  startAutomation,
  stopAutomation,
  fetchAutomationStatus,
  fetchJobs,
  clearJobs,
  fetchLogs,
  clearLogs,
  submitOtp
} from './services/api';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { CredentialsManager } from './components/CredentialsManager';
import { AutomationSettingsModal } from './components/AutomationSettingsModal';
import { Bot, RefreshCw, KeyRound, LayoutDashboard, Sliders, ShieldAlert, Key, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'credentials'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    jobRole: 'Java Full Stack Developer',
    experience: '5 Months',
    skills: 'Java, Spring Boot, React, SQL',
    location: 'Pune',
    workMode: 'Remote',
    keywords: 'Java, Spring, React, SQL',
    applicantName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210'
  });

  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [websites, setWebsites] = useState<WebsiteConfig[]>([]);
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appLogs, setAppLogs] = useState<ApplicationLog[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  const [automationProgress, setAutomationProgress] = useState<AutomationProgress>({
    isRunning: false,
    isPaused: false,
    currentWebsite: 'Idle',
    currentStep: 'Ready to launch job search & apply pipeline',
    jobsFound: 0,
    jobsProcessed: 0,
    successfulApps: 0,
    failedAttempts: 0,
    reviewRequiredCount: 0,
    logs: []
  });

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [resList, prof, sites, jobList, logsRes] = await Promise.all([
        fetchResumes().catch(() => []),
        fetchProfile().catch(() => null),
        fetchWebsites().catch(() => []),
        fetchJobs().catch(() => []),
        fetchLogs().catch(() => ({ applicationLogs: [], systemLogs: [] }))
      ]);

      setResumes(resList);
      if (prof) setProfile(prof);
      setWebsites(sites);
      setSelectedWebsiteIds(sites.map(s => s.id));
      setJobs(jobList);
      setAppLogs(logsRes.applicationLogs || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll automation status & jobs
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [status, updatedJobs, logsRes] = await Promise.all([
          fetchAutomationStatus(),
          fetchJobs(),
          fetchLogs()
        ]);

        if (status) setAutomationProgress(status);
        if (updatedJobs) setJobs(updatedJobs);
        if (logsRes?.applicationLogs) setAppLogs(logsRes.applicationLogs);
      } catch (err) {
        // Silent catch for dev server polling
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const handleSaveProfile = async () => {
    try {
      await saveProfile(profile);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleUploadSuccess = (newResume: ResumeFile) => {
    setResumes(prev => [newResume, ...prev]);
  };

  const handleStartAutomation = async (searchOnly: boolean) => {
    try {
      await saveProfile(profile);
      await startAutomation(selectedWebsiteIds, searchOnly);
    } catch (err: any) {
      alert(`Failed to start: ${err.message}`);
    }
  };

  const handleStopAutomation = async () => {
    try {
      await stopAutomation();
    } catch (err: any) {
      console.error('Failed to stop automation:', err);
    }
  };

  const handleSubmitOtp = async () => {
    if (!otpInput) return;
    setIsSubmittingOtp(true);
    try {
      await submitOtp(otpInput);
      setOtpInput('');
    } catch (err: any) {
      alert(`OTP submit failed: ${err.message}`);
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogs();
      setAutomationProgress(prev => ({ ...prev, logs: [] }));
      setAppLogs([]);
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const handleClearJobs = async () => {
    try {
      await clearJobs();
      setJobs([]);
    } catch (err) {
      console.error('Error clearing jobs:', err);
    }
  };

  const handleExportReport = () => {
    window.open('/api/reports/export', '_blank');
  };

  const activeResume = resumes.find(r => r.isActive) || (resumes.length > 0 ? resumes[0] : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-2 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="text-blue-600">AI Job Apply Assistant</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                    v2.0 (Auth & Session Engine)
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  Automated job applications, encrypted session manager & multi-portal scraper
                </p>
              </div>
            </div>

            {/* Main Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 ml-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard & Applications
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'credentials'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Credentials Manager
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={loadInitialData}
              title="Refresh Data"
              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-1 font-bold text-center ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 py-1 font-bold text-center ${activeTab === 'credentials' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
          >
            Credentials Manager
          </button>
        </div>
      </header>

      {/* OTP / CAPTCHA Banner Prompt when paused */}
      {(automationProgress.requiresOtp || automationProgress.requiresCaptcha) && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 shadow-md border-b border-amber-600 flex items-center justify-between gap-4 sticky top-12 z-40">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 text-slate-950 animate-pulse" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide">
                Automation Paused: {automationProgress.requiresOtp ? 'OTP Verification Required' : 'Manual CAPTCHA Detected'} on {automationProgress.pausedWebsite || 'Website'}
              </p>
              <p className="text-[11px] font-medium opacity-90">
                Please enter the verification code sent to your email/phone or complete CAPTCHA in browser context to resume.
              </p>
            </div>
          </div>

          {automationProgress.requiresOtp && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                className="px-3 py-1.5 bg-white text-slate-900 font-mono text-xs font-bold rounded border border-amber-600 focus:outline-none w-36"
              />
              <button
                onClick={handleSubmitOtp}
                disabled={isSubmittingOtp || !otpInput}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Submit OTP & Resume
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-5 flex-1 flex flex-col">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5">
            {/* Left Panel: Inputs, Resume, Website Selection & Controls */}
            <LeftPanel
              profile={profile}
              resumes={resumes}
              activeResume={activeResume}
              websites={websites}
              selectedWebsiteIds={selectedWebsiteIds}
              isRunning={automationProgress.isRunning}
              onProfileChange={setProfile}
              onSaveProfile={handleSaveProfile}
              onUploadSuccess={handleUploadSuccess}
              onWebsitesChange={setSelectedWebsiteIds}
              onStartAutomation={handleStartAutomation}
              onStopAutomation={handleStopAutomation}
            />

            {/* Right Panel: Metrics, Live View, Logs & Results */}
            <RightPanel
              progress={automationProgress}
              jobs={jobs}
              appLogs={appLogs}
              onClearLogs={handleClearLogs}
              onClearJobs={handleClearJobs}
              onExportReport={handleExportReport}
            />
          </div>
        ) : (
          <CredentialsManager websites={websites} />
        )}
      </main>

      {/* Automation Settings Modal */}
      <AutomationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-2.5 px-4 text-center text-xs text-slate-500 font-medium">
        AI Job Apply Assistant • High Density Engine • Playwright Session Storage & SQLite Encrypted Credentials
      </footer>
    </div>
  );
}
