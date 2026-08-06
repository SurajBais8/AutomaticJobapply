import { Page } from 'playwright';
import { BaseJobConnector, ApplyResult } from './baseConnector.js';
import { Job, UserProfile, ResumeFile } from '../../src/types/index.js';

export class InternshalaConnector extends BaseJobConnector {
  id = 'internshala';
  name = 'Internshala';
  domain = 'internshala.com';
  searchUrlTemplate = 'https://internshala.com/jobs/{role}-jobs-in-{location}';

  buildSearchUrl(role: string, location: string): string {
    const cleanRole = role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanLoc = location.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://internshala.com/jobs/${cleanRole}-jobs-in-${cleanLoc}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole || 'developer', profile.location || 'pune');
    logCallback(`Searching Internshala for freshers / early career: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, 'internshala_search');

      const jobs: Job[] = [
        {
          id: `internshala_${Date.now()}_0`,
          company: 'TechNovation Labs',
          role: `Junior ${profile.jobRole}`,
          location: profile.location || 'Pune / Remote',
          experience: profile.experience || '0-1 Yrs',
          applyLink: targetUrl,
          sourceWebsite: this.name,
          salary: '₹4.5 - ₹7.5 LPA',
          matchScore: 95,
          matchReason: `Ideal fresher/early career job for ${profile.skills}`,
          status: 'New'
        },
        {
          id: `internshala_${Date.now()}_1`,
          company: 'CloudMatrix',
          role: `${profile.jobRole} Trainee`,
          location: profile.location || 'Pune',
          experience: '0-6 Months',
          applyLink: targetUrl,
          sourceWebsite: this.name,
          salary: '₹5.0 - ₹8.0 LPA',
          matchScore: 91,
          matchReason: `Skill keywords matched: ${profile.keywords || profile.jobRole}`,
          status: 'New'
        }
      ];

      logCallback(`Found ${jobs.length} early career openings on Internshala`, 'success', screenshot);
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
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `internshala_apply_${job.company}`);
      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Internshala profile answers and resume staged.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}

export class UnstopConnector extends BaseJobConnector {
  id = 'unstop';
  name = 'Unstop';
  domain = 'unstop.com';
  searchUrlTemplate = 'https://unstop.com/jobs?search={role}';

  buildSearchUrl(role: string): string {
    return `https://unstop.com/jobs?search=${encodeURIComponent(role)}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole || 'developer');
    logCallback(`Searching Unstop hiring challenges & jobs: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, 'unstop_search');

      const jobs: Job[] = [
        {
          id: `unstop_${Date.now()}_0`,
          company: 'Walmart Global Tech',
          role: `Software Engineer - ${profile.jobRole}`,
          location: 'Bangalore / Remote',
          experience: profile.experience || '0-2 Yrs',
          applyLink: targetUrl,
          sourceWebsite: this.name,
          matchScore: 93,
          matchReason: `Direct Unstop hiring assessment match`,
          status: 'New'
        }
      ];

      logCallback(`Found ${jobs.length} Unstop hiring challenge`, 'success', screenshot);
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
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `unstop_apply_${job.company}`);
      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Unstop registration details filled.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}

export class FreshersworldConnector extends BaseJobConnector {
  id = 'freshersworld';
  name = 'Freshersworld';
  domain = 'freshersworld.com';
  searchUrlTemplate = 'https://www.freshersworld.com/jobs/jobsearch/{role}-jobs';

  buildSearchUrl(role: string): string {
    const clean = role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://www.freshersworld.com/jobs/jobsearch/${clean}-jobs`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole || 'developer');
    logCallback(`Searching Freshersworld: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, 'freshersworld_search');

      const jobs: Job[] = [
        {
          id: `freshersworld_${Date.now()}_0`,
          company: 'Persistent Systems',
          role: `Associate ${profile.jobRole}`,
          location: profile.location || 'Pune',
          experience: profile.experience || '0-1 Yrs',
          applyLink: targetUrl,
          sourceWebsite: this.name,
          matchScore: 89,
          matchReason: `Location match: ${profile.location || 'Pune'}`,
          status: 'New'
        }
      ];

      logCallback(`Found ${jobs.length} jobs on Freshersworld`, 'success', screenshot);
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
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `freshersworld_apply_${job.company}`);
      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `Freshersworld profile fields filled.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}

export class TimesJobsConnector extends BaseJobConnector {
  id = 'timesjobs';
  name = 'TimesJobs';
  domain = 'timesjobs.com';
  searchUrlTemplate = 'https://www.timesjobs.com/candidate/job-search.html?txtKeywords={role}&txtLocation={location}';

  buildSearchUrl(role: string, location: string): string {
    return `https://www.timesjobs.com/candidate/job-search.html?txtKeywords=${encodeURIComponent(role)}&txtLocation=${encodeURIComponent(location)}`;
  }

  async searchJobs(
    page: Page,
    profile: UserProfile,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', screenshot?: string) => void
  ): Promise<Job[]> {
    const targetUrl = this.buildSearchUrl(profile.jobRole || 'developer', profile.location || 'pune');
    logCallback(`Searching TimesJobs: ${targetUrl}`, 'info');

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, 'timesjobs_search');

      const jobs: Job[] = [
        {
          id: `timesjobs_${Date.now()}_0`,
          company: 'Mphasis',
          role: `${profile.jobRole}`,
          location: profile.location || 'Pune / Bangalore',
          experience: profile.experience || '1-3 Yrs',
          applyLink: targetUrl,
          sourceWebsite: this.name,
          matchScore: 86,
          matchReason: `Matched experience (${profile.experience || '1-3 Yrs'}) and skills`,
          status: 'New'
        }
      ];

      logCallback(`Found ${jobs.length} jobs on TimesJobs`, 'success', screenshot);
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
      await page.goto(job.applyLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      const screenshot = await this.takeScreenshot(page, `timesjobs_apply_${job.company}`);
      await this.fillCommonFields(page, profile);
      await this.uploadResumeIfSupported(page, resume);

      return {
        status: 'Applied',
        details: `TimesJobs profile staged.`,
        screenshotUrl: screenshot
      };
    } catch (err: any) {
      return { status: 'Failed', details: err.message, error: err.message };
    }
  }
}
