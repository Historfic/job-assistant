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

const METHODS = new Set(['gcash', 'bpi', 'gotyme', 'maya']);
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Payments are not available in demo mode.' }, { status: 503 });
  }

  // Multipart, because the receipt is a screenshot now. Asking someone to find
  // and retype a reference number is the step where a payment stops being
  // reported; everyone already screenshots the receipt out of habit, and that
  // image carries the amount, time, sender name and reference at once.
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Could not read that. Please try again.' }, { status: 400 });
  }

  const method = String(form.get('method') ?? '').toLowerCase();
  if (!METHODS.has(method)) {
    return NextResponse.json({ error: 'Choose how you paid.' }, { status: 400 });
  }

  const receipt = form.get('receipt');
  const reference = String(form.get('reference') ?? '').trim().slice(0, 64);

  // One or the other. A claim with neither leaves nothing to check against.
  if (!(receipt instanceof File) && reference.length < 4) {
    return NextResponse.json({
      error: 'Upload a screenshot of your receipt so we can check the payment.',
    }, { status: 400 });
  }

  if (receipt instanceof File) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({
        error: 'That image is over 5 MB. A normal screenshot is well under that.',
      }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(receipt.type)) {
      return NextResponse.json({
        error: 'Please upload a screenshot image (JPG, PNG or HEIC).',
      }, { status: 415 });
    }
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

  // Uploaded with the service role into a PRIVATE bucket. A receipt shows a
  // real person's name, partial account number and what they paid — a public
  // bucket would leave that behind a guessable URL forever.
  let receiptPath: string | null = null;
  if (receipt instanceof File) {
    const ext = (receipt.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('receipts')
      .upload(path, await receipt.arrayBuffer(), { contentType: receipt.type, upsert: false });
    if (upErr) {
      console.error('[/api/payment-claim] upload', upErr);
      return NextResponse.json({
        error: 'We could not save that image. Please try again, or message us on Facebook.',
      }, { status: 500 });
    }
    receiptPath = path;
  }

  const { data: claim, error } = await supabase
    .from('payment_claims')
    .insert({
      user_id: user.id,
      email: user.email,
      method,
      reference: reference || null,
      receipt_path: receiptPath,
      note: String(form.get('note') ?? '').trim().slice(0, 500) || null,
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
    reference: reference || '(see screenshot)',
    note: String(form.get('note') ?? ''),
  }).catch(err => console.error('[/api/payment-claim] notify', err));

  return NextResponse.json({ received: true, claimId: claim.id });
}
