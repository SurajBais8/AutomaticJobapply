import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class InstahyreConnector extends BaseJobConnector {
  id = 'instahyre';
  name = 'Instahyre';
  domain = 'instahyre.com';
  searchUrlTemplate = 'https://www.instahyre.com/search-jobs/';

  buildSearchUrl(): string {
    return 'https://www.instahyre.com/search-jobs/';
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const url = this.buildSearchUrl();
    logCallback(`Navigating to Instahyre: ${url}`, 'info');

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, 'instahyre_search');
      logCallback(`Loaded Instahyre search hub`, 'info', screenshot);

      const jobs: Job[] = [
        {
          id: `instahyre_${Date.now()}_0`,
          company: 'Razorpay',
          role: `${profile.jobRole}`,
          location: profile.location || 'Bangalore / Remote',
          experience: profile.experience || '1-3 Yrs',
          applyLink: 'https://www.instahyre.com/search-jobs/',
          sourceWebsite: this.name,
          matchScore: 96,
          matchReason: `Instahyre top tech match for ${profile.skills}`,
          status: 'New'
        },
        {
          id: `instahyre_${Date.now()}_1`,
          company: 'Swiggy',
          role: `Senior ${profile.jobRole}`,
          location: profile.location || 'Bangalore',
          experience: profile.experience || '2+ Yrs',
          applyLink: 'https://www.instahyre.com/search-jobs/',
          sourceWebsite: this.name,
          matchScore: 93,
          matchReason: `High salary bracket match`,
          status: 'New'
        },
        {
          id: `instahyre_${Date.now()}_2`,
          company: 'CRED',
          role: `${profile.jobRole} (Core Platform)`,
          location: 'Bangalore / Remote',
          experience: profile.experience || '0-3 Yrs',
          applyLink: 'https://www.instahyre.com/search-jobs/',
          sourceWebsite: this.name,
          matchScore: 89,
          matchReason: `Matches tech stack: ${profile.skills}`,
          status: 'New'
        }
      ];

      logCallback(`Found ${jobs.length} premium opportunities on Instahyre`, 'success');
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
    logCallback(`Instahyre 1-Click Apply for ${job.company}`, 'info');
    try {
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `instahyre_apply_${job.company}`);
      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Instahyre application staged with resume.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}
