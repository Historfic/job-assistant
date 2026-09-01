import { describe, it, expect } from 'vitest';
import { TIER_LIMITS, FULL_ACCESS_COPY, PRICE_COPY, REGULAR_PRICE_COPY, FOUNDING_SEATS,
  allowedSources, resultCap, manilaDayStartUtc, nextManilaMidnightUtc } from '@/lib/tiers';

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
  it('founding price is below the regular price it rises to', () => {
    // A "was" price we never charged would be a false discount. The higher
    // number has to be the future price, and strictly higher, or the offer is
    // meaningless.
    const num = (s: string) => Number(s.replace(/[^0-9]/g, ''));
    expect(num(REGULAR_PRICE_COPY)).toBeGreaterThan(num(PRICE_COPY));
  });
  it('paywall copy carries the founding-seat promise', () => {
    expect(FULL_ACCESS_COPY).toContain(String(FOUNDING_SEATS));
    expect(FULL_ACCESS_COPY).toContain('locked for life');
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

describe('resultCap', () => {
  it('caps a free search at five however many the user asks for', () => {
    expect(resultCap('free', 10)).toBe(5);
    expect(resultCap('free', 30)).toBe(5);
  });
  it('lets a free user ask for fewer', () => {
    expect(resultCap('free', 3)).toBe(3);
  });
  it("respects a paying user's choice up to the ceiling", () => {
    expect(resultCap('pro', 10)).toBe(10);
    expect(resultCap('pro', 30)).toBe(30);
    expect(resultCap('pro', 500)).toBe(30);
  });
  it('never returns zero, which would search for nothing', () => {
    expect(resultCap('free', 0)).toBe(1);
    expect(resultCap('pro', -5)).toBe(1);
  });
  it('free sees strictly fewer results than pro, or the tier means nothing', () => {
    expect(TIER_LIMITS.free.results).toBeLessThan(TIER_LIMITS.pro.results);
  });
});

describe('search scoring floor', () => {
  it('a stated modest rate never scores below an unstated one', async () => {
    // Peso jobs convert to a few dollars an hour. Under the old ladder they
    // scored 0 for pay while "Negotiable" scored 8 — so knowing a job paid
    // ₱30,000 ranked it below a job that said nothing at all.
    const { scoreJob, analyzeJobLocally } = await import('@/lib/aiAnalyzer');
    const base = { title: 'VA', description: '', url: 'u' } as never;

    const stated    = scoreJob({ ...base, hourlyRate: 3.2, salary: '₱30,000/mo' } as never, analyzeJobLocally(base), 'va');
    const unstated  = scoreJob({ ...base, salary: 'Negotiable' } as never, analyzeJobLocally(base), 'va');
    expect(stated).toBeGreaterThanOrEqual(unstated);
  });
});
