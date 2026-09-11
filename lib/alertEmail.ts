// Email body for a daily job alert. Plain, mobile-first HTML — most recipients
// open this on a phone, and email clients ignore most modern CSS.

import type { RawJob } from '@/types';
import { formatPosted, formatRate, parsePostedAt } from '@/lib/jobMeta';

const SOURCE_LABEL: Record<string, string> = {
  onlinejobs: 'OnlineJobs.ph',
  linkedin: 'LinkedIn',
  upwork: 'Upwork',
};

export function buildAlertSubject(count: number, keyword: string): string {
  return count === 1
    ? `1 new ${keyword} job today`
    : `${count} new ${keyword} jobs today`;
}

export function buildAlertHtml(
  jobs: RawJob[],
  keyword: string,
  appUrl: string,
  now: Date = new Date(),
): string {
  // Newest first. With a post time on every row any other order reads as a
  // jumble, and the newest post is the one with the fewest applicants yet.
  // Undated listings go last rather than being guessed into place.
  const postedMs = (job: RawJob) => parsePostedAt(job.datePosted)?.at.getTime() ?? 0;
  const ordered = [...jobs].sort((a, b) => postedMs(b) - postedMs(a));

  const rows = ordered.map(job => {
    const title = escapeHtml(job.title ?? 'Untitled role');
    const company = job.companyName ? escapeHtml(job.companyName) : '';
    const source = SOURCE_LABEL[job.source ?? 'onlinejobs'] ?? '';
    const who = [company, source].filter(Boolean).join(' · ');
    const link = job.url ?? appUrl;

    // Rate and post time get a labelled line each. Run together with the
    // company, a listing whose salary field just says "2" read as a company
    // called 2; sharing one line, a long rate pushed the time onto the next
    // line on a phone, split from its label. "Not listed" is shown rather than
    // dropping the rate, so a missing figure reads as the employer's choice
    // and not a broken email.
    const rate = formatRate(job);
    const posted = formatPosted(job.datePosted, now);
    const line = 'color:#111827;font-size:13px;margin-top:2px;';
    const label = '<span style="color:#6b7280;">';

    return `
      <tr><td style="padding:0 0 16px 0;">
        <a href="${escapeHtml(link)}" style="color:#2563eb;font-size:15px;font-weight:600;text-decoration:none;">${title}</a>
        ${who ? `<div style="color:#6b7280;font-size:13px;margin-top:3px;">${who}</div>` : ''}
        <div style="${line}">${label}Rate:</span> ${rate ? `<strong>${escapeHtml(rate)}</strong>` : '<span style="color:#9ca3af;">Not listed</span>'}</div>
        ${posted ? `<div style="${line}">${label}Posted:</span> <strong>${escapeHtml(posted)}</strong></div>` : ''}
      </td></tr>`;
  }).join('');

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px 20px;color:#111827;">
    <p style="font-size:13px;color:#6b7280;margin:0 0 4px 0;">EasyClient</p>
    <h1 style="font-size:19px;margin:0 0 4px 0;">New ${escapeHtml(keyword)} jobs for you</h1>
    <p style="font-size:12px;color:#9ca3af;margin:0 0 18px 0;">Newest first. Times are Philippine time.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    <p style="margin:22px 0 0 0;">
      <a href="${escapeHtml(appUrl)}/dashboard" style="background:#2563eb;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-size:14px;display:inline-block;">Open EasyClient</a>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin-top:26px;line-height:1.5;">
      You're getting this because you turned on daily alerts in EasyClient.
      Turn them off any time from your account menu.
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
