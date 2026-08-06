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

const EXPERIENCE_OPTIONS = [
  { value: 'Fresher', description: '0 Years (No Experience)' },
  { value: '0–6 Months', description: 'Internship / Trainee' },
  { value: '6 Months–1 Year', description: 'Junior' },
  { value: '1–2 Years', description: 'Associate' },
  { value: '2–3 Years', description: 'Mid Level' },
  { value: '3–5 Years', description: 'Experienced' },
  { value: '5–8 Years', description: 'Senior' },
  { value: '8–12 Years', description: 'Lead' },
  { value: '12+ Years', description: 'Architect / Principal' },
];

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

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
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

        {/* Experience Selection Table */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Experience Selection
          </label>
          <div className="border border-slate-200 rounded overflow-hidden max-h-56 overflow-y-auto bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-1.5 px-2 text-center w-10">Select</th>
                  <th className="py-1.5 px-2 w-28">Experience</th>
                  <th className="py-1.5 px-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {EXPERIENCE_OPTIONS.map((opt) => {
                  const isSelected =
                    profile.experience === opt.value ||
                    (profile.experience === '5 Months' && opt.value === '0–6 Months') ||
                    (profile.experience === '5 Years' && opt.value === '3–5 Years');

                  return (
                    <tr
                      key={opt.value}
                      onClick={() => handleInputChange('experience', opt.value)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center align-middle">
                        <input
                          type="radio"
                          name="experience"
                          checked={isSelected}
                          onChange={() => handleInputChange('experience', opt.value)}
                          className="h-3.5 w-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="py-1.5 px-2 align-middle font-semibold whitespace-nowrap text-[11px]">
                        {opt.value}
                      </td>
                      <td className={`py-1.5 px-2 align-middle text-[11px] ${isSelected ? 'text-blue-800' : 'text-slate-500'}`}>
                        {opt.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
