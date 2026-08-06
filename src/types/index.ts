export type WorkMode = 'Remote' | 'Hybrid' | 'Onsite' | 'Any';

export type ApplicationStatus = 
  | 'New' 
  | 'Queued' 
  | 'Processing' 
  | 'Applied' 
  | 'Verification Required' 
  | 'Failed' 
  | 'Skipped';

export interface ResumeFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  uploadDate: string;
  size: number;
  parsedText?: string;
  parsedSkills?: string[];
  parsedEmail?: string;
  parsedPhone?: string;
}

export interface UserProfile {
  jobRole: string;
  experience: string;
  skills: string;
  location: string;
  workMode: WorkMode;
  keywords: string;
  applicantName?: string;
  email?: string;
  phone?: string;
  currentNoticePeriod?: string;
  expectedCtc?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface WebsiteConfig {
  id: string;
  name: string;
  domain: string;
  icon?: string;
  supportedFeatures: {
    search: boolean;
    autoFill: boolean;
    resumeUpload: boolean;
    directApply: boolean;
    loginSession: boolean;
  };
  requiresAuth: boolean;
  enabled: boolean;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  applyLink: string;
  sourceWebsite: string;
  salary?: string;
  datePosted?: string;
  matchScore: number;
  matchReason?: string;
  status: ApplicationStatus;
  applicationNotes?: string;
  appliedAt?: string;
  screenshotUrl?: string;
}

export interface ApplicationLog {
  id: string;
  jobId?: string;
  company: string;
  role: string;
  sourceWebsite: string;
  timestamp: string;
  status: ApplicationStatus;
  details: string;
  screenshotUrl?: string;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'step';
  website?: string;
  message: string;
  details?: string;
  screenshotUrl?: string;
}

export interface AutomationProgress {
  isRunning: boolean;
  isPaused: boolean;
  currentWebsite: string;
  currentStep: string;
  currentJob?: Job;
  jobsFound: number;
  jobsProcessed: number;
  successfulApps: number;
  failedAttempts: number;
  reviewRequiredCount: number;
  startTime?: string;
  logs: LogEntry[];
  latestScreenshot?: string;
}

export interface FilterOptions {
  search: string;
  status: string;
  website: string;
}
