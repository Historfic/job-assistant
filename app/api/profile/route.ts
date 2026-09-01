// ─── /api/profile ─────────────────────────────────────────────────────────────
// The signed-in user's career profile (CV text + headline), used to personalise
// cover letters. Demo mode keeps everything client-side, so GET reports no
// stored profile and POST is a no-op.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { MAX_TEMPLATE_CHARS } from '@/lib/letterTemplate';

const MAX_CV_CHARS = 20_000; // a long CV is ~5k; this is generous but bounded

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ profile: null, demo: true });

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { data, error } = await createSupabaseServer()
    .from('career_profiles')
    .select('headline,cv_text,letter_template')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[/api/profile] load failed:', error.message);
    return NextResponse.json({ error: 'Could not load your profile' }, { status: 500 });
  }

  return NextResponse.json({
    profile: data
      ? {
          headline: data.headline ?? '',
          cvText: data.cv_text ?? '',
          letterTemplate: data.letter_template ?? '',
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  const { headline, cvText, letterTemplate } = (await req.json().catch(() => ({}))) as {
    headline?: string; cvText?: string; letterTemplate?: string;
  };

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { error } = await createSupabaseServer().from('career_profiles').upsert({
    user_id: user.id,
    headline: (headline ?? '').slice(0, 200),
    cv_text: (cvText ?? '').slice(0, MAX_CV_CHARS),
    // Empty means "use the default", so it is stored as null rather than ''.
    letter_template: (letterTemplate ?? '').trim().slice(0, MAX_TEMPLATE_CHARS) || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) {
    console.error('[/api/profile] save failed:', error.message);
    return NextResponse.json({ error: 'Could not save your profile' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
