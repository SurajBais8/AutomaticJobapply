import fs from 'fs';
import path from 'path';
import { BrowserContext } from 'playwright';

const SESSIONS_DIR = path.join(process.cwd(), 'playwright', 'sessions');

export class SessionManager {
  constructor() {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  public getSessionPath(websiteId: string): string {
    const cleanId = websiteId.toLowerCase().replace(/[^a-z0-9]/g, '');
    return path.join(SESSIONS_DIR, `${cleanId}.json`);
  }

  public sessionExists(websiteId: string): boolean {
    return this.hasValidSession(websiteId);
  }

  public hasValidSession(websiteId: string): boolean {
    const sessionPath = this.getSessionPath(websiteId);
    if (!fs.existsSync(sessionPath)) return false;

    try {
      const stats = fs.statSync(sessionPath);
      // If file exists and size > 20 bytes and modified within last 14 days
      const daysOld = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      return stats.size > 20 && daysOld < 14;
    } catch {
      return false;
    }
  }

  public async saveSession(context: BrowserContext, websiteId: string): Promise<boolean> {
    try {
      const sessionPath = this.getSessionPath(websiteId);
      const state = await context.storageState();
      fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2), 'utf8');
      console.log(`Saved session for ${websiteId} to ${sessionPath}`);
      return true;
    } catch (err) {
      console.error(`Failed to save session for ${websiteId}:`, err);
      return false;
    }
  }

  public async loadSession(context: BrowserContext, websiteId: string): Promise<boolean> {
    const sessionPath = this.getSessionPath(websiteId);
    if (!this.hasValidSession(websiteId)) return false;

    try {
      const stateData = fs.readFileSync(sessionPath, 'utf8');
      const state = JSON.parse(stateData);
      
      if (state.cookies && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
      }
      return true;
    } catch (err) {
      console.error(`Failed to load session for ${websiteId}:`, err);
      return false;
    }
  }

  public deleteSession(websiteId: string): boolean {
    try {
      const sessionPath = this.getSessionPath(websiteId);
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to delete session for ${websiteId}:`, err);
      return false;
    }
  }

  public getSessionStatus(websiteId: string): 'Connected' | 'Expired' | 'Not Logged In' {
    const sessionPath = this.getSessionPath(websiteId);
    if (!fs.existsSync(sessionPath)) return 'Not Logged In';

    try {
      const stats = fs.statSync(sessionPath);
      const daysOld = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (stats.size < 20 || daysOld >= 14) {
        return 'Expired';
      }
      return 'Connected';
    } catch {
      return 'Not Logged In';
    }
  }
}

export const sessionManager = new SessionManager();
