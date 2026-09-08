// ─── Outbound email ───────────────────────────────────────────────────────────
// One place that knows how to send mail. With SMTP_USER + SMTP_PASS set it
// sends for real; without them it logs what it would have sent, so every flow
// stays testable with no credentials.

export interface MailResult {
  sent: boolean;
  simulated: boolean;
  error?: string;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<MailResult> {
  if (!isMailConfigured()) {
    console.log(`[mail] simulated — to: ${to} | subject: ${subject}`);
    return { sent: false, simulated: true };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"EasyClient" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true, simulated: false };
  } catch (err) {
    console.error('[mail] send failed:', (err as Error).message);
    return { sent: false, simulated: false, error: (err as Error).message };
  }
}
