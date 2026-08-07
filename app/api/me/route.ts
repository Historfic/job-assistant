import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getOjConnectionStatus } from '@/lib/oj/connection';
import type { MeResponse, SearchLimits } from '@/types';
import { manilaDayStartUtc, TIER_LIMITS } from '@/lib/tiers';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let limits: SearchLimits = { remainingToday: 999, perDay: 999 };
  if (isSupabaseConfigured()) {
    const { createSupabaseServer } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServer();
    // Free preview counts lifetime searches; full access counts the Manila day.
    const { searches: maxSearches, scope } = TIER_LIMITS[user.tier];
    let countQuery = supabase
      .from('searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (scope === 'day') {
      countQuery = countQuery.gte('created_at', manilaDayStartUtc(new Date()).toISOString());
    }
    const { count } = await countQuery;
    limits = { remainingToday: Math.max(0, maxSearches - (count ?? 0)), perDay: maxSearches };
  }

  const status = await getOjConnectionStatus(user.id);
  const body: MeResponse = {
    user,
    ojConnection: status ? { status } : null,
    limits,
  };
  return NextResponse.json(body);
}
