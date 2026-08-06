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

  // Universal State Machine implementation for apply operations
  public async executeStatefulApplyProcess(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void,
    applyButtonSelectors: string[] = []
  ): Promise<ApplyResult> {
    const initialUrl = page.url();

    // Step 1: Checking Login, CAPTCHA, OTP
    const check = await this.isBlockedOrLoginRequired(page);
    if (check.blocked) {
      const screenshot = await this.takeScreenshot(page, `${this.id}_blocked`);
      if (check.requiresCaptcha) {
        logCallback(`[${this.name}] CAPTCHA verification detected`, 'warning', screenshot);
        return { status: 'CAPTCHA Required', details: 'Manual CAPTCHA challenge detected on page.', screenshotUrl: screenshot };
      }
      if (check.requiresOtp) {
        logCallback(`[${this.name}] OTP verification required`, 'warning', screenshot);
        return { status: 'Verification Required', details: 'OTP verification code required.', screenshotUrl: screenshot };
      }
      logCallback(`[${this.name}] Login required`, 'warning', screenshot);
      return { status: 'Login Required', details: `Login required on ${this.name}.`, screenshotUrl: screenshot };
    }

    // Step 2: Check if Already Applied
    const pageText = (await page.content().catch(() => '')).toLowerCase();
    if (
      pageText.includes('already applied') ||
      pageText.includes('you have already applied') ||
      pageText.includes('application submitted on') ||
      pageText.includes('you applied on')
    ) {
      const screenshot = await this.takeScreenshot(page, `${this.id}_already_applied`);
      logCallback(`[${this.name}] Already applied to this job previously`, 'info', screenshot);
      return { status: 'Already Applied', details: `Already applied to ${job.company} for ${job.role}.`, screenshotUrl: screenshot };
    }

    // Step 3: Upload Resume
    const hasFileInput = (await page.$('input[type="file"]').catch(() => null)) !== null;
    if (resume && resume.path && fs.existsSync(resume.path)) {
      try {
        const uploaded = await this.uploadResumeIfSupported(page, resume);
        if (uploaded) {
          logCallback(`[${this.name}] Uploaded active resume (${resume.originalName})`, 'info');
        } else if (hasFileInput) {
          const screenshot = await this.takeScreenshot(page, `${this.id}_resume_failed`);
          logCallback(`[${this.name}] Resume upload failed despite file field present`, 'warning', screenshot);
          return { status: 'Resume Upload Failed', details: 'Failed to upload resume into job portal field.', screenshotUrl: screenshot };
        }
      } catch (err: any) {
        const screenshot = await this.takeScreenshot(page, `${this.id}_resume_failed`);
        return { status: 'Resume Upload Failed', details: `Resume upload error: ${err.message}`, screenshotUrl: screenshot };
      }
    }

    // Step 4: Fill Profile
    await this.fillCommonFields(page, profile);

    // Step 5: Detect Apply Button
    const combinedSelectors = [
      ...applyButtonSelectors,
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'input[value*="Apply" i]',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      'button:has-text("Submit")',
      'button:has-text("Submit Application")',
      'button:has-text("Easy Apply")',
      'button:has-text("Quick Apply")',
      '.apply-button',
      '.apply-btn',
      '#apply-button',
      '#applyBtn'
    ];

    let applyElement: any = null;
    let chosenSelector = '';
    for (const sel of combinedSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          const isVisible = await el.isVisible().catch(() => false);
          if (isVisible) {
            applyElement = el;
            chosenSelector = sel;
            break;
          }
        }
      } catch {}
    }

    if (!applyElement) {
      const screenshot = await this.takeScreenshot(page, `${this.id}_no_apply_btn`);
      logCallback(`[${this.name}] Apply button missing on page`, 'warning', screenshot);
      return {
        status: 'Apply Button Missing',
        details: `Could not locate active Apply button on ${this.name} page.`,
        screenshotUrl: screenshot
      };
    }

    // Step 6: Take Screenshot BEFORE Click
    const screenshotBefore = await this.takeScreenshot(page, `${this.id}_before_apply`);
    logCallback(`[${this.name}] BEFORE CLICK: Detected Apply button ("${chosenSelector}"). Triggering application submit...`, 'info', screenshotBefore);

    // Step 7: Click Apply
    try {
      await applyElement.click({ timeout: 10000 }).catch(async () => {
        await page.evaluate((sel: string) => {
          const btn = document.querySelector(sel) as HTMLElement;
          if (btn) btn.click();
        }, chosenSelector);
      });
      logCallback(`[${this.name}] Clicked Apply button for ${job.company}`, 'info');
    } catch (clickErr: any) {
      const screenshotErr = await this.takeScreenshot(page, `${this.id}_click_failed`);
      logCallback(`[${this.name}] Failed to click apply button: ${clickErr.message}`, 'error', screenshotErr);
      return {
        status: 'Submission Failed',
        details: `Error clicking Apply button: ${clickErr.message}`,
        screenshotUrl: screenshotErr
      };
    }

    // Step 8: Wait for Confirmation / Multi-step Modals
    await page.waitForTimeout(3500);

    const secondarySubmitSels = [
      'button:has-text("Submit Application")',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Confirm Application")'
    ];
    for (const secSel of secondarySubmitSels) {
      try {
        const secEl = await page.$(secSel);
        if (secEl && await secEl.isVisible().catch(() => false)) {
          await secEl.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(2500);
          break;
        }
      } catch {}
    }

    // Step 9: Take Screenshot AFTER Click
    const screenshotAfter = await this.takeScreenshot(page, `${this.id}_after_apply`);
    logCallback(`[${this.name}] AFTER CLICK: Completed click action. Evaluating application state...`, 'info', screenshotAfter);

    // Step 10: Detect Success Message OR URL Change OR Success Banner
    const finalUrl = page.url();
    const finalContent = (await page.content().catch(() => '')).toLowerCase();

    const isUrlSuccess =
      finalUrl !== initialUrl &&
      (finalUrl.includes('success') ||
        finalUrl.includes('applied') ||
        finalUrl.includes('thankyou') ||
        finalUrl.includes('thank-you') ||
        finalUrl.includes('confirmation'));

    const isTextSuccess =
      finalContent.includes('application submitted') ||
      finalContent.includes('successfully applied') ||
      finalContent.includes('applied successfully') ||
      finalContent.includes('thank you for applying') ||
      finalContent.includes('your application has been sent') ||
      finalContent.includes('application received') ||
      finalContent.includes('application complete') ||
      finalContent.includes('you\'ve applied') ||
      finalContent.includes('you have applied');

    const successSelector = await page
      .$('.apply-message, .success-message, .applied-banner, [class*="success-message"], [class*="applied-banner"]')
      .catch(() => null);

    if (isUrlSuccess || isTextSuccess || successSelector) {
      logCallback(`[${this.name}] CONFIRMED: Application submitted successfully!`, 'success', screenshotAfter);
      return {
        status: 'Applied',
        details: `Application confirmed submitted for ${job.company} (${job.role}).`,
        screenshotUrl: screenshotAfter
      };
    }

    // Check external ATS redirect
    const isExternalRedirect =
      finalUrl !== initialUrl &&
      !finalUrl.includes(this.domain) &&
      (finalUrl.includes('workday') ||
        finalUrl.includes('greenhouse') ||
        finalUrl.includes('lever') ||
        finalUrl.includes('myworkdayjobs') ||
        finalUrl.includes('icims') ||
        finalUrl.includes('smartrecruiters') ||
        finalUrl.includes('careers'));

    if (isExternalRedirect) {
      logCallback(`[${this.name}] Redirected to external career site (${finalUrl})`, 'warning', screenshotAfter);
      return {
        status: 'Ready For Confirmation',
        details: `Redirected to external career portal (${finalUrl}). Manual submission required.`,
        screenshotUrl: screenshotAfter
      };
    }

    // Check error messages
    if (
      finalContent.includes('error submitting') ||
      finalContent.includes('failed to submit') ||
      finalContent.includes('please fill in required fields') ||
      finalContent.includes('invalid file format')
    ) {
      logCallback(`[${this.name}] Submission error indicated on page`, 'error', screenshotAfter);
      return {
        status: 'Submission Failed',
        details: `Page indicated an error during submission.`,
        screenshotUrl: screenshotAfter
      };
    }

    logCallback(`[${this.name}] Click performed; staged for user confirmation (No explicit success banner detected)`, 'warning', screenshotAfter);
    return {
      status: 'Ready For Confirmation',
      details: `Click performed, but no explicit confirmation banner or URL change was returned by portal.`,
      screenshotUrl: screenshotAfter
    };
  }
}
