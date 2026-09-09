// ─── /api/admin/claims ────────────────────────────────────────────────────────
// The pending "I paid" queue, and resolving one.
//
// GET  → claims awaiting a decision
// POST → mark one approved or rejected
//
// Approving records the decision and nothing else. Granting access is still a
// separate, deliberate act via /api/admin/activate — so a mis-tap here cannot
// hand out full access, and the audit of "who said they paid" stays separate
// from "who was given access".

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { paymentIdFor } from '@/lib/paymentId';
import { smtpConfigured, paymentNotifyRecipient } from '@/lib/smtp';

async function requireAdmin() {
  const admin = await getSessionUser();
  return admin && isAdminEmail(admin.email) ? admin : null;
}

export async function GET() {
  const admin = await requireAdmin();
  // 404 rather than 403: an admin console should not confirm it exists.
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isSupabaseConfigured()) return NextResponse.json({ claims: [], notifications: false });

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from('payment_claims')
    .select('id, user_id, email, method, reference, amount, note, created_at, receipt_path')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[/api/admin/claims] list', error);
    return NextResponse.json({ error: 'Could not load claims' }, { status: 500 });
  }

  // Signed, short-lived URLs rather than public ones. A receipt shows a real
  // person's name, partial account number and what they paid; the bucket stays
  // private and these links expire.
  const claims = await Promise.all((data ?? []).map(async (c: Record<string, unknown> & { user_id: string; receipt_path: string | null }) => {
    let receiptUrl: string | null = null;
    if (c.receipt_path) {
      const { data: signed } = await db.storage
        .from('receipts')
        .createSignedUrl(c.receipt_path, 60 * 30);
      receiptUrl = signed?.signedUrl ?? null;
    }
    return { ...c, paymentId: paymentIdFor(c.user_id), receiptUrl };
  }));

  return NextResponse.json({
    claims,
    // Surfaced so /admin can warn when claims are arriving silently.
    notifications: smtpConfigured() && Boolean(paymentNotifyRecipient()),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { id, decision } = (await req.json().catch(() => ({}))) as {
    id?: string; decision?: string;
  };
  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { error } = await createSupabaseAdmin()
    .from('payment_claims')
    .update({ status: decision, resolved_at: new Date().toISOString(), resolved_by: admin.email })
    .eq('id', id)
    .eq('status', 'pending');   // never re-resolve one somebody already handled

  if (error) {
    console.error('[/api/admin/claims] resolve', error);
    return NextResponse.json({ error: 'Could not update that claim' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
