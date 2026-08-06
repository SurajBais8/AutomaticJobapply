import { ResumeFile, UserProfile, WebsiteConfig, Job, ApplicationLog, LogEntry, AutomationProgress, SiteCredential, AutomationSettings } from '../types/index';

export async function fetchResumes(): Promise<ResumeFile[]> {
  try {
    const res = await fetch('/api/resumes');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch resumes:', err);
    return [];
  }
}

export async function setActiveResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}/active`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to set active resume');
}

export async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete resume');
}

export async function uploadResume(file: File): Promise<{ success: boolean; resume: ResumeFile; parsedProfile?: Partial<UserProfile> }> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch('/api/resumes/upload', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Failed to upload resume');
  }
  return res.json();
}

export async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch profile:', err);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<{ success: boolean }> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

export async function fetchCredentials(): Promise<SiteCredential[]> {
  try {
    const res = await fetch('/api/credentials');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch credentials:', err);
    return [];
  }
}

export async function saveCredential(cred: {
  websiteId: string;
  websiteName: string;
  email: string;
  password?: string;
  rememberMe?: boolean;
}): Promise<{ success: boolean }> {
  const res = await fetch('/api/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cred)
  });
  if (!res.ok) throw new Error('Failed to save credential');
  return res.json();
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete credential');
}

export async function fetchSettings(): Promise<AutomationSettings | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch settings:', err);
    return null;
  }
}

export async function saveSettings(settings: AutomationSettings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to save settings');
}

export async function fetchWebsites(): Promise<WebsiteConfig[]> {
  try {
    const res = await fetch('/api/websites');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch website sources:', err);
    return [];
  }
}

export async function startAutomation(websiteIds: string[], searchOnly: boolean = false): Promise<void> {
  const res = await fetch('/api/automation/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ websiteIds, searchOnly })
  });
  if (!res.ok) throw new Error('Failed to start automation');
}

export async function stopAutomation(): Promise<void> {
  const res = await fetch('/api/automation/stop', {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to stop automation');
}

export async function submitOtp(otpCode: string): Promise<void> {
  const res = await fetch('/api/automation/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otpCode })
  });
  if (!res.ok) throw new Error('Failed to submit OTP');
}

export async function resumeAutomation(): Promise<void> {
  const res = await fetch('/api/automation/resume', {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to resume automation');
}

export async function skipCurrentWebsite(): Promise<void> {
  const res = await fetch('/api/automation/skip-website', {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to skip website');
}

export async function fetchAutomationStatus(): Promise<AutomationProgress | null> {
  try {
    const res = await fetch('/api/automation/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch status:', err);
    return null;
  }
}

export async function fetchJobs(): Promise<Job[]> {
  try {
    const res = await fetch('/api/jobs');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch jobs:', err);
    return [];
  }
}

export async function clearJobs(): Promise<void> {
  await fetch('/api/jobs', { method: 'DELETE' });
}

export async function fetchLogs(): Promise<{ applicationLogs: ApplicationLog[]; systemLogs: LogEntry[] }> {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return { applicationLogs: [], systemLogs: [] };
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch logs:', err);
    return { applicationLogs: [], systemLogs: [] };
  }
}

export async function clearLogs(): Promise<void> {
  await fetch('/api/logs', { method: 'DELETE' });
}
