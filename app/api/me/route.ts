import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MeResponse, SearchLimits } from '@/types';
import { manilaDayStartUtc, TIER_LIMITS } from '@/lib/tiers';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let limits: SearchLimits = { remainingToday: 999, perDay: 999 };
  if (isSupabaseConfigured()) {
    const { createSupabaseServer } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServer();
    const dayStart = manilaDayStartUtc(new Date()).toISOString();
    const { count } = await supabase
      .from('searches')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart);
    const perDay = TIER_LIMITS[user.tier].searchesPerDay;
    limits = { remainingToday: Math.max(0, perDay - (count ?? 0)), perDay };
  }

  const body: MeResponse = {
    user,
    // Demo mode: report an active connection so personalized letters are demoable.
    // Task 7 replaces this with the real oj_connections lookup.
    ojConnection: isSupabaseConfigured() ? null : { status: 'active' },
    limits,
  };
  return NextResponse.json(body);
}
