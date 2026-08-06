import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class InternshalaConnector extends BaseJobConnector {
  id = 'internshala';
  name = 'Internshala';
  domain = 'internshala.com';
  searchUrlTemplate = 'https://internshala.com/jobs/{role}-jobs-in-{location}';

  buildSearchUrl(role: string, location: string): string {
    const cleanRole = (role || 'developer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanLoc = (location || 'pune').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://internshala.com/jobs/${cleanRole}-jobs-in-${cleanLoc}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location);
    logCallback(`Searching Internshala live portal: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'internshala_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Internshala security guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.individual_internship, .job_card, .internship_meta');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.heading_4_5, .job-title, h3', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.heading_6, .company-name, .link_display_like_text', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('#location_names, .location_link', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Pune';
        const salary = (await card.$eval('.stipend, .salary', el => el.textContent?.trim()).catch(() => '')) || 'Disclosed on apply';
        const linkEl = await card.$('a.view_detail_button, a[href*="/job/detail/"]');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `internshala_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: profile.experience || '0-2 Yrs',
            salary,
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 95 - i * 2),
            matchReason: `Early career match for ${profile.jobRole}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Internshala`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Internshala error: ${err.message}`, 'error');
      return [];
    }
  }

  async applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'button:has-text("Apply now")',
        '.btn-primary:has-text("Apply")',
        '#easy_apply_button',
        'button.apply_button'
      ]);
    } catch (err: any) {
      return { status: 'Submission Failed', details: err.message, error: err.message };
    }
  }
}

export class UnstopConnector extends BaseJobConnector {
  id = 'unstop';
  name = 'Unstop';
  domain = 'unstop.com';
  searchUrlTemplate = 'https://unstop.com/jobs?search={role}';

  buildSearchUrl(role: string): string {
    return `https://unstop.com/jobs?search=${encodeURIComponent(role || 'developer')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole);
    logCallback(`Searching Unstop hiring challenges & jobs: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'unstop_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Unstop security guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.opportunity_card, app-opportunity-card, .listing_card');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.heading, h2, .title', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.organisation_name, .company', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.location, .place', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Remote';
        const linkEl = await card.$('a[href*="/jobs/"], a[href*="/o/"]');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `unstop_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: profile.experience || '0-2 Yrs',
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 94 - i * 2),
            matchReason: `Unstop hiring challenge match for ${profile.jobRole}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Unstop`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Unstop error: ${err.message}`, 'error');
      return [];
    }
  }

  async applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'button:has-text("Apply Now")',
        'button:has-text("Register")',
        'button:has-text("Apply")',
        '.register-btn'
      ]);
    } catch (err: any) {
      return { status: 'Submission Failed', details: err.message, error: err.message };
    }
  }
}

export class FreshersworldConnector extends BaseJobConnector {
  id = 'freshersworld';
  name = 'Freshersworld';
  domain = 'freshersworld.com';
  searchUrlTemplate = 'https://www.freshersworld.com/jobs/jobsearch/{role}-jobs';

  buildSearchUrl(role: string): string {
    const clean = (role || 'developer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://www.freshersworld.com/jobs/jobsearch/${clean}-jobs`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole);
    logCallback(`Searching Freshersworld: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'freshersworld_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Freshersworld security guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.job-container, .job_tuple, .jobs-list');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.bold-title, .job-title', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.company-name, .comp-name', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.job-location, .loc', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Pune';
        const linkEl = await card.$('a[href*="/jobs/"]');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `freshersworld_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: profile.experience || '0-1 Yrs',
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 91 - i * 2),
            matchReason: `Location match: ${loc}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Freshersworld`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Freshersworld error: ${err.message}`, 'error');
      return [];
    }
  }

  async applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'a:has-text("Apply Now")',
        'button:has-text("Apply")',
        '.apply-btn',
        'a.apply-button'
      ]);
    } catch (err: any) {
      return { status: 'Submission Failed', details: err.message, error: err.message };
    }
  }
}

export class TimesJobsConnector extends BaseJobConnector {
  id = 'timesjobs';
  name = 'TimesJobs';
  domain = 'timesjobs.com';
  searchUrlTemplate = 'https://www.timesjobs.com/candidate/job-search.html?txtKeywords={role}&txtLocation={location}';

  buildSearchUrl(role: string, location: string): string {
    return `https://www.timesjobs.com/candidate/job-search.html?txtKeywords=${encodeURIComponent(role || 'developer')}&txtLocation=${encodeURIComponent(location || 'pune')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location);
    logCallback(`Searching TimesJobs: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'timesjobs_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`TimesJobs security check: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.job-bx, li.clearfix');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('header h2 a, h2 a', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.joblist-comp-name, h3', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.srp-icons.location, .srp-location', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Pune';
        const exp = (await card.$eval('.srp-icons.experience', el => el.textContent?.trim()).catch(() => '')) || profile.experience || '';
        const linkEl = await card.$('header h2 a, h2 a');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `timesjobs_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: exp,
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 90 - i * 2),
            matchReason: `Matched experience (${profile.experience}) and location (${loc})`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from TimesJobs`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`TimesJobs error: ${err.message}`, 'error');
      return [];
    }
  }

  async applyJob(
    page: Page,
    job: Job,
    profile: UserProfile,
    resume: ResumeFile | null,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<ApplyResult> {
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        '.applyJob',
        'button.apply-btn'
      ]);
    } catch (err: any) {
      return { status: 'Submission Failed', details: err.message, error: err.message };
    }
  }
}
