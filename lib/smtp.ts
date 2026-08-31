// Where payment notifications go, and whether they can be sent at all.
//
// Separate from the sending code so a route can check "will this reach anyone?"
// without importing nodemailer, and so /admin can warn when the answer is no.

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * The first address in ADMIN_EMAILS — whoever activates customers is who needs
 * to hear that one has paid. PAYMENT_NOTIFY_EMAIL overrides it.
 */
export function paymentNotifyRecipient(): string {
  const explicit = process.env.PAYMENT_NOTIFY_EMAIL?.trim();
  if (explicit) return explicit;
  return (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim() ?? '';
}
