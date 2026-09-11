import { describe, it, expect } from 'vitest';
import { formatPosted, formatRate, parsePostedAt, postedWithin } from '@/lib/jobMeta';

// 1:46 PM on 11 Sep 2026, Manila. Every date below is a real value captured
// from that day's OnlineJobs page and Apify runs.
const NOW = new Date('2026-09-11T05:46:00Z');

describe('formatPosted', () => {
  it('reads OnlineJobs times as Manila time, not UTC', () => {
    // The page carries both copies of this post: data-temp="2026-09-11 13:24:57"
    // and data-temp-2="2026-09-11 05:24:57". Read as UTC on the server, the
    // first puts a post from twenty minutes ago eight hours into the future.
    expect(parsePostedAt('2026-09-11 13:24:57')?.at.toISOString()).toBe('2026-09-11T05:24:57.000Z');
    expect(formatPosted('2026-09-11 13:24:57', NOW)).toBe('Sep 11, 1:24 PM');
  });

  it('shows Upwork times in Manila time, including across midnight', () => {
    expect(formatPosted('2026-09-11T00:40:53.666Z', NOW)).toBe('Sep 11, 8:40 AM');
    // Still the 10th in UTC, already the 11th in Manila
    expect(formatPosted('2026-09-10T21:31:16.982Z', NOW)).toBe('Sep 11, 5:31 AM');
  });

  it('gives LinkedIn a date and no time, because LinkedIn only reports the day', () => {
    expect(formatPosted('2026-08-28T00:00:00.000Z', NOW)).toBe('Aug 28');
  });

  it('adds the year only when it is not this year', () => {
    expect(formatPosted('2025-12-30T00:00:00.000Z', NOW)).toBe('Dec 30, 2025');
  });

  it('gets noon and midnight right on a 12-hour clock', () => {
    expect(formatPosted('2026-09-11 12:05:00', NOW)).toBe('Sep 11, 12:05 PM');
    expect(formatPosted('2026-09-11 00:05:00', NOW)).toBe('Sep 11, 12:05 AM');
  });

  it('passes a relative phrase through rather than guessing a date from it', () => {
    expect(formatPosted('Posted 3 days ago', NOW)).toBe('3 days ago');
  });

  it('returns nothing it cannot place', () => {
    expect(formatPosted(null, NOW)).toBeNull();
    expect(formatPosted('', NOW)).toBeNull();
    // No zone, so it would be read in the server's zone
    expect(formatPosted('Sep 5, 2026', NOW)).toBeNull();
  });
});

describe('postedWithin', () => {
  const THREE_DAYS = 3 * 86_400_000;

  it('keeps a post from this morning and drops weeks-old LinkedIn ones', () => {
    // Both LinkedIn dates are real results for "AI automation", the kind that
    // went out under a "new jobs today" subject before this rule.
    expect(postedWithin('2026-09-11 13:24:57', THREE_DAYS, NOW)).toBe(true);
    expect(postedWithin('2026-08-27T00:00:00.000Z', THREE_DAYS, NOW)).toBe(false);
    expect(postedWithin('2026-04-28T00:00:00.000Z', THREE_DAYS, NOW)).toBe(false);
  });

  it('counts a LinkedIn date from three days back as recent at the 7am send', () => {
    // The alert runs at 7am Manila, 23:00 UTC. LinkedIn's "Sep 9" is midnight
    // UTC on the 9th, 71 hours earlier; "Sep 8" is 95.
    const send = new Date('2026-09-11T23:00:00Z');
    expect(postedWithin('2026-09-09T00:00:00.000Z', THREE_DAYS, send)).toBe(true);
    expect(postedWithin('2026-09-08T00:00:00.000Z', THREE_DAYS, send)).toBe(false);
  });

  it('lets through a listing it cannot date', () => {
    // If a site changes its date format nothing parses, and dropping undated
    // listings would quietly empty every email from that site.
    expect(postedWithin(null, THREE_DAYS, NOW)).toBe(true);
    expect(postedWithin('Sep 5, 2026', THREE_DAYS, NOW)).toBe(true);
  });
});

describe('formatRate', () => {
  const upwork = (salary: string | null, employmentType = 'Hourly') =>
    ({ source: 'upwork' as const, salary, employmentType });
  const onlinejobs = (salary: string) =>
    ({ source: 'onlinejobs' as const, salary, employmentType: 'Full Time' });

  it('says what an Upwork hourly range is, since the scraper drops the $ and the /hr', () => {
    expect(formatRate(upwork('5 - 7'))).toBe('$5-$7/hr');
    expect(formatRate(upwork('10 - 10'))).toBe('$10/hr');
    expect(formatRate(upwork('12.50 - 20'))).toBe('$12.50-$20/hr');
  });

  it('labels an Upwork fixed budget as a price for the whole job', () => {
    expect(formatRate(upwork('Est. budget:$7,000.00', 'Fixed'))).toBe('$7,000 fixed price');
  });

  it('treats N/A and blanks as no rate', () => {
    expect(formatRate(upwork('N/A'))).toBeNull();
    expect(formatRate({ source: 'linkedin', salary: null, employmentType: 'Full-time' })).toBeNull();
  });

  it('shows OnlineJobs rates exactly as the employer wrote them', () => {
    // "2" and "20000" are real listings. No currency and no period; filling
    // either in would put a figure in someone's inbox the employer never said.
    expect(formatRate(onlinejobs('2'))).toBe('2');
    expect(formatRate(onlinejobs('20000'))).toBe('20000');
    expect(formatRate(onlinejobs('₱60,000 - ₱80,000'))).toBe('₱60,000 - ₱80,000');
    expect(formatRate(onlinejobs('800 AUD - 1000 AUD / Month'))).toBe('800 AUD - 1000 AUD / Month');
  });
});
