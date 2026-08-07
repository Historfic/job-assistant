// ─── POST /api/admin/deactivate ───────────────────────────────────────────────
// Reverses paid access (chargeback, refund, mistake). The account and its
// history survive — only the paid flag drops back to the free preview.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { isAdminConfigured, createSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || !isAdminEmail(admin.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Admin console needs SUPABASE_SERVICE_ROLE_KEY in .env.local' },
      { status: 503 },
    );
  }

  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const { error } = await createSupabaseAdmin()
    .from('profiles').update({ tier: 'free' }).eq('id', userId);
  if (error) {
    console.error('[/api/admin/deactivate]', error.message);
    return NextResponse.json({ error: 'Could not update this account' }, { status: 500 });
  }
  return NextResponse.json({ deactivated: true });
}
