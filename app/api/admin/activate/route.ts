// ─── POST /api/admin/activate ─────────────────────────────────────────────────
// The whole post-payment flow in one call. Given a paying customer's email:
//   • already has an account → mark it paid
//   • brand new             → create the account, mark it paid, and email an
//                             invite link where they set their own password
// Passwords are never generated, emailed, or stored by us.
//
// POST /api/admin/deactivate reverses the paid flag (payment reversed, refund).

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { isAdminConfigured, createSupabaseAdmin } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const target = email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(target)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Existing customer? Flip them to paid and we're done.
  const { data: existing } = await supabase
    .from('profiles').select('id').eq('email', target).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('profiles').update({ tier: 'pro' }).eq('id', existing.id);
    if (error) {
      console.error('[/api/admin/activate] update failed:', error.message);
      return NextResponse.json({ error: 'Could not activate this account' }, { status: 500 });
    }
    return NextResponse.json({ activated: true, invited: false, email: target });
  }

  // New customer: invite creates the auth user AND emails a set-password link.
  const origin = req.nextUrl.origin;
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    target,
    { redirectTo: `${origin}/auth/callback?next=/auth/reset` },
  );
  if (inviteError || !invited?.user) {
    console.error('[/api/admin/activate] invite failed:', inviteError?.message);
    return NextResponse.json(
      { error: inviteError?.message ?? 'Could not send the invite email' },
      { status: 502 },
    );
  }

  // The signup trigger creates the profile row; mark it paid.
  const { error: tierError } = await supabase
    .from('profiles').update({ tier: 'pro' }).eq('id', invited.user.id);
  if (tierError) {
    console.error('[/api/admin/activate] tier update failed:', tierError.message);
    return NextResponse.json(
      { error: 'Invite sent, but marking the account paid failed — retry activation.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ activated: true, invited: true, email: target });
}
