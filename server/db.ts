import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Job, ApplicationLog, LogEntry, UserProfile, ResumeFile, SiteCredential, AutomationSettings } from '../src/types/index.js';

const DB_DIR = path.join(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'jobs.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      originalName TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      uploadDate TEXT NOT NULL,
      size INTEGER NOT NULL,
      parsedText TEXT,
      parsedSkills TEXT,
      parsedEmail TEXT,
      parsedPhone TEXT,
      isActive INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_credentials (
      id TEXT PRIMARY KEY,
      websiteName TEXT NOT NULL,
      email TEXT NOT NULL,
      encryptedPassword TEXT NOT NULL,
      rememberMe INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Not Logged In',
      lastLoginTime TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS automation_settings (
      id TEXT PRIMARY KEY,
      browserType TEXT DEFAULT 'chrome',
      headless INTEGER DEFAULT 1,
      maxJobs INTEGER DEFAULT 25,
      delayBetweenJobs INTEGER DEFAULT 3,
      randomDelay INTEGER DEFAULT 1,
      timeout INTEGER DEFAULT 30000,
      retryCount INTEGER DEFAULT 3,
      autoStop INTEGER DEFAULT 1,
      desktopNotification INTEGER DEFAULT 1,
      soundNotification INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      jobRole TEXT,
      experience TEXT,
      skills TEXT,
      location TEXT,
      workMode TEXT,
      keywords TEXT,
      applicantName TEXT,
      email TEXT,
      phone TEXT,
      currentNoticePeriod TEXT,
      expectedCtc TEXT,
      portfolioUrl TEXT,
      linkedinUrl TEXT,
      githubUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT NOT NULL,
      experience TEXT,
      applyLink TEXT NOT NULL,
      sourceWebsite TEXT NOT NULL,
      salary TEXT,
      datePosted TEXT,
      matchScore INTEGER DEFAULT 80,
      matchReason TEXT,
      status TEXT DEFAULT 'New',
      applicationNotes TEXT,
      appliedAt TEXT,
      screenshotUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS application_logs (
      id TEXT PRIMARY KEY,
      jobId TEXT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      sourceWebsite TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      screenshotUrl TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      website TEXT,
      message TEXT NOT NULL,
      details TEXT,
      screenshotUrl TEXT
    );
  `);

  // Ensure missing columns on pre-existing database files are migrated safely
  try { db.run("ALTER TABLE resumes ADD COLUMN isActive INTEGER DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE user_credentials ADD COLUMN updatedAt TEXT"); } catch {}
  try { db.run("ALTER TABLE jobs ADD COLUMN experience TEXT"); } catch {}

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite db:', err);
  }
}

// Credentials Helper Functions
export async function saveCredential(cred: {
  id: string;
  websiteName: string;
  email: string;
  encryptedPassword: string;
  rememberMe: boolean;
  status: string;
  lastLoginTime?: string;
}) {
  const database = await getDb();
  const now = new Date().toISOString();
  database.run(
    `INSERT OR REPLACE INTO user_credentials (id, websiteName, email, encryptedPassword, rememberMe, status, lastLoginTime, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cred.id,
      cred.websiteName,
      cred.email,
      cred.encryptedPassword,
      cred.rememberMe ? 1 : 0,
      cred.status,
      cred.lastLoginTime || '',
      now
    ]
  );
  saveDb();
}

export async function getCredentials(): Promise<SiteCredential[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT id, websiteName, email, rememberMe, status, lastLoginTime, updatedAt FROM user_credentials');
  const creds: SiteCredential[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    creds.push({
      id: String(row.id),
      websiteName: String(row.websiteName),
      email: String(row.email),
      rememberMe: Boolean(row.rememberMe),
      status: String(row.status) as any,
      lastLoginTime: String(row.lastLoginTime || ''),
      updatedAt: String(row.updatedAt || '')
    });
  }
  stmt.free();
  return creds;
}

export async function getCredentialRaw(id: string): Promise<{
  id: string;
  websiteName: string;
  email: string;
  encryptedPassword: string;
  rememberMe: boolean;
  status: string;
} | null> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM user_credentials WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: String(row.id),
      websiteName: String(row.websiteName),
      email: String(row.email),
      encryptedPassword: String(row.encryptedPassword),
      rememberMe: Boolean(row.rememberMe),
      status: String(row.status)
    };
  }
  stmt.free();
  return null;
}

export async function deleteCredential(id: string) {
  const database = await getDb();
  database.run('DELETE FROM user_credentials WHERE id = ?', [id]);
  saveDb();
}

// Automation Settings Helpers
export async function getAutomationSettings(): Promise<AutomationSettings> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM automation_settings WHERE id = 'default'");
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      browserType: (row.browserType as any) || 'chrome',
      headless: Boolean(row.headless),
      maxJobs: Number(row.maxJobs) || 25,
      delayBetweenJobs: Number(row.delayBetweenJobs) || 3,
      randomDelay: Boolean(row.randomDelay),
      timeout: Number(row.timeout) || 30000,
      retryCount: Number(row.retryCount) || 3,
      autoStop: Boolean(row.autoStop),
      desktopNotification: Boolean(row.desktopNotification),
      soundNotification: Boolean(row.soundNotification)
    };
  }
  stmt.free();

  // Return defaults
  return {
    browserType: 'chrome',
    headless: true,
    maxJobs: 25,
    delayBetweenJobs: 3,
    randomDelay: true,
    timeout: 30000,
    retryCount: 3,
    autoStop: true,
    desktopNotification: true,
    soundNotification: true
  };
}

export async function saveAutomationSettings(settings: AutomationSettings) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO automation_settings (id, browserType, headless, maxJobs, delayBetweenJobs, randomDelay, timeout, retryCount, autoStop, desktopNotification, soundNotification)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settings.browserType,
      settings.headless ? 1 : 0,
      settings.maxJobs,
      settings.delayBetweenJobs,
      settings.randomDelay ? 1 : 0,
      settings.timeout,
      settings.retryCount,
      settings.autoStop ? 1 : 0,
      settings.desktopNotification ? 1 : 0,
      settings.soundNotification ? 1 : 0
    ]
  );
  saveDb();
}

// Resume Helper Functions
export async function saveResume(resume: ResumeFile) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO resumes (id, originalName, filename, path, uploadDate, size, parsedText, parsedSkills, parsedEmail, parsedPhone, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resume.id,
      resume.originalName,
      resume.filename,
      resume.path,
      resume.uploadDate,
      resume.size,
      resume.parsedText || '',
      JSON.stringify(resume.parsedSkills || []),
      resume.parsedEmail || '',
      resume.parsedPhone || '',
      resume.isActive ? 1 : 0
    ]
  );
  saveDb();
}

export async function setActiveResume(id: string) {
  const database = await getDb();
  database.run('UPDATE resumes SET isActive = 0');
  database.run('UPDATE resumes SET isActive = 1 WHERE id = ?', [id]);
  saveDb();
}

export async function deleteResume(id: string) {
  const database = await getDb();
  database.run('DELETE FROM resumes WHERE id = ?', [id]);
  saveDb();
}

export async function getResumes(): Promise<ResumeFile[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM resumes ORDER BY isActive DESC, uploadDate DESC');
  const resumes: ResumeFile[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    resumes.push({
      id: String(row.id),
      originalName: String(row.originalName),
      filename: String(row.filename),
      path: String(row.path),
      uploadDate: String(row.uploadDate),
      size: Number(row.size),
      parsedText: String(row.parsedText || ''),
      parsedSkills: row.parsedSkills ? JSON.parse(String(row.parsedSkills)) : [],
      parsedEmail: String(row.parsedEmail || ''),
      parsedPhone: String(row.parsedPhone || ''),
      isActive: Boolean(row.isActive)
    });
  }
  stmt.free();
  return resumes;
}

export async function saveUserProfile(profile: UserProfile) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO user_profiles (id, jobRole, experience, skills, location, workMode, keywords, applicantName, email, phone, currentNoticePeriod, expectedCtc, portfolioUrl, linkedinUrl, githubUrl)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.jobRole,
      profile.experience,
      profile.skills,
      profile.location,
      profile.workMode,
      profile.keywords,
      profile.applicantName || '',
      profile.email || '',
      profile.phone || '',
      profile.currentNoticePeriod || '',
      profile.expectedCtc || '',
      profile.portfolioUrl || '',
      profile.linkedinUrl || '',
      profile.githubUrl || ''
    ]
  );
  saveDb();
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const database = await getDb();
  const stmt = database.prepare("SELECT * FROM user_profiles WHERE id = 'default'");
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      jobRole: String(row.jobRole || ''),
      experience: String(row.experience || ''),
      skills: String(row.skills || ''),
      location: String(row.location || ''),
      workMode: (row.workMode as any) || 'Remote',
      keywords: String(row.keywords || ''),
      applicantName: String(row.applicantName || ''),
      email: String(row.email || ''),
      phone: String(row.phone || ''),
      currentNoticePeriod: String(row.currentNoticePeriod || ''),
      expectedCtc: String(row.expectedCtc || ''),
      portfolioUrl: String(row.portfolioUrl || ''),
      linkedinUrl: String(row.linkedinUrl || ''),
      githubUrl: String(row.githubUrl || '')
    };
  }
  stmt.free();
  return null;
}

export async function saveJob(job: Job) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO jobs (id, company, role, location, experience, applyLink, sourceWebsite, salary, datePosted, matchScore, matchReason, status, applicationNotes, appliedAt, screenshotUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.company,
      job.role,
      job.location,
      job.experience || '',
      job.applyLink,
      job.sourceWebsite,
      job.salary || '',
      job.datePosted || '',
      job.matchScore || 80,
      job.matchReason || '',
      job.status,
      job.applicationNotes || '',
      job.appliedAt || '',
      job.screenshotUrl || ''
    ]
  );
  saveDb();
}

export async function getJobs(): Promise<Job[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM jobs ORDER BY matchScore DESC, id DESC');
  const jobs: Job[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    jobs.push({
      id: String(row.id),
      company: String(row.company),
      role: String(row.role),
      location: String(row.location),
      experience: String(row.experience || ''),
      applyLink: String(row.applyLink),
      sourceWebsite: String(row.sourceWebsite),
      salary: String(row.salary || ''),
      datePosted: String(row.datePosted || ''),
      matchScore: Number(row.matchScore || 80),
      matchReason: String(row.matchReason || ''),
      status: String(row.status) as any,
      applicationNotes: String(row.applicationNotes || ''),
      appliedAt: String(row.appliedAt || ''),
      screenshotUrl: String(row.screenshotUrl || '')
    });
  }
  stmt.free();
  return jobs;
}

export async function clearJobs() {
  const database = await getDb();
  database.run('DELETE FROM jobs');
  saveDb();
}

export async function isAlreadyApplied(company: string, role: string, sourceWebsite: string): Promise<boolean> {
  const database = await getDb();
  const stmt = database.prepare(
    `SELECT COUNT(*) as count FROM jobs 
     WHERE LOWER(company) = LOWER(?) 
     AND LOWER(role) = LOWER(?) 
     AND LOWER(sourceWebsite) = LOWER(?) 
     AND status IN ('Applied', 'Already Applied')`
  );
  stmt.bind([company.trim(), role.trim(), sourceWebsite.trim()]);
  let count = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    count = Number(row.count || 0);
  }
  stmt.free();

  if (count > 0) return true;

  // Also check application_logs
  const stmt2 = database.prepare(
    `SELECT COUNT(*) as count FROM application_logs 
     WHERE LOWER(company) = LOWER(?) 
     AND LOWER(role) = LOWER(?) 
     AND LOWER(sourceWebsite) = LOWER(?) 
     AND status IN ('Applied', 'Already Applied')`
  );
  stmt2.bind([company.trim(), role.trim(), sourceWebsite.trim()]);
  let logCount = 0;
  if (stmt2.step()) {
    const row = stmt2.getAsObject();
    logCount = Number(row.count || 0);
  }
  stmt2.free();

  return logCount > 0;
}

export async function saveAppLog(log: ApplicationLog) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO application_logs (id, jobId, company, role, sourceWebsite, timestamp, status, details, screenshotUrl, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.jobId || '',
      log.company,
      log.role,
      log.sourceWebsite,
      log.timestamp,
      log.status,
      log.details,
      log.screenshotUrl || '',
      log.error || ''
    ]
  );
  saveDb();
}

export async function getAppLogs(): Promise<ApplicationLog[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM application_logs ORDER BY timestamp DESC');
  const logs: ApplicationLog[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    logs.push({
      id: String(row.id),
      jobId: String(row.jobId || ''),
      company: String(row.company),
      role: String(row.role),
      sourceWebsite: String(row.sourceWebsite),
      timestamp: String(row.timestamp),
      status: String(row.status) as any,
      details: String(row.details || ''),
      screenshotUrl: String(row.screenshotUrl || ''),
      error: String(row.error || '')
    });
  }
  stmt.free();
  return logs;
}

export async function saveSystemLog(log: LogEntry) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO system_logs (id, timestamp, type, website, message, details, screenshotUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.timestamp,
      log.type,
      log.website || '',
      log.message,
      log.details || '',
      log.screenshotUrl || ''
    ]
  );
  saveDb();
}

export async function getSystemLogs(): Promise<LogEntry[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM system_logs ORDER BY timestamp ASC');
  const logs: LogEntry[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    logs.push({
      id: String(row.id),
      timestamp: String(row.timestamp),
      type: String(row.type) as any,
      website: String(row.website || ''),
      message: String(row.message),
      details: String(row.details || ''),
      screenshotUrl: String(row.screenshotUrl || '')
    });
  }
  stmt.free();
  return logs;
}

export async function clearLogs() {
  const database = await getDb();
  database.run('DELETE FROM system_logs');
  database.run('DELETE FROM application_logs');
  saveDb();
}
