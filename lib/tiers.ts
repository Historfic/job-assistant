// ─── Access & Search Limits ───────────────────────────────────────────────────
// One product, monthly subscription (₱999/month). profiles.tier semantics:
//   'free' = unpaid preview — 3 LIFETIME searches, OnlineJobs.ph only
//   'pro'  = paid full access — all sources, 20 searches per Manila day
// One "search" = one submission of the search form, regardless of how many
// sources are selected. Day boundaries use Asia/Manila (UTC+8, no DST).
//
// Billing is manual: customers pay by GCash each month and are flipped to
// 'pro' in the admin console. Nothing here expires an account automatically —
// lapsed subscribers have to be revoked by hand until checkout is automated.

import type { JobSource } from '@/types';

export const PRICE_COPY = '₱999/month';
export const FULL_ACCESS_COPY = 'Get full access — ₱999/month — via our Facebook page.';

/**
 * Where "Get full access" sends people. Set NEXT_PUBLIC_BUY_URL to your
 * Facebook page, Messenger link, or (later) a PayMongo payment link — no code
 * change needed to switch. Falls back to the Easy Freelancing page search so
 * the button is never a dead end.
 */
export const BUY_URL =
  process.env.NEXT_PUBLIC_BUY_URL || 'https://www.facebook.com/search/top?q=easy%20freelancing';

export const TIER_LIMITS: Record<'free' | 'pro', {
  searches: number;
  scope: 'lifetime' | 'day';
  sources: JobSource[];
}> = {
  free: { searches: 3,  scope: 'lifetime', sources: ['onlinejobs'] },
  pro:  { searches: 20, scope: 'day',      sources: ['onlinejobs', 'linkedin', 'upwork'] },
};

export function allowedSources(tier: 'free' | 'pro'): JobSource[] {
  return TIER_LIMITS[tier].sources;
}

const MANILA_OFFSET_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;

export function manilaDayStartUtc(now: Date): Date {
  const manilaMs = now.getTime() + MANILA_OFFSET_MS;
  const dayStartManilaMs = Math.floor(manilaMs / DAY_MS) * DAY_MS;
  return new Date(dayStartManilaMs - MANILA_OFFSET_MS);
}

export function nextManilaMidnightUtc(now: Date): Date {
  return new Date(manilaDayStartUtc(now).getTime() + DAY_MS);
}
