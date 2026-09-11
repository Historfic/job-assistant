// ─── What a listing pays and when it went up ──────────────────────────────────
// Shown in the daily alert email, where it is read at a glance on a phone,
// often hours after it was sent.
//
// Each source reports these its own way and none of them says which:
//   OnlineJobs.ph  "2026-09-11 13:24:57"        Manila time, no zone written
//   Upwork         "2026-09-11T00:40:53.666Z"   exact, UTC
//   LinkedIn       "2026-08-28T00:00:00.000Z"   only the day, dressed as midnight UTC
//
// The OnlineJobs one is the trap. The server runs on UTC, so `new Date()` on
// that string reads it as UTC and every OnlineJobs post lands eight hours in
// the future. The page carries a UTC copy beside it (data-temp-2), which is how
// the offset was confirmed rather than assumed.

import type { RawJob } from '@/types';

/** Philippine time: UTC+8, no daylight saving. */
const MANILA_OFFSET_MS = 8 * 3_600_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface PostedAt {
  at: Date;
  /** False when the source only knows the day, so no time should be shown. */
  hasTime: boolean;
}

export function parsePostedAt(raw: string | null | undefined): PostedAt | null {
  const s = raw?.trim();
  if (!s) return null;

  // OnlineJobs.ph: Manila wall-clock time with no zone.
  const local = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (local) {
    const [, y, mo, d, h, mi, sec = '0'] = local;
    return {
      at: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec) - MANILA_OFFSET_MS),
      hasTime: true,
    };
  }

  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    return { at: new Date(Date.UTC(+y, +mo - 1, +d)), hasTime: false };
  }

  // Anything else must carry its own zone. A zoneless "Sep 5, 2026" would be
  // read in whatever zone the server happens to run in.
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) return null;
  const at = new Date(s);
  if (isNaN(at.getTime())) return null;

  // LinkedIn gives the day as exact midnight UTC. Printing "8:00 AM" under
  // every LinkedIn job would be a time nobody reported.
  const midnightUtc = /T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00)$/i.test(s);
  return { at, hasTime: !midnightUtc };
}

/**
 * "Sep 11, 1:24 PM", in Philippine time. Absolute rather than "3h ago" because
 * an email is read hours after it was written, and by then "3h ago" is wrong.
 */
export function formatPosted(raw: string | null | undefined, now: Date = new Date()): string | null {
  const posted = parsePostedAt(raw);
  if (!posted) {
    // "Posted 3 days ago" is still true on the day the email goes out, which
    // is more than a date guessed from it would be.
    const relative = raw?.trim().replace(/^posted\s+/i, '');
    return relative && /\bago$/i.test(relative) ? relative : null;
  }

  const manila = new Date(posted.at.getTime() + MANILA_OFFSET_MS);
  const thisYear = new Date(now.getTime() + MANILA_OFFSET_MS).getUTCFullYear();

  let text = `${MONTHS[manila.getUTCMonth()]} ${manila.getUTCDate()}`;
  if (manila.getUTCFullYear() !== thisYear) text += `, ${manila.getUTCFullYear()}`;
  if (posted.hasTime) {
    const h = manila.getUTCHours();
    const m = String(manila.getUTCMinutes()).padStart(2, '0');
    text += `, ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  }
  return text;
}

/**
 * Whether a listing went up within `maxAgeMs` of `now`.
 *
 * A listing that cannot be dated passes. If a site changes its date format,
 * nothing parses, and failing undated listings would quietly empty every email
 * from that site. One old job getting through is the better way to be wrong.
 */
export function postedWithin(
  raw: string | null | undefined,
  maxAgeMs: number,
  now: Date = new Date(),
): boolean {
  const posted = parsePostedAt(raw);
  return !posted || now.getTime() - posted.at.getTime() <= maxAgeMs;
}

/** What a listing pays, or null when it does not say. */
export function formatRate(job: Pick<RawJob, 'salary' | 'source' | 'employmentType'>): string | null {
  const raw = job.salary?.replace(/\s+/g, ' ').trim();
  if (!raw || /^n\/?a$/i.test(raw)) return null;

  if (job.source === 'upwork') {
    // Upwork budgets are always US dollars, and the scraper hands them over
    // without saying so: "5 - 7" is $5 to $7 an hour, "Est. budget:$7,000.00"
    // is a fixed price for the whole job. Bare, "5 - 7" means nothing.
    const fixed = raw.match(/^est\.?\s*budget:?\s*(.+)$/i);
    if (fixed) {
      const amount = fixed[1].replace(/\.00$/, '');
      return `${/^\d/.test(amount) ? '$' : ''}${amount} fixed price`;
    }

    const range = raw.match(/^\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)$/);
    if (range) {
      const [lo, hi] = [range[1], range[2]].map(n => n.replace(/\.0+$/, ''));
      const amount = lo === hi ? `$${lo}` : `$${lo}-$${hi}`;
      return /hourly/i.test(job.employmentType ?? '') ? `${amount}/hr` : amount;
    }
  }

  // Everything else exactly as the employer wrote it. Real OnlineJobs posts
  // say "20000" or "2" with no currency and no period; filling either in would
  // put a figure in someone's inbox that the employer never said.
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}
