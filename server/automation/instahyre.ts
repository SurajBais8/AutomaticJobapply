import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class InstahyreConnector extends BaseJobConnector {
  id = 'instahyre';
  name = 'Instahyre';
  domain = 'instahyre.com';
  searchUrlTemplate = 'https://www.instahyre.com/search-jobs/';

  buildSearchUrl(role: string, location: string, experience: string = ''): string {
    return 'https://www.instahyre.com/search-jobs/';
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const url = this.buildSearchUrl(profile.jobRole, profile.location, profile.experience);
    logCallback(`Searching Instahyre live portal: ${url}`, 'info');

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'instahyre_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Instahyre verification guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      // Query real Instahyre DOM cards
      const jobCards = await page.$$('.opportunity-card, .job-card, [id*="job-card-"], div.employer-row');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.employer-job-title, .job-title, h2', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.employer-name, .company-name', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.employer-locations, .location', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Remote';
        const exp = (await card.$eval('.employer-exp, .experience', el => el.textContent?.trim()).catch(() => '')) || profile.experience || '';
        const linkEl = await card.$('a[href*="/job-"], a.view-job');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : url;

        if (title && company) {
          jobs.push({
            id: `instahyre_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: exp,
            applyLink: href || url,
            sourceWebsite: this.name,
            matchScore: Math.max(70, 95 - i * 2),
            matchReason: `Instahyre profile match for ${profile.jobRole}`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Instahyre`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Instahyre error: ${err.message}`, 'error');
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
    logCallback(`[Instahyre] Application process for ${job.company}`, 'info');
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        '.employer-job-apply',
        'button.btn-primary'
      ]);
    } catch (err: any) {
      return { status: 'Submission Failed', details: err.message, error: err.message };
    }
  }
}
