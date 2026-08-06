import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  AutomationProgress,
  LogEntry,
  Job,
  UserProfile,
  ResumeFile,
  ApplicationLog,
  WebsiteConfig
} from '../src/types/index.js';
import {
  saveJob,
  saveAppLog,
  saveSystemLog,
  getUserProfile,
  getResumes,
  getAutomationSettings
} from './db.js';
import { sessionManager } from './services/sessionManager.js';
import { loginManager } from './services/loginManager.js';

// Import Connectors
import { BaseJobConnector, ApplyResult } from './automation/baseConnector.js';
import { NaukriConnector } from './automation/naukri.js';
import { IndeedConnector } from './automation/indeed.js';
import { InstahyreConnector } from './automation/instahyre.js';
import { FounditConnector, WellfoundConnector, LinkedInConnector } from './automation/foundit.js';
import {
  InternshalaConnector,
  UnstopConnector,
  FreshersworldConnector,
  TimesJobsConnector
} from './automation/otherConnectors.js';

class AutomationController {
  private connectors: Map<string, BaseJobConnector> = new Map();
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private activePage: Page | null = null;

  private state: AutomationProgress = {
    isRunning: false,
    isPaused: false,
    currentWebsite: 'Idle',
    currentStep: 'Ready to start job application process',
    jobsFound: 0,
    jobsProcessed: 0,
    successfulApps: 0,
    failedAttempts: 0,
    reviewRequiredCount: 0,
    logs: []
  };

  constructor() {
    this.registerConnector(new NaukriConnector());
    this.registerConnector(new IndeedConnector());
    this.registerConnector(new InstahyreConnector());
    this.registerConnector(new FounditConnector());
    this.registerConnector(new WellfoundConnector());
    this.registerConnector(new LinkedInConnector());
    this.registerConnector(new InternshalaConnector());
    this.registerConnector(new UnstopConnector());
    this.registerConnector(new FreshersworldConnector());
    this.registerConnector(new TimesJobsConnector());
  }

  private registerConnector(connector: BaseJobConnector) {
    this.connectors.set(connector.id, connector);
  }

  public getSupportedWebsites(): WebsiteConfig[] {
    const list: WebsiteConfig[] = [
      { id: 'naukri', name: 'Naukri.com', domain: 'naukri.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'indeed', name: 'Indeed', domain: 'indeed.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'instahyre', name: 'Instahyre', domain: 'instahyre.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'foundit', name: 'Foundit (Monster)', domain: 'foundit.in', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'wellfound', name: 'Wellfound (AngelList)', domain: 'wellfound.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'internshala', name: 'Internshala', domain: 'internshala.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'unstop', name: 'Unstop', domain: 'unstop.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'freshersworld', name: 'Freshersworld', domain: 'freshersworld.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true },
      { id: 'timesjobs', name: 'TimesJobs', domain: 'timesjobs.com', supportedFeatures: { search: true, autoFill: true, resumeUpload: true, directApply: true, loginSession: true }, requiresAuth: true, enabled: true }
    ];
    return list;
  }

  public getStatus(): AutomationProgress {
    return { ...this.state };
  }

  public addLog(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'step' = 'info',
    website?: string,
    screenshotUrl?: string,
    details?: string
  ) {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
      website: website || this.state.currentWebsite,
      message,
      details,
      screenshotUrl
    };

    this.state.logs.push(entry);
    if (this.state.logs.length > 300) {
      this.state.logs.shift();
    }

    if (screenshotUrl) {
      this.state.latestScreenshot = screenshotUrl;
    }

    saveSystemLog(entry);
  }

  public async startAutomation(websiteIds: string[], searchOnly: boolean = false) {
    if (this.state.isRunning) {
      return;
    }

    const settings = await getAutomationSettings();

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.requiresOtp = false;
    this.state.requiresCaptcha = false;
    this.state.currentStep = 'Initializing Playwright Automation Engine...';
    this.state.startTime = new Date().toISOString();
    this.state.jobsFound = 0;
    this.state.jobsProcessed = 0;
    this.state.successfulApps = 0;
    this.state.failedAttempts = 0;
    this.state.reviewRequiredCount = 0;

    this.addLog(`Starting AI Job Apply Assistant pipeline (${searchOnly ? 'Search Mode' : 'Search & Assisted Apply'})`, 'step');

    // Fetch profile and active resume
    const profile = (await getUserProfile()) || {
      jobRole: 'Java Developer',
      experience: '0-2 Yrs',
      skills: 'Java, Spring Boot, SQL, React',
      location: 'Pune',
      workMode: 'Remote',
      keywords: 'Java, Spring'
    };

    const resumes = await getResumes();
    const activeResume = resumes.find(r => r.isActive) || (resumes.length > 0 ? resumes[0] : null);

    if (activeResume) {
      this.addLog(`Selected Active Resume: ${activeResume.originalName}`, 'info');
    } else {
      this.addLog('No resume file uploaded. Form filling will proceed with profile inputs.', 'warning');
    }

    // Filter valid connectors
    const targetConnectors: BaseJobConnector[] = [];
    for (const id of websiteIds) {
      const conn = this.connectors.get(id);
      if (conn) targetConnectors.push(conn);
    }

    if (targetConnectors.length === 0) {
      this.addLog('No valid job sources selected!', 'error');
      this.state.isRunning = false;
      return;
    }

    // Launch Playwright Browser
    try {
      this.browser = await chromium.launch({
        headless: settings.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      this.addLog(`Playwright Chromium Engine launched (Headless: ${settings.headless})`, 'success');
    } catch (err: any) {
      this.addLog(`Playwright browser launch note: ${err.message}. Running connector engine.`, 'warning');
    }

    // Execute pipeline async
    this.executePipeline(targetConnectors, profile, activeResume, searchOnly, settings).catch(err => {
      this.addLog(`Pipeline error: ${err.message}`, 'error');
    }).finally(async () => {
      this.state.isRunning = false;
      this.state.currentStep = 'Job application process completed';
      this.addLog('AI Job Apply Assistant run finished.', 'step');
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    });
  }

  private async getOrCreateContextForWebsite(websiteId: string): Promise<{ context: BrowserContext; page: Page } | null> {
    if (!this.browser) return null;

    if (this.contexts.has(websiteId)) {
      const ctx = this.contexts.get(websiteId)!;
      const pages = ctx.pages();
      const p = pages.length > 0 ? pages[0] : await ctx.newPage();
      return { context: ctx, page: p };
    }

    // Check if saved session exists for this website
    const hasSession = sessionManager.sessionExists(websiteId);
    let contextOptions: any = {
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (hasSession) {
      const statePath = sessionManager.getSessionPath(websiteId);
      contextOptions.storageState = statePath;
      this.addLog(`[${websiteId}] Session loaded from storageState (${statePath})`, 'info');
    } else {
      this.addLog(`[${websiteId}] No active session found. Automated login will be attempted if credentials exist.`, 'info');
    }

    const ctx = await this.browser.newContext(contextOptions);
    const p = await ctx.newPage();
    this.contexts.set(websiteId, ctx);
    this.activePage = p;

    // Perform automated login if session wasn't present
    if (!hasSession) {
      const loginRes = await loginManager.performLogin(websiteId, ctx, p, (msg, type) => {
        this.addLog(msg, type, websiteId);
      });

      if (loginRes.requiresOtp) {
        this.state.isPaused = true;
        this.state.requiresOtp = true;
        this.state.pausedWebsite = websiteId;
        this.addLog(`Automation Paused: Waiting for OTP verification code on ${websiteId}`, 'warning');
      } else if (loginRes.requiresCaptcha) {
        this.state.isPaused = true;
        this.state.requiresCaptcha = true;
        this.state.pausedWebsite = websiteId;
        this.addLog(`Automation Paused: Waiting for manual CAPTCHA completion on ${websiteId}`, 'warning');
      }
    }

    return { context: ctx, page: p };
  }

  private async executePipeline(
    connectors: BaseJobConnector[],
    profile: UserProfile,
    resume: ResumeFile | null,
    searchOnly: boolean,
    settings: any
  ) {
    const allFoundJobs: Job[] = [];

    // Step 1: Search Phase for each portal
    for (const connector of connectors) {
      if (!this.state.isRunning) break;

      this.state.currentWebsite = connector.name;
      this.state.currentStep = `Searching matching jobs on ${connector.name}...`;
      this.addLog(`[${connector.name}] Initiating job search for "${profile.jobRole}" in "${profile.location}"`, 'info');

      try {
        const ctxObj = await this.getOrCreateContextForWebsite(connector.id);
        const page = ctxObj ? ctxObj.page : ({
          goto: async () => {},
          content: async () => '',
          url: () => connector.searchUrlTemplate,
          screenshot: async () => Buffer.from(''),
          $$: async () => [],
          $: async () => null,
          fill: async () => {},
          setInputFiles: async () => {}
        } as any);

        const found = await connector.searchJobs(page, profile, (msg, type, ss) => {
          this.addLog(msg, type, connector.name, ss);
        });

        for (const job of found) {
          saveJob(job);
          allFoundJobs.push(job);
        }

        this.state.jobsFound += found.length;
      } catch (e: any) {
        this.addLog(`Error searching ${connector.name}: ${e.message}`, 'error', connector.name);
      }
    }

    if (searchOnly) {
      this.addLog(`Search complete. ${this.state.jobsFound} jobs collected in database.`, 'success');
      return;
    }

    // Limit jobs based on settings
    const maxJobs = settings.maxJobs || 25;
    const targetJobs = allFoundJobs.slice(0, maxJobs);

    // Step 2: Apply Phase
    this.addLog(`Starting Assisted Application Phase for ${targetJobs.length} jobs...`, 'step');

    for (let i = 0; i < targetJobs.length; i++) {
      if (!this.state.isRunning) {
        this.addLog('Automation stopped by user.', 'warning');
        break;
      }

      // Check if paused for OTP / CAPTCHA
      while (this.state.isPaused && this.state.isRunning) {
        await new Promise(r => setTimeout(r, 1000));
      }

      const job = targetJobs[i];
      this.state.currentWebsite = job.sourceWebsite;
      this.state.currentStep = `[${i + 1}/${targetJobs.length}] Processing application for ${job.role} at ${job.company}`;
      this.state.currentJob = job;

      const connector = Array.from(this.connectors.values()).find(c => c.name === job.sourceWebsite);

      this.addLog(`Navigating to ${job.company} (${job.role}) on ${job.sourceWebsite}...`, 'info');

      let applyRes: ApplyResult;
      if (connector) {
        const ctxObj = await this.getOrCreateContextForWebsite(connector.id);
        const page = ctxObj ? ctxObj.page : null;

        if (page) {
          applyRes = await connector.apply(page, job, profile, resume, (msg, type, ss) => {
            this.addLog(msg, type, job.sourceWebsite, ss);
          });
        } else {
          applyRes = {
            status: 'Ready For Confirmation',
            details: `Browser page context unavailable for ${job.role} at ${job.company}. Manual confirmation required.`
          };
        }
      } else {
        applyRes = {
          status: 'Ready For Confirmation',
          details: `No active connector available for ${job.sourceWebsite}. Manual confirmation required.`
        };
      }

      // Update job record
      job.status = applyRes.status;
      job.appliedAt = new Date().toLocaleString();
      job.screenshotUrl = applyRes.screenshotUrl;
      job.applicationNotes = applyRes.details;
      saveJob(job);

      // Save application log
      const appLog: ApplicationLog = {
        id: `applog_${Date.now()}_${i}`,
        jobId: job.id,
        company: job.company,
        role: job.role,
        sourceWebsite: job.sourceWebsite,
        timestamp: new Date().toLocaleString(),
        status: applyRes.status,
        details: applyRes.details,
        screenshotUrl: applyRes.screenshotUrl,
        error: applyRes.error
      };
      saveAppLog(appLog);

      this.state.jobsProcessed++;

      if (applyRes.status === 'Applied') {
        this.state.successfulApps++;
        this.addLog(`✔ Applied to ${job.company} (${job.role})`, 'success', job.sourceWebsite, applyRes.screenshotUrl);
      } else if (
        applyRes.status === 'Verification Required' ||
        applyRes.status === 'Login Required' ||
        applyRes.status === 'CAPTCHA Required' ||
        applyRes.status === 'Ready For Confirmation'
      ) {
        this.state.reviewRequiredCount++;
        this.addLog(`⚠ ${applyRes.status} for ${job.company}: ${applyRes.details}`, 'warning', job.sourceWebsite, applyRes.screenshotUrl);
      } else if (applyRes.status === 'Already Applied') {
        this.addLog(`ℹ Already applied to ${job.company} (${job.role})`, 'info', job.sourceWebsite, applyRes.screenshotUrl);
      } else {
        this.state.failedAttempts++;
        this.addLog(`✖ ${applyRes.status} for ${job.company}: ${applyRes.details}`, 'error', job.sourceWebsite, applyRes.screenshotUrl);
      }

      // Delay between jobs based on settings
      const delayMs = (settings.delayBetweenJobs || 3) * 1000;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  public async resumeWithOtp(otpCode: string) {
    if (!this.state.isPaused || !this.state.pausedWebsite) return;

    this.addLog(`Submitting OTP code for ${this.state.pausedWebsite}...`, 'info');
    if (this.activePage) {
      try {
        const otpSel = 'input[placeholder*="otp" i], input[id*="otp" i], input[type="number"], input[name*="code" i]';
        const el = await this.activePage.$(otpSel);
        if (el) {
          await this.activePage.fill(otpSel, otpCode);
          await this.activePage.keyboard.press('Enter');
          this.addLog('OTP submitted successfully to page.', 'success');
        }
      } catch (err: any) {
        this.addLog(`Error auto-filling OTP: ${err.message}`, 'error');
      }
    }

    this.state.isPaused = false;
    this.state.requiresOtp = false;
    this.state.requiresCaptcha = false;
    this.state.pausedWebsite = undefined;
  }

  public stopAutomation() {
    if (this.state.isRunning) {
      this.state.isRunning = false;
      this.state.isPaused = false;
      this.state.currentStep = 'Stopping background automation...';
      this.addLog('Stop signal sent to automation runner.', 'warning');
    }
  }
}

export const automationController = new AutomationController();
