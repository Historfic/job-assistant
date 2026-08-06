// ─── Tiers & Daily Limits ─────────────────────────────────────────────────────
// One "search" = one submission of the search form, regardless of how many
// sources are selected. Day boundaries use Asia/Manila (UTC+8, no DST).
// Until payments ship, Rafael flips profiles.tier to 'pro' by hand in Supabase.

import type { JobSource } from '@/types';

export const TIER_LIMITS: Record<'free' | 'pro', { searchesPerDay: number; sources: JobSource[] }> = {
  free: { searchesPerDay: 3,  sources: ['onlinejobs'] },
  pro:  { searchesPerDay: 20, sources: ['onlinejobs', 'linkedin', 'upwork'] },
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
