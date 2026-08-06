import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Job, ApplicationLog, LogEntry, UserProfile, ResumeFile } from '../src/types/index.js';

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
      parsedPhone TEXT
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

// Data Helper Functions

export async function saveResume(resume: ResumeFile) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO resumes (id, originalName, filename, path, uploadDate, size, parsedText, parsedSkills, parsedEmail, parsedPhone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      resume.parsedPhone || ''
    ]
  );
  saveDb();
}

export async function getResumes(): Promise<ResumeFile[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM resumes ORDER BY uploadDate DESC');
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
      parsedPhone: String(row.parsedPhone || '')
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
