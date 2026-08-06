import React from 'react';
import { UserProfile, ResumeFile, WebsiteConfig } from '../types';
import { ResumeUploader } from './ResumeUploader';
import { WebsiteSelector } from './WebsiteSelector';
import {
  Briefcase,
  MapPin,
  Clock,
  Code,
  Tag,
  Play,
  Square,
  Search,
  Save,
  Sliders,
  Check
} from 'lucide-react';

interface Props {
  profile: UserProfile;
  resumes: ResumeFile[];
  activeResume: ResumeFile | null;
  websites: WebsiteConfig[];
  selectedWebsiteIds: string[];
  isRunning: boolean;
  onProfileChange: (updated: UserProfile) => void;
  onSaveProfile: () => void;
  onUploadSuccess: (resume: ResumeFile) => void;
  onWebsitesChange: (ids: string[]) => void;
  onStartAutomation: (searchOnly: boolean) => void;
  onStopAutomation: () => void;
}

export const LeftPanel: React.FC<Props> = ({
  profile,
  resumes,
  activeResume,
  websites,
  selectedWebsiteIds,
  isRunning,
  onProfileChange,
  onSaveProfile,
  onUploadSuccess,
  onWebsitesChange,
  onStartAutomation,
  onStopAutomation
}) => {
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  const handleSave = () => {
    onSaveProfile();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
      {/* Resume Section */}
      <ResumeUploader
        resumes={resumes}
        activeResume={activeResume}
        onUploadSuccess={onUploadSuccess}
      />

      {/* Target User Inputs */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Job Parameters
          </h3>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            {savedSuccess ? <Check className="w-3 h-3 text-emerald-600" /> : <Save className="w-3 h-3" />}
            {savedSuccess ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Job Role */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            Job Role
          </label>
          <input
            type="text"
            value={profile.jobRole || ''}
            onChange={e => handleInputChange('jobRole', e.target.value)}
            placeholder="e.g. Senior React Developer"
            className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Experience & Location Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Experience
            </label>
            <input
              type="text"
              value={profile.experience || ''}
              onChange={e => handleInputChange('experience', e.target.value)}
              placeholder="e.g. 5 Years"
              className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Location
            </label>
            <input
              type="text"
              value={profile.location || ''}
              onChange={e => handleInputChange('location', e.target.value)}
              placeholder="e.g. Remote / London"
              className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Work Mode */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Work Mode</label>
          <div className="grid grid-cols-4 gap-1 text-xs">
            {(['Remote', 'Hybrid', 'Onsite', 'Any'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => handleInputChange('workMode', mode)}
                className={`py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                  profile.workMode === mode
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-slate-400" />
            Skills (comma separated)
          </label>
          <textarea
            rows={2}
            value={profile.skills || ''}
            onChange={e => handleInputChange('skills', e.target.value)}
            placeholder="React, TypeScript, Node.js, Python, Tailwind, Playwright"
            className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Keywords
          </label>
          <input
            type="text"
            value={profile.keywords || ''}
            onChange={e => handleInputChange('keywords', e.target.value)}
            placeholder="e.g. Fullstack, Frontend, Senior"
            className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Website Selection Grid */}
      <WebsiteSelector
        websites={websites}
        selectedIds={selectedWebsiteIds}
        onChange={onWebsitesChange}
        disabled={isRunning}
      />

      {/* Control Buttons */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
        {isRunning ? (
          <button
            type="button"
            onClick={onStopAutomation}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-700"
          >
            <Square className="w-4 h-4 fill-current" />
            STOP AGENT
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={selectedWebsiteIds.length === 0}
              onClick={() => onStartAutomation(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              START AUTO-APPLY
            </button>

            <button
              type="button"
              disabled={selectedWebsiteIds.length === 0}
              onClick={() => onStartAutomation(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold py-1.5 rounded text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              SEARCH ONLY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
