// Email body for a daily job alert. Plain, mobile-first HTML — most recipients
// open this on a phone, and email clients ignore most modern CSS.

import type { RawJob } from '@/types';

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
): string {
  const rows = jobs.map(job => {
    const title = escapeHtml(job.title ?? 'Untitled role');
    const company = job.companyName ? escapeHtml(job.companyName) : '';
    const salary = job.salary ? escapeHtml(job.salary) : '';
    const source = SOURCE_LABEL[job.source ?? 'onlinejobs'] ?? '';
    const meta = [company, salary, source].filter(Boolean).join(' · ');
    const link = job.url ?? appUrl;

    return `
      <tr><td style="padding:0 0 14px 0;">
        <a href="${escapeHtml(link)}" style="color:#2563eb;font-size:15px;font-weight:600;text-decoration:none;">${title}</a>
        ${meta ? `<div style="color:#6b7280;font-size:13px;margin-top:3px;">${meta}</div>` : ''}
      </td></tr>`;
  }).join('');

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px 20px;color:#111827;">
    <p style="font-size:13px;color:#6b7280;margin:0 0 4px 0;">JobIQ</p>
    <h1 style="font-size:19px;margin:0 0 18px 0;">New ${escapeHtml(keyword)} jobs for you</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    <p style="margin:22px 0 0 0;">
      <a href="${escapeHtml(appUrl)}/dashboard" style="background:#2563eb;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-size:14px;display:inline-block;">Open JobIQ</a>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin-top:26px;line-height:1.5;">
      You're getting this because you turned on daily alerts in JobIQ.
      Turn them off any time from your account menu.
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
