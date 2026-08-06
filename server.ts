import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import {
  getResumes,
  saveResume,
  setActiveResume,
  deleteResume,
  getUserProfile,
  saveUserProfile,
  getJobs,
  clearJobs,
  getAppLogs,
  getSystemLogs,
  clearLogs,
  getCredentials,
  saveCredential,
  deleteCredential,
  getAutomationSettings,
  saveAutomationSettings
} from './server/db.js';
import { parseResumeFile } from './server/resumeParser.js';
import { automationController } from './server/automationController.js';
import { encryptPassword } from './server/services/encryptionService.js';
import { sessionManager } from './server/services/sessionManager.js';

const app = express();
const PORT = 3000;

// Storage directories
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const RESUME_DIR = path.join(STORAGE_DIR, 'resumes');
const REPORTS_DIR = path.join(STORAGE_DIR, 'reports');
const SCREENSHOT_DIR = path.join(process.cwd(), 'playwright', 'screenshots');

[STORAGE_DIR, RESUME_DIR, REPORTS_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Setup Multer for upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, RESUME_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `resume_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Credentials Endpoints
app.get('/api/credentials', async (_req, res) => {
  try {
    const creds = await getCredentials();
    // Update live session status check
    const enriched = creds.map(c => ({
      ...c,
      status: sessionManager.sessionExists(c.id) ? ('Connected' as const) : c.status
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/credentials', async (req, res) => {
  try {
    const { websiteId, websiteName, email, password, rememberMe } = req.body;

    if (!websiteId || !email || !password) {
      return res.status(400).json({ error: 'Website, email and password are required' });
    }

    const encryptedPassword = encryptPassword(password);
    const credData = {
      id: websiteId,
      websiteName: websiteName || websiteId,
      email,
      encryptedPassword,
      rememberMe: rememberMe !== undefined ? rememberMe : true,
      status: 'Not Logged In' as const,
      lastLoginTime: new Date().toISOString()
    };

    await saveCredential(credData);
    res.json({ success: true, credential: credData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCredential(id);
    await sessionManager.deleteSession(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Automation Settings Endpoints
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await getAutomationSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await saveAutomationSettings(settings);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Resume endpoints
app.get('/api/resumes', async (_req, res) => {
  try {
    const resumes = await getResumes();
    res.json(resumes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resumes/:id/active', async (req, res) => {
  try {
    await setActiveResume(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/resumes/:id', async (req, res) => {
  try {
    await deleteResume(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resumes/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const filePath = req.file.path;
    const parsed = await parseResumeFile(filePath);

    const resumeData = {
      id: `resume_${Date.now()}`,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: filePath,
      uploadDate: new Date().toISOString(),
      size: req.file.size,
      parsedText: parsed.text,
      parsedSkills: parsed.skills,
      parsedEmail: parsed.email,
      parsedPhone: parsed.phone,
      isActive: true
    };

    await saveResume(resumeData);
    await setActiveResume(resumeData.id);

    // Auto update user profile if email/phone/skills parsed
    const currentProfile = (await getUserProfile()) || {
      jobRole: 'Full Stack Developer',
      experience: '1 Year',
      skills: '',
      location: 'Pune',
      workMode: 'Remote',
      keywords: ''
    };

    if (parsed.skills.length > 0 && !currentProfile.skills) {
      currentProfile.skills = parsed.skills.join(', ');
    }
    if (parsed.email && !currentProfile.email) {
      currentProfile.email = parsed.email;
    }
    if (parsed.phone && !currentProfile.phone) {
      currentProfile.phone = parsed.phone;
    }

    await saveUserProfile(currentProfile);

    res.json({ success: true, resume: resumeData, parsedProfile: currentProfile });
  } catch (err: any) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resumes/file/:filename', (req, res) => {
  const filePath = path.join(RESUME_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Profile endpoints
app.get('/api/profile', async (_req, res) => {
  try {
    const profile = await getUserProfile();
    res.json(
      profile || {
        jobRole: 'Java Full Stack Developer',
        experience: '5 Months',
        skills: 'Java, Spring Boot, React, SQL',
        location: 'Pune',
        workMode: 'Remote',
        keywords: 'Java, Spring, React, SQL',
        applicantName: 'John Doe',
        email: 'applicant@example.com',
        phone: '+91 9876543210'
      }
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profile = req.body;
    await saveUserProfile(profile);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Websites list
app.get('/api/websites', (_req, res) => {
  const list = automationController.getSupportedWebsites();
  res.json(list);
});

// Automation endpoints
app.post('/api/automation/start', async (req, res) => {
  try {
    const { websiteIds, searchOnly } = req.body;
    await automationController.startAutomation(websiteIds || [], searchOnly || false);
    res.json({ success: true, message: 'Automation started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/automation/stop', (_req, res) => {
  automationController.stopAutomation();
  res.json({ success: true, message: 'Stop signal sent' });
});

app.post('/api/automation/otp', async (req, res) => {
  try {
    const { otpCode } = req.body;
    await automationController.resumeWithOtp(otpCode);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/automation/status', (_req, res) => {
  const status = automationController.getStatus();
  res.json(status);
});

// Jobs & Logs
app.get('/api/jobs', async (_req, res) => {
  try {
    const jobs = await getJobs();
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs', async (_req, res) => {
  try {
    await clearJobs();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (_req, res) => {
  try {
    const appLogs = await getAppLogs();
    const sysLogs = await getSystemLogs();
    res.json({ applicationLogs: appLogs, systemLogs: sysLogs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/logs', async (_req, res) => {
  try {
    await clearLogs();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Report Export
app.get('/api/reports/export', async (_req, res) => {
  try {
    const jobs = await getJobs();
    const appLogs = await getAppLogs();

    let csv = 'Company,Role,Location,Experience,Source Website,Status,Applied Time,Details,Apply Link\n';
    for (const j of jobs) {
      const matchLog = appLogs.find(l => l.jobId === j.id);
      const row = [
        `"${(j.company || '').replace(/"/g, '""')}"`,
        `"${(j.role || '').replace(/"/g, '""')}"`,
        `"${(j.location || '').replace(/"/g, '""')}"`,
        `"${(j.experience || '').replace(/"/g, '""')}"`,
        `"${(j.sourceWebsite || '').replace(/"/g, '""')}"`,
        `"${(j.status || '').replace(/"/g, '""')}"`,
        `"${(j.appliedAt || '').replace(/"/g, '""')}"`,
        `"${((matchLog?.details || j.applicationNotes || '').replace(/"/g, '""'))}"`,
        `"${(j.applyLink || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="job_applications_report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Screenshot static server
app.get('/api/screenshot/:filename', (req, res) => {
  const filePath = path.join(SCREENSHOT_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Generate empty SVG placeholder if screenshot missing
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1f2937"/>
        <text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="16" text-anchor="middle">
          Playwright Live Snapshot (${req.params.filename})
        </text>
      </svg>
    `);
  }
});

// Vite Middleware setup for dev vs production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
