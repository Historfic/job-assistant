// ─── Salary Evaluator ─────────────────────────────────────────────────────────
// Ported directly from the original onlinejobs scraper (index.js).
// Parses any raw salary string and decides if it meets the minimum hourly rate.

const HOURS_PER_MONTH = 160;

export interface SalaryEvaluation {
  approved: boolean;
  reason: string;
  hourlyRate: number | null;
}

export function evaluateSalary(
  rawSalary: string | null | undefined,
  minHourlyRate: number = 10
): SalaryEvaluation {
  // Rule 1: null / empty
  if (!rawSalary || rawSalary.trim() === '') {
    return { approved: true, reason: 'No salary listed — approved by default', hourlyRate: null };
  }

  const lower = rawSalary.toLowerCase().trim();

  // Rule 2: explicitly ambiguous wording
  if (/negotiable|open to offers|tbd|to be discussed/i.test(lower)) {
    return { approved: true, reason: 'Salary negotiable/open — approved by default', hourlyRate: null };
  }

  // Extract numeric values (strip commas so "1,500" → 1500)
  const numMatches = lower.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);

  if (!numMatches || numMatches.length === 0) {
    return { approved: true, reason: `No numeric salary found in "${rawSalary}" — approved by default`, hourlyRate: null };
  }

  // For ranges like "$800-$1,200" take the highest value
  const amount = Math.max(...numMatches.map(Number));

  // Rule 3: hourly rate
  if (/\/hr|per hour|hourly|\/hour/i.test(lower)) {
    if (amount >= minHourlyRate) {
      return { approved: true, reason: `$${amount}/hr ≥ $${minHourlyRate}/hr minimum`, hourlyRate: amount };
    }
    return { approved: false, reason: `$${amount}/hr < $${minHourlyRate}/hr minimum`, hourlyRate: amount };
  }

  // Rule 4: monthly rate → convert to hourly
  if (/\/mo|per month|monthly|\/month/i.test(lower)) {
    const hourlyEstimate = parseFloat((amount / HOURS_PER_MONTH).toFixed(2));
    if (hourlyEstimate >= minHourlyRate) {
      return {
        approved: true,
        reason: `$${amount}/mo ÷ ${HOURS_PER_MONTH}hrs ≈ $${hourlyEstimate}/hr ≥ $${minHourlyRate}/hr`,
        hourlyRate: hourlyEstimate,
      };
    }
    return {
      approved: false,
      reason: `$${amount}/mo ÷ ${HOURS_PER_MONTH}hrs ≈ $${hourlyEstimate}/hr < $${minHourlyRate}/hr`,
      hourlyRate: hourlyEstimate,
    };
  }

  // Rule 5: unknown format — approve by default
  return {
    approved: true,
    reason: `Unknown rate format "${rawSalary}" — approved by default`,
    hourlyRate: null,
  };
}
