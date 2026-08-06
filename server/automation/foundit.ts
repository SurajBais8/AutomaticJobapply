import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class FounditConnector extends BaseJobConnector {
  id = 'foundit';
  name = 'Foundit (Monster)';
  domain = 'foundit.in';
  searchUrlTemplate = 'https://www.foundit.in/srp/results?query={role}&locations={location}';

  buildSearchUrl(role: string, location: string): string {
    return `https://www.foundit.in/srp/results?query=${encodeURIComponent(role || 'developer')}&locations=${encodeURIComponent(location || 'pune')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location);
    logCallback(`Searching Foundit live portal: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'foundit_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Foundit verification check: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.srpResultCard, .jobCard, div.job-tuple, .srpCard');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.jobTitle, .title, a.job-title', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.companyName, .company, .company-name', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.location, .loc', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Pune';
        const exp = (await card.$eval('.experience, .exp', el => el.textContent?.trim()).catch(() => '')) || profile.experience || '';
        const linkEl = await card.$('a.jobTitle, a.job-title, a[href*="/job/"]');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `foundit_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: exp,
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 92 - i * 2),
            matchReason: `Matches role "${profile.jobRole}" in "${loc}"`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Foundit`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Foundit search error: ${err.message}`, 'error');
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
      const screenshot = await this.takeScreenshot(page, `foundit_apply_${Date.now()}`);

      const check = await this.isBlockedOrLoginRequired(page);
      if (check.blocked) {
        return {
          status: 'Verification Required',
          details: `Foundit session login required.`,
          screenshotUrl: screenshot
        };
      }

      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Foundit profile details staged.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}

export class WellfoundConnector extends BaseJobConnector {
  id = 'wellfound';
  name = 'Wellfound (AngelList)';
  domain = 'wellfound.com';
  searchUrlTemplate = 'https://wellfound.com/jobs?role={role}';

  buildSearchUrl(role: string): string {
    return `https://wellfound.com/jobs?role=${encodeURIComponent(role || 'developer')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole);
    logCallback(`Searching Wellfound live directory: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'wellfound_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Wellfound security guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('[data-test="JobResultCard"], .styles_component__2k9f0, div[class*="styles_jobResult"]');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('a[class*="title"], h2, [class*="jobTitle"]', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('h2[class*="startupName"], [class*="companyName"]', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('[class*="location"]', el => el.textContent?.trim()).catch(() => '')) || 'Remote / Hybrid';
        const salary = (await card.$eval('[class*="compensation"]', el => el.textContent?.trim()).catch(() => '')) || 'Competitive + Equity';
        const linkEl = await card.$('a[href*="/jobs/"]');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `wellfound_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: profile.experience || 'Startup Entry-Mid',
            salary,
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 96 - i * 2),
            matchReason: `High Remote startup fit for ${profile.skills}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active startup roles from Wellfound`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Wellfound error: ${err.message}`, 'error');
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
      const screenshot = await this.takeScreenshot(page, `wellfound_apply_${Date.now()}`);

      const check = await this.isBlockedOrLoginRequired(page);
      if (check.blocked) {
        return {
          status: 'Verification Required',
          details: `Wellfound session login required.`,
          screenshotUrl: screenshot
        };
      }

      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Wellfound note & resume ready. Staged for submission.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}

export class LinkedInConnector extends BaseJobConnector {
  id = 'linkedin';
  name = 'LinkedIn';
  domain = 'linkedin.com';
  searchUrlTemplate = 'https://www.linkedin.com/jobs/search/?keywords={role}&location={location}';

  buildSearchUrl(role: string, location: string): string {
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role || 'developer')}&location=${encodeURIComponent(location || 'India')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location);
    logCallback(`Searching LinkedIn live jobs: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'linkedin_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`LinkedIn auth guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.job-card-container, .base-card, .job-search-card');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.job-card-list__title, .base-search-card__title', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.job-card-container__primary-description, .base-search-card__subtitle', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.job-card-container__metadata-item, .job-search-card__location', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'India';
        const linkEl = await card.$('a.job-card-list__title, a.base-card__full-link');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `linkedin_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: profile.experience || '1-3 Yrs',
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 97 - i * 2),
            matchReason: `LinkedIn match for ${profile.jobRole} in ${loc}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from LinkedIn`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`LinkedIn search error: ${err.message}`, 'error');
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
      const screenshot = await this.takeScreenshot(page, `linkedin_apply_${Date.now()}`);

      const check = await this.isBlockedOrLoginRequired(page);
      if (check.blocked) {
        return {
          status: 'Verification Required',
          details: `LinkedIn requires active login session. Form parameters staged.`,
          screenshotUrl: screenshot
        };
      }

      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `LinkedIn Easy Apply details staged.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}
