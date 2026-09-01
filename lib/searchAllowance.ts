// ─── Search allowance ─────────────────────────────────────────────────────────
// One place that decides whether a user may spend another paid AI call, so
// every entry point charges the same allowance.
//
// Extracted when paste-a-job shipped without a gate: a free user out of their
// three lifetime searches still had an unlimited supply of Claude calls through
// the paste box, because the only check lived inside /api/scrape.

import { NextResponse } from 'next/server';
import type { AppUser, JobSource } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServer } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/email';
import { TIER_LIMITS, FULL_ACCESS_COPY, manilaDayStartUtc, nextManilaMidnightUtc } from '@/lib/tiers';

/**
 * Records the spend and returns null when it is allowed, or the response to
 * send back when it is not.
 */
export async function consumeSearchAllowance(
  user: AppUser,
  entry: { keyword: string; sources: JobSource[] },
): Promise<NextResponse | null> {
  if (!isSupabaseConfigured()) return null;   // demo mode has no limits

  const supabase = createSupabaseServer();
  const { searches: max, scope } = TIER_LIMITS[user.tier];

  // A lifetime allowance spans every alias of one inbox, or it is not lifetime.
  let userIds = [user.id];
  if (scope === 'lifetime') {
    const { data: siblings } = await supabase
      .from('profiles').select('id').eq('normalized_email', normalizeEmail(user.email));
    if (siblings?.length) userIds = siblings.map(r => r.id);
  }

  let q = supabase.from('searches').select('id', { count: 'exact', head: true }).in('user_id', userIds);
  if (scope === 'day') q = q.gte('created_at', manilaDayStartUtc(new Date()).toISOString());

  const { count } = await q;
  if ((count ?? 0) >= max) {
    return scope === 'lifetime'
      ? NextResponse.json({
          error: `Your ${max} free searches are used up. ${FULL_ACCESS_COPY}`,
          code: 'RATE_LIMIT',
        }, { status: 429 })
      : NextResponse.json({
          error: `Daily limit reached (${max}/day). Resets at midnight Manila time.`,
          code: 'RATE_LIMIT',
          resetAt: nextManilaMidnightUtc(new Date()).toISOString(),
        }, { status: 429 });
  }

  await supabase.from('searches').insert({
    user_id: user.id,
    sources: entry.sources,
    keyword: entry.keyword,
  });
  return null;
}
