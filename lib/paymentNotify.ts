// ─── Payment claim notification ───────────────────────────────────────────────
// Tells Rafael a customer says they paid. Best effort by design: the claim is
// already in the database before this runs, so a missing SMTP config or a dead
// mail server costs a notification, never a customer's access.
//
// The email deliberately contains NO link that changes anything. Gmail and
// Outlook prefetch links in messages to scan them, so a one-click approve URL
// would approve every claim the moment the mail arrived — before it was read.
// The link goes to /admin, where the session is already authenticated and the
// decision is made on purpose.

import { paymentNotifyRecipient, smtpConfigured } from './smtp';

export interface PaymentClaimNotice {
  email: string;
  paymentId: string;
  method: string;
  reference: string;
  note?: string;
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://easyclientph.com').replace(/\/+$/, '');

function body(claim: PaymentClaimNotice): { subject: string; text: string; html: string } {
  const method = claim.method.toUpperCase();
  const subject = `₱999 claimed — ${claim.email} (${method} ${claim.reference})`;

  const lines = [
    `${claim.email} says they paid.`,
    '',
    `Payment ID:  ${claim.paymentId}`,
    `Method:      ${method}`,
    `Reference:   ${claim.reference}`,
    claim.note ? `Note:        ${claim.note}` : '',
    '',
    `Check ${method} for ₱999 with that reference, then approve at:`,
    `${APP_URL}/admin`,
    '',
    'Nothing has been granted. This is a claim, not a payment.',
  ].filter(Boolean);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px">
  <p style="font-size:15px;margin:0 0 16px"><strong>${claim.email}</strong> says they paid.</p>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">
    <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Payment ID</td><td style="font-weight:600">${claim.paymentId}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Method</td><td style="font-weight:600">${method}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Reference</td><td style="font-weight:600">${claim.reference}</td></tr>
    ${claim.note ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">Note</td><td>${claim.note}</td></tr>` : ''}
  </table>
  <p style="font-size:14px;color:#374151;margin:0 0 18px">
    Check ${method} for ₱999 with that reference, then approve it.
  </p>
  <a href="${APP_URL}/admin"
     style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
            padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600">
    Open admin
  </a>
  <p style="font-size:12px;color:#9ca3af;margin-top:20px">
    Nothing has been granted. This is a claim, not a payment.
  </p>
</div>`.trim();

  return { subject, text: lines.join('\n'), html };
}

export async function notifyPaymentClaim(claim: PaymentClaimNotice): Promise<boolean> {
  const to = paymentNotifyRecipient();
  if (!smtpConfigured() || !to) {
    // Loud in the logs, because the claim is sitting in /admin unread.
    console.warn('[paymentNotify] SMTP not configured — claim recorded but nobody was emailed:', claim.email);
    return false;
  }

  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const { subject, text, html } = body(claim);
  await transport.sendMail({
    from: `EasyClient <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    // So a reply goes to the customer, not into the void.
    replyTo: claim.email,
  });
  return true;
}
