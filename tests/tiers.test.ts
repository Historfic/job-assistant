import { describe, it, expect } from 'vitest';
import { TIER_LIMITS, FULL_ACCESS_COPY, allowedSources, manilaDayStartUtc, nextManilaMidnightUtc } from '@/lib/tiers';

describe('access limits (monthly subscription)', () => {
  it('free preview: onlinejobs only, 3 lifetime searches', () => {
    expect(TIER_LIMITS.free.searches).toBe(3);
    expect(TIER_LIMITS.free.scope).toBe('lifetime');
    expect(allowedSources('free')).toEqual(['onlinejobs']);
  });
  it('full access (paid): all sources, 20 per day', () => {
    expect(TIER_LIMITS.pro.searches).toBe(20);
    expect(TIER_LIMITS.pro.scope).toBe('day');
    expect(allowedSources('pro')).toEqual(['onlinejobs', 'linkedin', 'upwork']);
  });
  it('paywall copy states the monthly price', () => {
    expect(FULL_ACCESS_COPY).toContain('₱999/month');
    expect(FULL_ACCESS_COPY).not.toContain('one-time');
  });
});

describe('manilaDayStartUtc', () => {
  // Manila = UTC+8, no DST. Manila midnight = 16:00 UTC the previous day.
  it('15:59Z is still the same Manila day (starts 16:00Z the day before)', () => {
    expect(manilaDayStartUtc(new Date('2026-08-05T15:59:00Z')).toISOString())
      .toBe('2026-08-04T16:00:00.000Z');
  });
  it('16:00Z rolls over to the next Manila day', () => {
    expect(manilaDayStartUtc(new Date('2026-08-05T16:00:00Z')).toISOString())
      .toBe('2026-08-05T16:00:00.000Z');
  });
  it('nextManilaMidnightUtc is day start + 24h', () => {
    expect(nextManilaMidnightUtc(new Date('2026-08-05T15:59:00Z')).toISOString())
      .toBe('2026-08-05T16:00:00.000Z');
  });
});
