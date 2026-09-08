// ─── /api/alerts ──────────────────────────────────────────────────────────────
// The signed-in user's daily job alert. One per account (see the migration for
// why). GET reads it, POST creates/updates, DELETE turns it off.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { normalizeSources } from '@/lib/sources/types';
import { allowedSources } from '@/lib/tiers';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ alert: null, demo: true });

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { data, error } = await createSupabaseServer()
    .from('job_alerts')
    .select('keyword,sources,min_salary,job_type,enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[/api/alerts] load failed:', error.message);
    return NextResponse.json({ error: 'Could not load your alert' }, { status: 500 });
  }
  return NextResponse.json({ alert: data ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  const body = (await req.json().catch(() => ({}))) as {
    keyword?: string; sources?: unknown; minSalary?: number; jobType?: string;
  };
  const keyword = (body.keyword ?? '').trim();
  if (!keyword) {
    return NextResponse.json({ error: 'A keyword is required' }, { status: 400 });
  }

  // An alert can only watch sources the account is entitled to, otherwise a
  // free preview account would get paid sources by the back door.
  const permitted = allowedSources(user.tier);
  const sources = normalizeSources(body.sources).filter(s => permitted.includes(s));

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { error } = await createSupabaseServer().from('job_alerts').upsert({
    user_id: user.id,
    keyword,
    sources: sources.length ? sources : ['onlinejobs'],
    min_salary: body.minSalary ?? null,
    job_type: body.jobType ?? null,
    enabled: true,
  }, { onConflict: 'user_id' });

  if (error) {
    console.error('[/api/alerts] save failed:', error.message);
    return NextResponse.json({ error: 'Could not save your alert' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { error } = await createSupabaseServer()
    .from('job_alerts').update({ enabled: false }).eq('user_id', user.id);

  if (error) {
    console.error('[/api/alerts] disable failed:', error.message);
    return NextResponse.json({ error: 'Could not turn off your alert' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
