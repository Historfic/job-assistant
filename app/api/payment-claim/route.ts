// ─── POST /api/payment-claim ──────────────────────────────────────────────────
// "I paid, here is my reference number."
//
// A QR payment tells the website nothing, so the customer tells us and Rafael
// verifies against his own GCash record. This endpoint records the claim and
// tries to notify him. It never grants access — approval is a human act in
// /admin, because the only real check is money actually arriving.
//
// The row is written BEFORE the email is attempted. If SMTP is unconfigured or
// down, the claim still shows up in /admin. A notification that can silently
// fail must not be the only trace of somebody's ₱999.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { paymentIdFor } from '@/lib/paymentId';
import { notifyPaymentClaim } from '@/lib/paymentNotify';

const METHODS = new Set(['gcash', 'bpi', 'gotyme']);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Payments are not available in demo mode.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    method?: string; reference?: string; note?: string;
  };

  const method = (body.method ?? '').toLowerCase();
  if (!METHODS.has(method)) {
    return NextResponse.json({ error: 'Choose how you paid.' }, { status: 400 });
  }

  // Reference numbers differ per bank, so this only checks that something
  // plausible was typed. Rafael matches it against his own record; a format
  // rule strict enough to be useful would reject a real receipt sooner or later.
  const reference = (body.reference ?? '').trim();
  if (reference.length < 4 || reference.length > 64) {
    return NextResponse.json({
      error: 'Enter the reference number from your receipt.',
    }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // One open claim per account. Without this, an impatient customer submits
  // five while waiting and Rafael gets five emails about one payment.
  const { data: open } = await supabase
    .from('payment_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (open) {
    return NextResponse.json({
      error: "We already have your payment details and we're checking them. No need to send again.",
      code: 'ALREADY_PENDING',
    }, { status: 409 });
  }

  const { data: claim, error } = await supabase
    .from('payment_claims')
    .insert({
      user_id: user.id,
      email: user.email,
      method,
      reference,
      note: (body.note ?? '').trim().slice(0, 500) || null,
    })
    .select('id, created_at')
    .single();

  if (error || !claim) {
    console.error('[/api/payment-claim] insert', error);
    return NextResponse.json({
      error: 'We could not record that. Please message us on Facebook instead.',
    }, { status: 500 });
  }

  // Best effort, and deliberately after the insert. A failed email costs Rafael
  // a notification; a failed insert would cost a customer their access.
  await notifyPaymentClaim({
    email: user.email,
    paymentId: paymentIdFor(user.id),
    method,
    reference,
    note: body.note ?? '',
  }).catch(err => console.error('[/api/payment-claim] notify', err));

  return NextResponse.json({ received: true, claimId: claim.id });
}
