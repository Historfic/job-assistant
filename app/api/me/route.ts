import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MeResponse } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body: MeResponse = {
    user,
    // Demo mode: report an active connection so personalized letters are demoable.
    // Task 7 replaces this with the real oj_connections lookup.
    ojConnection: isSupabaseConfigured() ? null : { status: 'active' },
    // Task 5 replaces this placeholder with real Manila-day counting.
    limits: { remainingToday: 999, perDay: 999 },
  };
  return NextResponse.json(body);
}
