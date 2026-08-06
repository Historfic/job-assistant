import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AnalyzedJob } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ entries: null }); // demo

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { data, error } = await createSupabaseServer()
    .from('job_statuses')
    .select('job_url,status,snapshot,created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries: Record<string, { state: string; setAt: string; job?: AnalyzedJob }> = {};
  for (const row of data ?? []) {
    entries[row.job_url] = {
      state: row.status,
      setAt: row.created_at,
      job: (row.snapshot as AnalyzedJob) ?? undefined,
    };
  }
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  const { url, state, job } = await req.json() as {
    url: string; state: 'applied' | 'rejected' | null; job?: AnalyzedJob;
  };
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const supabase = createSupabaseServer();

  if (state === null) {
    await supabase.from('job_statuses').delete().eq('user_id', user.id).eq('job_url', url);
  } else {
    await supabase.from('job_statuses').upsert({
      user_id: user.id,
      job_url: url,
      status: state,
      title: job?.title ?? null,
      company: job?.companyName ?? null,
      source: job?.source ?? 'onlinejobs',
      snapshot: job ?? null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,job_url' });
  }
  return NextResponse.json({ ok: true });
}
