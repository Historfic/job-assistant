// ─── Salary Evaluator ─────────────────────────────────────────────────────────
// Parses any raw salary string and decides whether it clears a minimum.
//
// Every number used to be read as US dollars. OnlineJobs.ph lists in pesos, so
// "₱30,000/month" was becoming ₱30,000 ÷ 160 = $187/hr — and since scoreJob
// awards its top salary bonus at $30/hr, EVERY peso-denominated job scored
// maximum on pay regardless of what it actually paid. That corrupted the
// ranking on the free tier's only source.
//
// Currency is now read from the string, and everything is compared in one unit.

const HOURS_PER_MONTH = 160;

/**
 * Approximate and deliberately a constant rather than a live rate: a filter
 * whose results shift with the exchange rate would be impossible to reason
 * about, and the numbers being compared are advertised salary ranges, not
 * settlements. Worth revisiting if the peso moves a long way.
 */
const PHP_PER_USD = 58;

/**
 * Order matters. “₱30,000 ($517)” is a peso salary with a conversion beside
 * it, while “USD $1,500/month or PHP equivalent” is a dollar salary that
 * merely mentions pesos. The symbol attached to the number wins.
 *
 * No word boundary after “php”: OnlineJobs writes “Php30,000” with no space,
 * and \b cannot match between “p” and “3”.
 */
function isPeso(text: string): boolean {
  if (/₱/.test(text)) return true;
  if (/\$|\busd\b/i.test(text)) return false;
  return /\bphp|\bpesos?\b|\bp(?=[\d,])/i.test(text);
}

/** Everything becomes USD per hour, so one comparison covers every source. */
function toUsdHourly(amount: number, peso: boolean, monthly: boolean): number {
  const usd = peso ? amount / PHP_PER_USD : amount;
  return parseFloat((monthly ? usd / HOURS_PER_MONTH : usd).toFixed(2));
}

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

  const peso = isPeso(rawSalary);
  const unit = peso ? '₱' : '$';

  // Rule 3: hourly rate
  if (/\/hr|per hour|hourly|\/hour/i.test(lower)) {
    const hourly = toUsdHourly(amount, peso, false);
    return {
      approved: hourly >= minHourlyRate,
      reason: `${unit}${amount}/hr ≈ $${hourly}/hr vs $${minHourlyRate}/hr minimum`,
      hourlyRate: hourly,
    };
  }

  // Rule 4: monthly rate → convert to hourly
  if (/\/mo|per month|monthly|\/month/i.test(lower)) {
    const hourly = toUsdHourly(amount, peso, true);
    return {
      approved: hourly >= minHourlyRate,
      reason: `${unit}${amount}/mo ≈ $${hourly}/hr vs $${minHourlyRate}/hr minimum`,
      hourlyRate: hourly,
    };
  }

  // Rule 5: unknown format — approve by default
  return {
    approved: true,
    reason: `Unknown rate format "${rawSalary}" — approved by default`,
    hourlyRate: null,
  };
}
