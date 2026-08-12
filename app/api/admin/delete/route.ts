// ─── POST /api/admin/delete ───────────────────────────────────────────────────
// Permanently removes an account and everything attached to it. Every table
// references auth.users with ON DELETE CASCADE, so removing the auth user also
// clears their profile, saved CV, OnlineJobs connection, applied/rejected
// history, search log and job alert.
//
// Needed both for tidying up test accounts and for honouring erasure requests
// under the Data Privacy Act (RA 10173).

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
      { error: 'This needs SUPABASE_SERVICE_ROLE_KEY in the environment' },
      { status: 503 },
    );
  }

  const { userId, email } = (await req.json().catch(() => ({}))) as {
    userId?: string; email?: string;
  };
  if (!userId || !email) {
    return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
  }

  // Deleting your own account would sign you out of the console mid-session.
  if (email.toLowerCase() === admin.email.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot delete your own account here.' }, { status: 400 });
  }
  // Nor another admin's — that should be a deliberate act in Supabase.
  if (isAdminEmail(email)) {
    return NextResponse.json({ error: 'Admin accounts can only be removed in Supabase.' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // The email must match the id, so a stale list can't delete the wrong person.
  const { data: profile } = await supabase
    .from('profiles').select('email').eq('id', userId).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }
  if (profile.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: 'That account changed since the list loaded. Refresh and try again.' },
      { status: 409 },
    );
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[/api/admin/delete]', error.message);
    return NextResponse.json({ error: 'Could not delete this account' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, email: profile.email });
}
