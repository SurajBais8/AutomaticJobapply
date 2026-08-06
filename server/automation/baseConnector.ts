import { BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { Job, UserProfile, ResumeFile, ApplicationStatus } from '../../src/types/index.js';
import { loginManager } from '../services/loginManager.js';

export interface ApplyResult {
  status: ApplicationStatus;
  details: string;
  screenshotUrl?: string;
  error?: string;
}

export abstract class BaseJobConnector {
  abstract id: string;
  abstract name: string;
  abstract domain: string;
  abstract searchUrlTemplate: string;

  protected SCREENSHOT_DIR = path.join(process.cwd(), 'playwright', 'screenshots');

  constructor() {
    if (!fs.existsSync(this.SCREENSHOT_DIR)) {
      fs.mkdirSync(this.SCREENSHOT_DIR, { recursive: true });
    }
  }

  // Generate real search url
  abstract buildSearchUrl(role: string, location: string, experience: string): string;

  // Standardized connector interface methods
  public async login(
    context: BrowserContext,
    page: Page,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<boolean> {
    const res = await loginManager.performLogin(this.id, context, page, logCallback);
    return res.success;
  }

  abstract searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]>;

  public async collectJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    return this.searchJobs(page, profile, logCallback);
  }

  public async openJob(
    page: Page,
    job: Job,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<boolean> {
    try {
      logCallback(`Opening job page: ${job.role} at ${job.company}`, 'info');
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return true;
    } catch (err: any) {
      logCallback(`Failed to open job page: ${err.message}`, 'error');
      return false;
    }
  }

  public async uploadResume(
    page: Page,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<boolean> {
    const res = await this.uploadResumeIfSupported(page, resume);
    if (res) {
      logCallback(`Uploaded resume (${resume?.originalName}) to ${this.name}`, 'info');
    }
    return res;
  }

  public async fillForm(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<boolean> {
    try {
      await this.fillCommonFields(page, profile);
      logCallback(`Filled common profile inputs on ${this.name}`, 'info');
      return true;
    } catch {
      return false;
    }
  }

  abstract applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult>;

  public async apply(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    // Standard wrapper with 3 retries
    let attempts = 0;
    let lastError = '';
    while (attempts < 3) {
      attempts++;
      try {
        if (attempts > 1) {
          logCallback(`Retry attempt ${attempts}/3 for ${job.company}...`, 'warning');
        }
        const res = await this.applyJob(page, job, profile, resume, logCallback);
        if (res.status !== 'Failed') {
          return res;
        }
        lastError = res.details;
      } catch (err: any) {
        lastError = err.message;
      }
      await page.waitForTimeout(1000 * attempts);
    }

    return {
      status: 'Failed',
      details: `Failed after 3 retries: ${lastError}`,
      error: lastError
    };
  }

  public saveLog(
    logMsg: string,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ) {
    logCallback(`[${this.name}] ${logMsg}`, 'info');
  }

  // Cover letter generator
  public generateCoverLetter(job: Job, profile: UserProfile): string {
    const name = profile.applicantName || 'Applicant';
    const role = job.role || profile.jobRole || 'Software Engineer';
    const company = job.company || 'Hiring Team';
    const skills = profile.skills || 'Java, React, SQL';
    const exp = profile.experience || 'Experienced Professional';

    return `Dear Hiring Manager at ${company},\n\nI am writing to express my enthusiastic interest in the ${role} position. With over ${exp} of experience and strong expertise in ${skills}, I am confident in my ability to contribute value to your engineering team.\n\nThank you for considering my application.\n\nSincerely,\n${name}`;
  }

  // Take screenshot helper
  protected async takeScreenshot(page: Page, namePrefix: string): Promise<string> {
    try {
      const filename = `${namePrefix}_${Date.now()}.png`;
      const fullPath = path.join(this.SCREENSHOT_DIR, filename);
      await page.screenshot({ path: fullPath, fullPage: false });
      return `/api/screenshot/${filename}`;
    } catch (e) {
      console.error('Failed to take screenshot:', e);
      return '';
    }
  }

  // Helper to check if CAPTCHA or Login is blocking
  protected async isBlockedOrLoginRequired(page: Page): Promise<{ blocked: boolean; reason?: string; requiresCaptcha?: boolean; requiresOtp?: boolean }> {
    const content = (await page.content().catch(() => '')).toLowerCase();
    const url = page.url();

    if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
      return { blocked: true, reason: 'Login required on website' };
    }

    if (content.includes('captcha') || content.includes('verify you are human') || content.includes('cf-challenge')) {
      return { blocked: true, reason: 'CAPTCHA verification detected', requiresCaptcha: true };
    }

    if (content.includes('otp') || content.includes('verification code') || content.includes('2fa')) {
      return { blocked: true, reason: 'OTP verification required', requiresOtp: true };
    }

    return { blocked: false };
  }

  // Generic smart form-filler using Playwright selectors
  protected async fillCommonFields(page: Page, profile: UserProfile) {
    // Fill Name
    if (profile.applicantName) {
      const nameSelectors = ['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'];
      for (const sel of nameSelectors) {
        if (await page.$(sel)) {
          await page.fill(sel, profile.applicantName).catch(() => {});
          break;
        }
      }
    }

    // Fill Email
    if (profile.email) {
      const emailSelectors = ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'];
      for (const sel of emailSelectors) {
        if (await page.$(sel)) {
          await page.fill(sel, profile.email).catch(() => {});
          break;
        }
      }
    }

    // Fill Phone
    if (profile.phone) {
      const phoneSelectors = ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]'];
      for (const sel of phoneSelectors) {
        if (await page.$(sel)) {
          await page.fill(sel, profile.phone).catch(() => {});
          break;
        }
      }
    }

    // Fill Experience
    if (profile.experience) {
      const expSelectors = ['input[name*="exp" i]', 'input[placeholder*="experience" i]'];
      for (const sel of expSelectors) {
        if (await page.$(sel)) {
          await page.fill(sel, profile.experience).catch(() => {});
          break;
        }
      }
    }
  }

  // Generic Resume Upload helper
  protected async uploadResumeIfSupported(page: Page, resume: ResumeFile | null): Promise<boolean> {
    if (!resume || !resume.path || !fs.existsSync(resume.path)) {
      return false;
    }

    const fileInputSelectors = [
      'input[type="file"]',
      'input[name*="resume" i]',
      'input[id*="resume" i]',
      'input[accept*="pdf" i]'
    ];

    for (const sel of fileInputSelectors) {
      const el = await page.$(sel);
      if (el) {
        await page.setInputFiles(sel, resume.path).catch(() => {});
        return true;
      }
    }
    return false;
  }
}
