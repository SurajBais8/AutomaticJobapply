export class JobAgeParser {
  /**
   * Parses a date string like "2 hours ago", "Yesterday", "3 days ago", "1 week ago", "15d"
   * and converts it into the estimated number of days.
   */
  public static parseToDays(rawDateStr: string): number {
    if (!rawDateStr) return 0;

    const text = rawDateStr.toLowerCase().trim();

    if (text.includes('today') || text.includes('just now') || text.includes('hour') || text.includes('minute') || text.includes('moment')) {
      return 0;
    }

    if (text.includes('yesterday')) {
      return 1;
    }

    // Match patterns like "3 days ago", "3d ago", "3 days", "3d"
    const daysMatch = text.match(/(\d+)\s*(day|d)/);
    if (daysMatch) {
      return parseInt(daysMatch[1], 10);
    }

    // Match patterns like "2 weeks ago", "2w", "1 week"
    const weeksMatch = text.match(/(\d+)\s*(week|w)/);
    if (weeksMatch) {
      return parseInt(weeksMatch[1], 10) * 7;
    }

    // Match patterns like "1 month ago", "2 months", "1m"
    const monthsMatch = text.match(/(\d+)\s*(month|m)/);
    if (monthsMatch) {
      return parseInt(monthsMatch[1], 10) * 30;
    }

    // Match patterns like "1 year ago", "1y"
    const yearsMatch = text.match(/(\d+)\s*(year|y)/);
    if (yearsMatch) {
      return parseInt(yearsMatch[1], 10) * 365;
    }

    if (text.includes('active') || text.includes('recently') || text.includes('new')) {
      return 0; // Default to recent
    }

    return 0; // Default fallback
  }

  /**
   * Returns true if the job was posted within the allowed maximum days (e.g. 7 days).
   */
  public static isWithinDays(rawDateStr: string, maxDays: number = 7): boolean {
    const days = this.parseToDays(rawDateStr);
    return days <= maxDays;
  }
}
