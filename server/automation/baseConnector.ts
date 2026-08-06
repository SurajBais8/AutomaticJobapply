import { BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { Job, UserProfile, ResumeFile, ApplicationStatus } from '../../src/types/index.js';
import { loginManager } from '../services/loginManager.js';
import { isAlreadyApplied } from '../db.js';

export interface ApplyResult {
  status: ApplicationStatus;
  details: string;
  screenshotUrl?: string;
  error?: string;
}

export interface SelectorConfig {
  applyButtons?: string[];
  searchInputs?: {
    keyword?: string;
    location?: string;
    experience?: string;
    submit?: string;
  };
  successBanners?: string[];
}

export abstract class BaseJobConnector {
  abstract id: string;
  abstract name: string;
  abstract domain: string;
  abstract searchUrlTemplate: string;

  protected SCREENSHOT_DIR = path.join(process.cwd(), 'playwright', 'screenshots');
  protected SELECTORS_DIR = path.join(process.cwd(), 'config', 'selectors');
  protected selectorConfig: SelectorConfig = {};
  protected commonSelectors: any = {};

  constructor() {
    if (!fs.existsSync(this.SCREENSHOT_DIR)) {
      fs.mkdirSync(this.SCREENSHOT_DIR, { recursive: true });
    }
    this.loadSelectorConfig();
  }

  // Load dynamic selectors from config/selectors/*.json
  protected loadSelectorConfig() {
    try {
      const commonPath = path.join(this.SELECTORS_DIR, 'common.json');
      if (fs.existsSync(commonPath)) {
        this.commonSelectors = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
      }

      const sitePath = path.join(this.SELECTORS_DIR, `${this.id}.json`);
      if (fs.existsSync(sitePath)) {
        this.selectorConfig = JSON.parse(fs.readFileSync(sitePath, 'utf-8'));
      }
    } catch (err) {
      console.error(`Error loading selector configs for ${this.id}:`, err);
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
      await this.handleScreeningQuestions(page, profile, logCallback);
      logCallback(`Filled profile inputs and screening questions on ${this.name}`, 'info');
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

  // Standard wrapper with 3 retries and exponential backoff
  public async apply(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    // Duplicate check before execution
    const alreadyDone = await isAlreadyApplied(job.company, job.role, job.sourceWebsite);
    if (alreadyDone) {
      const ss = await this.takeScreenshot(page, `${this.id}_duplicate`);
      logCallback(`[${this.name}] Skipping ${job.company} - ${job.role}: Record exists in local database as Already Applied.`, 'info', ss);
      return {
        status: 'Already Applied',
        details: `Duplicate check: ${job.company} (${job.role}) was previously applied to.`,
        screenshotUrl: ss
      };
    }

    let attempts = 0;
    let lastError = '';
    const maxRetries = 3;

    while (attempts < maxRetries) {
      attempts++;
      try {
        if (attempts > 1) {
          logCallback(`[Retry Engine] Exponential backoff retry ${attempts}/${maxRetries} for ${job.company}...`, 'warning');
          await page.waitForTimeout(2000 * Math.pow(2, attempts - 1));
        }

        const res = await this.applyJob(page, job, profile, resume, logCallback);
        if (res.status !== 'Submission Failed' && res.status !== 'Failed') {
          return res;
        }
        lastError = res.details || res.error || 'Unknown submission error';
      } catch (err: any) {
        lastError = err.message;
      }
    }

    const finalScreenshot = await this.takeScreenshot(page, `${this.id}_failed_retries`);
    return {
      status: 'Submission Failed',
      details: `Failed after ${maxRetries} retries: ${lastError}`,
      screenshotUrl: finalScreenshot,
      error: lastError
    };
  }

  public saveLog(
    logMsg: string,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ) {
    logCallback(`[${this.name}] [${new Date().toLocaleTimeString()}] ${logMsg}`, 'info');
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

  // Automatically dismiss cookie banners, newsletters, and promotional popups
  public async dismissPopups(page: Page) {
    const popupSelectors = [
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button.close',
      'button.modal-close',
      '#close-popup',
      '.cookie-banner button',
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("I Agree")',
      'button:has-text("Got it")',
      'button:has-text("Dismiss")',
      'button:has-text("No thanks")',
      '.sd-close',
      '.crossIcon',
      'span.crossIcon',
      'button:has-text("Close")',
      '.close-btn',
      '#btn-close'
    ];

    for (const sel of popupSelectors) {
      try {
        const el = await page.$(sel);
        if (el && (await el.isVisible().catch(() => false))) {
          await el.click().catch(() => {});
        }
      } catch {}
    }
  }

  // Handle new page / window.open() opening in new tab
  public async handleNewPageOrTab(
    context: BrowserContext,
    triggerAction: () => Promise<void>
  ): Promise<Page | null> {
    try {
      const pagePromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await triggerAction();
      const newTab = await pagePromise;
      if (newTab) {
        await newTab.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await this.dismissPopups(newTab);
        return newTab;
      }
    } catch (err) {
      console.error('Error handling new tab/page event:', err);
    }
    return null;
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

  // Screening Questions Auto-Answering Engine
  protected async handleScreeningQuestions(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<{ handledCount: number; lowConfidence: boolean }> {
    let handledCount = 0;
    let lowConfidence = false;

    try {
      const inputs = await page.$$('input[type="text"], input[type="number"], textarea, select').catch(() => []);

      for (const input of inputs) {
        try {
          const isVisible = await input.isVisible().catch(() => false);
          if (!isVisible) continue;

          const val = await input.inputValue().catch(() => '');
          if (val && val.trim().length > 0) continue; // Already filled

          const id = (await input.getAttribute('id').catch(() => '')) || '';
          const name = (await input.getAttribute('name').catch(() => '')) || '';
          const placeholder = (await input.getAttribute('placeholder').catch(() => '')) || '';
          
          let labelText = '';
          if (id) {
            labelText = (await page.$eval(`label[for="${id}"]`, el => el.textContent?.trim()).catch(() => '')) || '';
          }
          if (!labelText) {
            labelText = (await input.evaluate(el => {
              const parent = el.closest('label') || el.closest('.form-group') || el.closest('div');
              return parent ? parent.textContent?.trim() : '';
            }).catch(() => '')) || '';
          }

          const combinedText = `${labelText} ${name} ${placeholder}`.toLowerCase();

          // Answer mappings
          if (combinedText.includes('why should we hire you') || combinedText.includes('why work here') || combinedText.includes('why are you interested')) {
            const answer = `I have extensive experience in ${profile.skills || profile.jobRole} and a strong track record of delivering high-quality engineering solutions efficiently.`;
            await input.fill(answer).catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Why Hire You?"`, 'info');
          } else if (combinedText.includes('tell me about yourself') || combinedText.includes('bio') || combinedText.includes('summary')) {
            const answer = `Passionate ${profile.jobRole || 'Developer'} with ${profile.experience || 'experience'} specializing in ${profile.skills || 'software engineering'}.`;
            await input.fill(answer).catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Tell me about yourself"`, 'info');
          } else if (combinedText.includes('expected ctc') || combinedText.includes('expected salary') || combinedText.includes('desired salary')) {
            const answer = profile.expectedCtc || '8 LPA';
            await input.fill(answer).catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Expected CTC": ${answer}`, 'info');
          } else if (combinedText.includes('current ctc') || combinedText.includes('current salary') || combinedText.includes('present ctc')) {
            const answer = profile.expectedCtc || 'Disclosed on request';
            await input.fill(answer).catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Current CTC"`, 'info');
          } else if (combinedText.includes('notice period') || combinedText.includes('how soon can you join') || combinedText.includes('joining time')) {
            const answer = profile.currentNoticePeriod || 'Immediate / 15 Days';
            await input.fill(answer).catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Notice Period": ${answer}`, 'info');
          } else if (combinedText.includes('visa') || combinedText.includes('sponsorship') || combinedText.includes('work authorization') || combinedText.includes('legally authorized')) {
            await input.fill('Yes / Authorized').catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Work Authorization / Visa"`, 'info');
          } else if (combinedText.includes('relocate') || combinedText.includes('relocation') || combinedText.includes('open to move')) {
            await input.fill('Yes').catch(() => {});
            handledCount++;
            logCallback(`[Screening Engine] Answered "Relocation": Yes`, 'info');
          } else if (combinedText.includes('current company') || combinedText.includes('employer') || combinedText.includes('organization')) {
            await input.fill('Software Engineering Firm').catch(() => {});
            handledCount++;
          } else if (combinedText.includes('designation') || combinedText.includes('title') || combinedText.includes('role')) {
            await input.fill(profile.jobRole || 'Software Engineer').catch(() => {});
            handledCount++;
          } else if (combinedText.includes('qualification') || combinedText.includes('education') || combinedText.includes('degree')) {
            await input.fill('Bachelor of Technology (B.Tech) / Science').catch(() => {});
            handledCount++;
          } else if (combinedText.includes('github')) {
            if (profile.githubUrl) {
              await input.fill(profile.githubUrl).catch(() => {});
              handledCount++;
              logCallback(`[Screening Engine] Filled GitHub URL`, 'info');
            }
          } else if (combinedText.includes('portfolio') || combinedText.includes('website')) {
            if (profile.portfolioUrl) {
              await input.fill(profile.portfolioUrl).catch(() => {});
              handledCount++;
              logCallback(`[Screening Engine] Filled Portfolio URL`, 'info');
            }
          } else if (combinedText.includes('linkedin')) {
            if (profile.linkedinUrl) {
              await input.fill(profile.linkedinUrl).catch(() => {});
              handledCount++;
              logCallback(`[Screening Engine] Filled LinkedIn URL`, 'info');
            }
          } else if (combinedText.includes('experience')) {
            const numericExp = (profile.experience || '1').replace(/[^0-9]/g, '') || '1';
            await input.fill(numericExp).catch(() => {});
            handledCount++;
          }
        } catch {}
      }

      // Handle custom radio buttons (e.g. Immediate Joiner, Relocate, Authorized)
      const radioGroups = await page.$$('input[type="radio"]').catch(() => []);
      for (const radio of radioGroups) {
        try {
          const val = (await radio.getAttribute('value').catch(() => '')) || '';
          if (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true' || val.toLowerCase() === '1') {
            await radio.check().catch(() => {});
          }
        } catch {}
      }
    } catch (err) {
      console.error('Error handling screening questions:', err);
    }

    return { handledCount, lowConfidence };
  }

  // Detect External ATS site redirection
  protected isExternalAtsUrl(url: string): boolean {
    const atsDomains = this.commonSelectors?.atsDomains || [
      'greenhouse.io',
      'lever.co',
      'myworkdayjobs.com',
      'workday.com',
      'ashbyhq.com',
      'smartrecruiters.com',
      'icims.com',
      'successfactors.com',
      'oraclecloud.com',
      'phenompeople.com',
      'jobvite.com',
      'taleo.net',
      'avature.net'
    ];
    const lowerUrl = url.toLowerCase();
    return atsDomains.some((domain: string) => lowerUrl.includes(domain));
  }

  // External ATS Handler
  protected async processExternalAtsPage(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    const atsUrl = page.url();
    logCallback(`[ATS Switch] Detected external ATS site: ${atsUrl}. Switching to ATS auto-fill engine...`, 'info');

    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});

      // Upload resume
      await this.uploadResumeIfSupported(page, resume);

      // Fill common profile fields
      await this.fillCommonFields(page, profile);

      // Fill screening questions
      await this.handleScreeningQuestions(page, profile, logCallback);

      // Multi-step pagination inside ATS
      const nextButtons = this.commonSelectors?.multiStepNextButtons || [
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Save & Continue")',
        'button:has-text("Save and Continue")',
        'button:has-text("Proceed")',
        'button:has-text("Review")'
      ];

      for (let step = 1; step <= 3; step++) {
        let foundNext = false;
        for (const nextSel of nextButtons) {
          const btn = await page.$(nextSel);
          if (btn && (await btn.isVisible().catch(() => false))) {
            logCallback(`[ATS Step ${step}] Clicking next/continue in ATS...`, 'info');
            await btn.click().catch(() => {});
            await page.waitForTimeout(2000);
            await this.fillCommonFields(page, profile);
            await this.handleScreeningQuestions(page, profile, logCallback);
            foundNext = true;
            break;
          }
        }
        if (!foundNext) break;
      }

      // Final submit button in ATS
      const submitButtons = this.commonSelectors?.multiStepSubmitButtons || [
        'button:has-text("Submit Application")',
        'button:has-text("Submit")',
        'button:has-text("Send Application")',
        'button:has-text("Confirm Application")'
      ];

      for (const subSel of submitButtons) {
        const subBtn = await page.$(subSel);
        if (subBtn && (await subBtn.isVisible().catch(() => false))) {
          logCallback(`[ATS Submit] Triggering final ATS submit button...`, 'info');
          await subBtn.click().catch(() => {});
          await page.waitForTimeout(3000);
          break;
        }
      }

      const postScreenshot = await this.takeScreenshot(page, `${this.id}_ats_after`);
      const postUrl = page.url();
      const postContent = (await page.content().catch(() => '')).toLowerCase();

      if (
        postContent.includes('thank you') ||
        postContent.includes('application submitted') ||
        postContent.includes('successfully applied') ||
        postUrl.includes('confirmation') ||
        postUrl.includes('success')
      ) {
        logCallback(`[ATS Success] Application submitted on ATS (${atsUrl})!`, 'success', postScreenshot);
        return {
          status: 'Applied',
          details: `Successfully completed application on external ATS (${atsUrl}).`,
          screenshotUrl: postScreenshot
        };
      }

      return {
        status: 'Ready For Confirmation',
        details: `Form details filled on external ATS portal (${atsUrl}). Manual confirmation required.`,
        screenshotUrl: postScreenshot
      };
    } catch (err: any) {
      const errSs = await this.takeScreenshot(page, `${this.id}_ats_err`);
      return {
        status: 'Submission Failed',
        details: `External ATS error: ${err.message}`,
        screenshotUrl: errSs,
        error: err.message
      };
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

    // Check if external ATS site immediately
    if (this.isExternalAtsUrl(initialUrl)) {
      return await this.processExternalAtsPage(page, job, profile, resume, logCallback);
    }

    // Step 1: Checking Login, CAPTCHA, OTP
    let check = await this.isBlockedOrLoginRequired(page);

    // Session Recovery: If logged out, attempt auto re-login
    if (check.blocked && !check.requiresCaptcha && !check.requiresOtp) {
      logCallback(`[Session Recovery] Expired session detected on ${this.name}. Attempting re-authentication...`, 'warning');
      const context = page.context();
      const loginSuccess = await this.login(context, page, logCallback).catch(() => false);
      if (loginSuccess) {
        logCallback(`[Session Recovery] Successfully re-authenticated session on ${this.name}. Resuming job apply...`, 'success');
        await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        check = await this.isBlockedOrLoginRequired(page);
      }
    }

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

    // Step 2: Check if Already Applied on portal
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

    // Step 4: Fill Profile & Screening Questions
    await this.fillCommonFields(page, profile);
    await this.handleScreeningQuestions(page, profile, logCallback);

    // Step 5: Detect Apply Button from dynamic config
    const combinedSelectors = [
      ...(this.selectorConfig.applyButtons || []),
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

    // Step 8: Multi-Step Navigation Loop (Next, Continue, Review, Submit)
    await page.waitForTimeout(2500);

    const multiNextSels = this.commonSelectors?.multiStepNextButtons || [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Save & Continue")',
      'button:has-text("Proceed")',
      'button:has-text("Review")'
    ];

    for (let step = 1; step <= 4; step++) {
      let movedNext = false;
      for (const nextSel of multiNextSels) {
        try {
          const btn = await page.$(nextSel);
          if (btn && (await btn.isVisible().catch(() => false))) {
            logCallback(`[Multi-Step Navigation ${step}] Auto-navigating page via "${nextSel}"...`, 'info');
            await btn.click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await this.fillCommonFields(page, profile);
            await this.handleScreeningQuestions(page, profile, logCallback);
            movedNext = true;
            break;
          }
        } catch {}
      }
      if (!movedNext) break;
    }

    // Final multi-step secondary submit trigger
    const secondarySubmitSels = this.commonSelectors?.multiStepSubmitButtons || [
      'button:has-text("Submit Application")',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Confirm Application")'
    ];
    for (const secSel of secondarySubmitSels) {
      try {
        const secEl = await page.$(secSel);
        if (secEl && (await secEl.isVisible().catch(() => false))) {
          logCallback(`[${this.name}] Clicking secondary submit button...`, 'info');
          await secEl.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(2500);
          break;
        }
      } catch {}
    }

    // Step 9: Take Screenshot AFTER Click
    const screenshotAfter = await this.takeScreenshot(page, `${this.id}_after_apply`);
    logCallback(`[${this.name}] AFTER CLICK: Completed submission. Performing advanced success verification...`, 'info', screenshotAfter);

    // Step 10: Advanced Success Verification
    const finalUrl = page.url();
    const finalContent = (await page.content().catch(() => '')).toLowerCase();

    // Check external ATS redirect post-click
    if (this.isExternalAtsUrl(finalUrl)) {
      return await this.processExternalAtsPage(page, job, profile, resume, logCallback);
    }

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
      finalContent.includes("you've applied") ||
      finalContent.includes('you have applied');

    // Check success banners from selector config
    const configuredBanners = this.selectorConfig.successBanners || [];
    let isConfiguredBannerFound = false;
    for (const bannerSel of configuredBanners) {
      const banner = await page.$(bannerSel).catch(() => null);
      if (banner && (await banner.isVisible().catch(() => false))) {
        isConfiguredBannerFound = true;
        break;
      }
    }

    // Check disabled button with "Applied" status text
    const isDisabledApplied = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      return btns.some(b => {
        const txt = (b.textContent || '').toLowerCase();
        return (txt.includes('applied') || txt.includes('application submitted')) && (b.hasAttribute('disabled') || b.classList.contains('disabled'));
      });
    }).catch(() => false);

    if (isUrlSuccess || isTextSuccess || isConfiguredBannerFound || isDisabledApplied) {
      logCallback(`[${this.name}] CONFIRMED: Advanced success signals verified!`, 'success', screenshotAfter);
      return {
        status: 'Applied',
        details: `Application confirmed submitted for ${job.company} (${job.role}).`,
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
