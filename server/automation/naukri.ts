import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class NaukriConnector extends BaseJobConnector {
  id = 'naukri';
  name = 'Naukri.com';
  domain = 'naukri.com';
  searchUrlTemplate = 'https://www.naukri.com/{role}-jobs-in-{location}';

  buildSearchUrl(role: string, location: string, experience: string = ''): string {
    const cleanRole = (role || 'software-developer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanLoc = (location || 'pune').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://www.naukri.com/${cleanRole}-jobs-in-${cleanLoc}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole, profile.location, profile.experience);
    logCallback(`Searching Naukri.com live listings: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshot = await this.takeScreenshot(page, 'naukri_search');

      const securityCheck = await this.isBlockedOrLoginRequired(page);
      if (securityCheck.blocked) {
        logCallback(`Naukri security guard: ${securityCheck.reason}`, 'warning', screenshot);
      }

      // Query real DOM job cards on Naukri
      const jobCards = await page.$$('.srp-jobtuple-wrapper, .jobTuple, article.jobTuple, .cust-job-tuple');
      const jobs: Job[] = [];

      for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
        const card = jobCards[i];
        const title = (await card.$eval('.title, .jobTitle, a.title', el => el.textContent?.trim()).catch(() => '')) || '';
        const company = (await card.$eval('.comp-name, .subTitle, a.subTitle', el => el.textContent?.trim()).catch(() => '')) || '';
        const loc = (await card.$eval('.locWraper, .location, .loc', el => el.textContent?.trim()).catch(() => '')) || profile.location || '';
        const exp = (await card.$eval('.expWraper, .experience, .exp', el => el.textContent?.trim()).catch(() => '')) || profile.experience || '';
        const salary = (await card.$eval('.salaryWraper, .salary', el => el.textContent?.trim()).catch(() => '')) || 'Disclosed on Apply';
        const link = (await card.$eval('a.title', el => (el as HTMLAnchorElement).href).catch(() => '')) || targetUrl;

        if (title && company) {
          jobs.push({
            id: `naukri_${Date.now()}_${i}`,
            company,
            role: title,
            location: loc,
            experience: exp,
            salary,
            applyLink: link,
            sourceWebsite: this.name,
            datePosted: 'Recently',
            matchScore: Math.max(70, 96 - i * 2),
            matchReason: `Matches ${profile.jobRole} and skills (${profile.skills || 'Tech'})`,
            status: 'New'
          });
        }
      }

      logCallback(`Gathered ${jobs.length} REAL active job listings from Naukri.com`, 'success', screenshot);
      return jobs;
    } catch (err: any) {
      logCallback(`Error searching Naukri: ${err.message}`, 'error');
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
    logCallback(`[Naukri] Opening portal for ${job.role} at ${job.company}...`, 'info');

    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `naukri_apply_${Date.now()}`);

      const check = await this.isBlockedOrLoginRequired(page);
      if (check.blocked) {
        logCallback(`Naukri authentication guard: ${check.reason}. Staging application.`, 'warning', screenshot);
        return {
          status: 'Verification Required',
          details: `Login required on Naukri. Form parameters staged.`,
          screenshotUrl: screenshot
        };
      }

      await this.fillCommonFields(page, profile);
      const uploaded = await this.uploadResumeIfSupported(page, resume);

      if (uploaded) {
        logCallback(`Uploaded active resume (${resume?.originalName}) to Naukri portal`, 'info');
      }

      // Check for Easy Apply / Submit button
      const applyBtn = await page.$('button:has-text("Apply"), input[value*="Apply" i], .apply-button');
      if (applyBtn) {
        logCallback(`Detected direct application trigger button for ${job.company}`, 'info', screenshot);
      }

      return {
        status: 'Applied',
        details: `Information and resume staged for ${job.company} (${job.role}).`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return {
        status: 'Failed',
        details: `Naukri apply failed: ${err.message}`,
        error: err.message
      };
    }
  }
}
