export interface ExperienceRange {
  minYears: number;
  maxYears: number;
}

export class ExperienceFilterService {
  /**
   * Normalizes experience string into a [minYears, maxYears] range.
   * Examples:
   *  "Fresher" -> [0, 0.5]
   *  "0-6 Months" -> [0, 0.5]
   *  "1 Year" -> [1, 1]
   *  "1-3 Years" -> [1, 3]
   *  "5-8 Years" -> [5, 8]
   *  "10+ Years" -> [10, 25]
   */
  public static parseExperienceRange(expStr: string): ExperienceRange {
    if (!expStr) return { minYears: 0, maxYears: 20 };

    const text = expStr.toLowerCase().trim();

    if (text.includes('fresher') || text.includes('entry') || text.includes('trainee') || text.includes('intern')) {
      return { minYears: 0, maxYears: 0.5 };
    }

    if (text.includes('month')) {
      const nums = text.match(/\d+/g);
      if (nums && nums.length >= 2) {
        return { minYears: parseInt(nums[0], 10) / 12, maxYears: parseInt(nums[1], 10) / 12 };
      } else if (nums && nums.length === 1) {
        return { minYears: 0, maxYears: parseInt(nums[0], 10) / 12 };
      }
      return { minYears: 0, maxYears: 0.5 };
    }

    const numbers = text.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
      return { minYears: 0, maxYears: 20 };
    }

    if (numbers.length >= 2) {
      const min = parseInt(numbers[0], 10);
      const max = parseInt(numbers[1], 10);
      return { minYears: Math.min(min, max), maxYears: Math.max(min, max) };
    }

    const singleVal = parseInt(numbers[0], 10);
    if (text.includes('+') || text.includes('above') || text.includes('more')) {
      return { minYears: singleVal, maxYears: singleVal + 10 };
    }

    return { minYears: Math.max(0, singleVal - 0.5), maxYears: singleVal + 1 };
  }

  /**
   * Checks whether candidate experience aligns with the job required experience.
   */
  public static isExperienceMatch(candidateExpStr: string, jobReqExpStr: string): boolean {
    const candidateRange = this.parseExperienceRange(candidateExpStr);
    const jobRange = this.parseExperienceRange(jobReqExpStr);

    // If candidate is a Fresher (0-0.5 yrs), reject jobs requiring 2+ years minimum
    if (candidateRange.maxYears <= 0.5 && jobRange.minYears >= 1.5) {
      return false;
    }

    // Check overlap of experience ranges
    const overlapMin = Math.max(candidateRange.minYears, jobRange.minYears);
    const overlapMax = Math.min(candidateRange.maxYears, jobRange.maxYears);

    // Overlap exists or bounds are close (within 1 year buffer)
    if (overlapMin <= overlapMax) {
      return true;
    }

    // Allow 1 year margin of tolerance
    return (jobRange.minYears - candidateRange.maxYears) <= 1.0;
  }
}
