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
  clearLogs
} from './services/api';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { Bot, Sparkles, RefreshCw, Layers } from 'lucide-react';

export default function App() {
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

  // Poll automation status & jobs when running or active
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [status, updatedJobs, logsRes] = await Promise.all([
          fetchAutomationStatus(),
          fetchJobs(),
          fetchLogs()
        ]);

        setAutomationProgress(status);
        setJobs(updatedJobs);
        setAppLogs(logsRes.applicationLogs || []);
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

  const activeResume = resumes.length > 0 ? resumes[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="text-blue-600">AI Job Apply Assistant</span>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                  v1.2.0 (Stable)
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block font-medium">
                High Density • Automated job applications & multi-portal scraper
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadInitialData}
              title="Refresh Data"
              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md font-medium text-slate-700">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>SQLite DB Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-5 flex-1 flex flex-col lg:flex-row gap-5">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-2.5 px-4 text-center text-xs text-slate-500 font-medium">
        AI Job Apply Assistant • High Density Engine • Powered by Playwright, Express & SQLite
      </footer>
    </div>
  );
}
