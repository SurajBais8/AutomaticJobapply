import { Page, BrowserContext } from 'playwright';
import { sessionManager } from './sessionManager.js';
import { saveCredential, getCredentialRaw } from '../db.js';
import { decryptPassword } from './encryptionService.js';

export interface LoginResult {
  success: boolean;
  requiresOtp?: boolean;
  requiresCaptcha?: boolean;
  message: string;
}

export class LoginManager {
  private loginUrls: Record<string, { url: string; emailSel: string; passSel: string; submitSel: string }> = {
    naukri: {
      url: 'https://www.naukri.com/nlogin/login',
      emailSel: '#usernameField, input[placeholder*="Email" i]',
      passSel: '#passwordField, input[placeholder*="Password" i]',
      submitSel: 'button[type="submit"], .waves-effect'
    },
    indeed: {
      url: 'https://secure.indeed.com/account/login',
      emailSel: 'input[type="email"], #ifl-InputOption-11',
      passSel: 'input[type="password"], #ifl-InputOption-17',
      submitSel: 'button[type="submit"]'
    },
    internshala: {
      url: 'https://internshala.com/login/user',
      emailSel: '#email',
      passSel: '#password',
      submitSel: '#login_submit'
    },
    unstop: {
      url: 'https://unstop.com/login',
      emailSel: 'input[name="email"], input[type="email"]',
      passSel: 'input[type="password"]',
      submitSel: 'button[type="submit"]'
    },
    freshersworld: {
      url: 'https://www.freshersworld.com/user/login',
      emailSel: '#email, input[name="email"]',
      passSel: '#password, input[name="pass"]',
      submitSel: 'button[type="submit"], #edit-submit'
    },
    timesjobs: {
      url: 'https://www.timesjobs.com/candidate/login.html',
      emailSel: '#j_username, input[name="j_username"]',
      passSel: '#j_password, input[name="j_password"]',
      submitSel: 'input[type="submit"], button[type="submit"]'
    },
    instahyre: {
      url: 'https://www.instahyre.com/login/',
      emailSel: 'input[name="email"]',
      passSel: 'input[name="password"]',
      submitSel: 'button[type="submit"]'
    },
    wellfound: {
      url: 'https://wellfound.com/login',
      emailSel: 'input[name="user[email]"], input[type="email"]',
      passSel: 'input[name="user[password]"], input[type="password"]',
      submitSel: 'input[type="submit"], button[type="submit"]'
    },
    foundit: {
      url: 'https://www.foundit.in/seeker/login',
      emailSel: 'input[type="email"]',
      passSel: 'input[type="password"]',
      submitSel: 'button[type="submit"]'
    },
    linkedin: {
      url: 'https://www.linkedin.com/login',
      emailSel: '#username',
      passSel: '#password',
      submitSel: 'button[type="submit"]'
    }
  };

  public async performLogin(
    websiteId: string,
    context: BrowserContext,
    page: Page,
    logCallback: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  ): Promise<LoginResult> {
    const credRaw = await getCredentialRaw(websiteId);
    if (!credRaw) {
      logCallback(`No stored credentials found for ${websiteId}`, 'warning');
      return { success: false, message: 'No stored credentials' };
    }

    const password = decryptPassword(credRaw.encryptedPassword);
    if (!credRaw.email || !password) {
      logCallback(`Incomplete credentials for ${websiteId}`, 'error');
      return { success: false, message: 'Email and password required' };
    }

    const targetConfig = this.loginUrls[websiteId.toLowerCase()];
    if (!targetConfig) {
      logCallback(`No automated login configuration for ${websiteId}`, 'warning');
      return { success: false, message: 'Unsupported login portal' };
    }

    logCallback(`Initiating automated login flow for ${credRaw.websiteName}...`, 'info');

    try {
      await page.goto(targetConfig.url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const pageContent = (await page.content().catch(() => '')).toLowerCase();

      // Check for CAPTCHA immediately
      if (pageContent.includes('captcha') || pageContent.includes('verify you are human') || pageContent.includes('cf-challenge')) {
        logCallback(`CAPTCHA Required on ${credRaw.websiteName}. Please complete CAPTCHA manually.`, 'warning');
        return { success: false, requiresCaptcha: true, message: 'CAPTCHA Required' };
      }

      // Check for OTP prompt
      if (pageContent.includes('otp') || pageContent.includes('one time password') || pageContent.includes('verification code')) {
        logCallback(`OTP Required on ${credRaw.websiteName}. Please enter OTP manually.`, 'warning');
        return { success: false, requiresOtp: true, message: 'OTP Required' };
      }

      // Try filling email
      const emailField = await page.$(targetConfig.emailSel);
      if (emailField) {
        await page.fill(targetConfig.emailSel, credRaw.email).catch(() => {});
      }

      // Try filling password
      const passField = await page.$(targetConfig.passSel);
      if (passField) {
        await page.fill(targetConfig.passSel, password).catch(() => {});
      }

      // Submit
      const submitBtn = await page.$(targetConfig.submitSel);
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
          page.click(targetConfig.submitSel).catch(() => {})
        ]);
      }

      await page.waitForTimeout(2000);

      // Post-login checks for OTP or CAPTCHA
      const postContent = (await page.content().catch(() => '')).toLowerCase();

      if (postContent.includes('otp') || postContent.includes('verification code') || postContent.includes('2fa')) {
        logCallback(`OTP Required on ${credRaw.websiteName} post-submission. Please enter OTP manually.`, 'warning');
        return { success: false, requiresOtp: true, message: 'OTP Required' };
      }

      if (postContent.includes('captcha') || postContent.includes('verify you are human')) {
        logCallback(`CAPTCHA Required on ${credRaw.websiteName}. Please complete CAPTCHA manually.`, 'warning');
        return { success: false, requiresCaptcha: true, message: 'CAPTCHA Required' };
      }

      // Save storageState session if successful
      if (credRaw.rememberMe) {
        await sessionManager.saveSession(context, websiteId);
      }

      // Update credential status in DB
      await saveCredential({
        id: credRaw.id,
        websiteName: credRaw.websiteName,
        email: credRaw.email,
        encryptedPassword: credRaw.encryptedPassword,
        rememberMe: credRaw.rememberMe,
        status: 'Connected',
        lastLoginTime: new Date().toISOString()
      });

      logCallback(`Login Success for ${credRaw.websiteName}! Session saved.`, 'success');
      return { success: true, message: 'Login Success' };
    } catch (err: any) {
      logCallback(`Login Failed for ${credRaw.websiteName}: ${err.message}`, 'error');
      await saveCredential({
        id: credRaw.id,
        websiteName: credRaw.websiteName,
        email: credRaw.email,
        encryptedPassword: credRaw.encryptedPassword,
        rememberMe: credRaw.rememberMe,
        status: 'Expired',
        lastLoginTime: credRaw.status
      });
      return { success: false, message: `Login Failed: ${err.message}` };
    }
  }
}

export const loginManager = new LoginManager();
