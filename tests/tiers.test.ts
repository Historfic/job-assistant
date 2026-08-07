import { describe, it, expect } from 'vitest';
import { TIER_LIMITS, allowedSources, manilaDayStartUtc, nextManilaMidnightUtc } from '@/lib/tiers';

describe('tier limits', () => {
  it('free tier: onlinejobs only, 3/day', () => {
    expect(TIER_LIMITS.free.searchesPerDay).toBe(3);
    expect(allowedSources('free')).toEqual(['onlinejobs']);
  });
  it('pro tier: all sources, 20/day', () => {
    expect(TIER_LIMITS.pro.searchesPerDay).toBe(20);
    expect(allowedSources('pro')).toEqual(['onlinejobs', 'linkedin', 'upwork']);
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
