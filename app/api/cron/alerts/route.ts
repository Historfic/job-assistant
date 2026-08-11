// ─── POST /api/cron/alerts ────────────────────────────────────────────────────
// Runs every enabled alert that's due, emails any genuinely new listings, and
// records what was sent so nothing is reported twice.
//
// Called by an external scheduler (GitHub Actions — see
// .github/workflows/daily-alerts.yml) with the CRON_SECRET as a bearer token.
// Without CRON_SECRET set the endpoint is disabled entirely rather than open.
//
// Deliberately cheap: alerts skip AI analysis and reuse the raw source
// adapters. Every run costs real money and this is a one-time-payment product.

import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, createSupabaseAdmin } from '@/lib/supabase/admin';
import { getJobsFromSources } from '@/lib/sources';
import { normalizeSources } from '@/lib/sources/types';
import { evaluateSalary } from '@/lib/salaryEvaluator';
import { sendMail } from '@/lib/mailer';
import { buildAlertHtml, buildAlertSubject } from '@/lib/alertEmail';
import type { JobSource, RawJob } from '@/types';

export const maxDuration = 300; // many alerts, each doing network work

const MAX_JOBS_PER_EMAIL = 8;
const MIN_HOURS_BETWEEN_RUNS = 20; // daily-ish, tolerant of scheduler drift
const SEEN_URL_CAP = 400;          // keep rows from growing without bound

interface AlertRow {
  user_id: string;
  keyword: string;
  sources: string[];
  min_salary: number | null;
  job_type: string | null;
  seen_urls: string[];
  last_run_at: string | null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Alerts are not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Alerts need SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
  }

  const supabase = createSupabaseAdmin();
  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_RUNS * 3_600_000).toISOString();

  const { data: alerts, error } = await supabase
    .from('job_alerts')
    .select('user_id,keyword,sources,min_salary,job_type,seen_urls,last_run_at')
    .eq('enabled', true)
    .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`);

  if (error) {
    console.error('[cron/alerts] could not load alerts:', error.message);
    return NextResponse.json({ error: 'Could not load alerts' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  let emailed = 0;
  let checked = 0;

  for (const alert of (alerts ?? []) as AlertRow[]) {
    checked++;
    try {
      const fresh = await findNewJobs(alert);
      // Always stamp the run, even with nothing to send, so a quiet alert
      // doesn't get retried on every scheduler tick.
      const seen = mergeSeen(alert.seen_urls, fresh);
      await supabase.from('job_alerts')
        .update({ last_run_at: new Date().toISOString(), seen_urls: seen })
        .eq('user_id', alert.user_id);

      if (fresh.length === 0) continue;

      const { data: profile } = await supabase
        .from('profiles').select('email').eq('id', alert.user_id).maybeSingle();
      if (!profile?.email) continue;

      const result = await sendMail(
        profile.email,
        buildAlertSubject(fresh.length, alert.keyword),
        buildAlertHtml(fresh, alert.keyword, appUrl),
      );
      if (result.sent || result.simulated) emailed++;
    } catch (err) {
      // One broken alert must not stop the rest
      console.error(`[cron/alerts] alert for ${alert.user_id} failed:`, (err as Error).message);
    }
  }

  return NextResponse.json({ checked, emailed });
}

/** Search this alert's sources and return listings the user hasn't been sent. */
async function findNewJobs(alert: AlertRow): Promise<RawJob[]> {
  const sources = normalizeSources(alert.sources) as JobSource[];
  const { jobs } = await getJobsFromSources(sources, {
    keyword: alert.keyword,
    limit: 15,
  });

  const seen = new Set(alert.seen_urls);
  return jobs
    .filter(job => job.url && !seen.has(job.url))
    .filter(job => {
      if (alert.min_salary == null) return true;
      return evaluateSalary(job.salary, alert.min_salary).approved;
    })
    .filter(job => {
      if (!alert.job_type || alert.job_type === 'any') return true;
      const et = (job.employmentType ?? '').toLowerCase();
      if (alert.job_type === 'full-time') return et.includes('full');
      if (alert.job_type === 'part-time') return et.includes('part');
      if (alert.job_type === 'freelance') return et.includes('gig') || et.includes('freelan');
      return true;
    })
    .slice(0, MAX_JOBS_PER_EMAIL);
}

function mergeSeen(existing: string[], fresh: RawJob[]): string[] {
  const urls = fresh.map(j => j.url).filter((u): u is string => Boolean(u));
  return [...urls, ...existing].slice(0, SEEN_URL_CAP);
}
