import { BrowserContext, Page, chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { Job, UserProfile, ResumeFile, ApplicationStatus } from '../../src/types/index.js';

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

  // Search matching jobs using Playwright or fetch
  abstract searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]>;

  // Assisted Apply with Playwright: Fill form, upload resume, stop before submission if review required
  abstract applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult>;

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
  protected async isBlockedOrLoginRequired(page: Page): Promise<{ blocked: boolean; reason?: string }> {
    const content = await page.content().catch(() => '');
    const url = page.url();

    if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
      return { blocked: true, reason: 'Login required on website' };
    }

    if (
      content.toLowerCase().includes('captcha') ||
      content.toLowerCase().includes('verify you are human') ||
      content.toLowerCase().includes('security check') ||
      content.toLowerCase().includes('cf-challenge')
    ) {
      return { blocked: true, reason: 'CAPTCHA / Security verification detected' };
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
