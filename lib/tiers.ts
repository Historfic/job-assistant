// ─── Access & Search Limits ───────────────────────────────────────────────────
// One product, one-time payment (₱999). profiles.tier semantics:
//   'free' = unpaid preview — 3 LIFETIME searches, OnlineJobs.ph only
//   'pro'  = paid full access — all sources, 20 searches per Manila day
// One "search" = one submission of the search form, regardless of how many
// sources are selected. Day boundaries use Asia/Manila (UTC+8, no DST).
// Until automated checkout ships, Rafael marks accounts paid by flipping
// profiles.tier to 'pro' in Supabase after a GCash/bank payment via the
// Easy Freelancing Facebook page.

import type { JobSource } from '@/types';

export const FULL_ACCESS_COPY = 'Get full access — ₱999 one-time — via our Facebook page.';

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
