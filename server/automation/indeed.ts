import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class IndeedConnector extends BaseJobConnector {
  id = 'indeed';
  name = 'Indeed';
  domain = 'indeed.com';
  searchUrlTemplate = 'https://www.indeed.com/jobs?q={role}&l={location}';

  buildSearchUrl(role: string, location: string, experience: string = ''): string {
    return `https://www.indeed.com/jobs?q=${encodeURIComponent(role || 'developer')}&l=${encodeURIComponent(location || 'pune')}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location, profile.experience);
    logCallback(`Searching Indeed live portal: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'indeed_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Indeed verification guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      const jobCards = await page.$$('.job_seen_beacon, .resultContent, td.resultContent, div.cardOutline');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('h2.jobTitle, a.jtitle, span[id*="jobTitle"]', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('[data-testid="company-name"], .companyName, .company', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('[data-testid="text-location"], .companyLocation, .location', el => el.textContent?.trim()).catch(() => '')) || profile.location || 'Remote';
        const salary = (await card.$eval('.salary-snippet-container, .attribute_snippet', el => el.textContent?.trim()).catch(() => '')) || 'Competitive';
        const linkEl = await card.$('a.jtitle, a[id*="job_"], h2.jobTitle a');
        const href = linkEl ? await page.evaluate(el => (el as HTMLAnchorElement).href, linkEl).catch(() => '') : targetUrl;

        if (title && company) {
          jobs.push({
            id: `indeed_${Date.now()}_${i}`,
            company,
            role: title.replace('new', '').trim(),
            location: loc,
            experience: profile.experience || 'Entry-Mid Level',
            salary,
            applyLink: href || targetUrl,
            sourceWebsite: this.name,
            datePosted: 'Active',
            matchScore: Math.max(70, 94 - i * 2),
            matchReason: `Matches role "${profile.jobRole}" and location "${loc}"`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Indeed`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Indeed search error: ${err.message}`, 'error');
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
    logCallback(`[Indeed] Navigating to job opening for ${job.company}...`, 'info');

    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      return await this.executeStatefulApplyProcess(page, job, profile, resume, logCallback, [
        'button:has-text("Apply now")',
        'button:has-text("Easily apply")',
        '#indeedApplyButton',
        'button.indeed-apply-button'
      ]);
    } catch (err: any) {
      return {
        status: 'Submission Failed',
        details: `Indeed apply error: ${err.message}`,
        error: err.message
      };
    }
  }
}
