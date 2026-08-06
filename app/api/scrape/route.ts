// ─── POST /api/scrape ─────────────────────────────────────────────────────────
// Full pipeline: scrape → AI analysis → filter → loop until quota → score
//
// Scraping strategy:
//   1. If DEMO_MODE=true (default for Vercel): generate mock jobs
//   2. Otherwise: attempt live cheerio+fetch scrape from onlinejobs.ph
//      If the live scrape returns 0 results (JS-rendered), fall back to mock.
//
// The loop logic:
//   - Scrape a batch
//   - Analyze (some jobs get removed for file-upload requirement)
//   - If valid < requested → scrape another batch (up to MAX_PASSES times)

import { NextRequest, NextResponse } from 'next/server';
import type { RawJob, ScrapeOptions, ProcessResult, AnalyzedJob } from '@/types';
import { evaluateSalary } from '@/lib/salaryEvaluator';
import { analyzeJobs, generateApplicationMessage, scoreJob } from '@/lib/aiAnalyzer';
import { scrapeFromOnlineJobs, enrichJobsWithDetails } from '@/lib/sources/onlinejobs';

export const maxDuration = 60; // Vercel: allow up to 60s for scraping + AI

const MAX_PASSES   = 3;   // maximum scrape iterations
const BATCH_FACTOR = 1.5; // over-fetch to compensate for filtered-out jobs

// ─── Job type filter ─────────────────────────────────────────────────────────

function matchesJobType(job: RawJob, jobType?: string): boolean {
  if (!jobType || jobType === 'any') return true;
  const et = (job.employmentType ?? '').toLowerCase();
  if (jobType === 'full-time') return et.includes('full') || et === 'any';
  if (jobType === 'part-time') return et.includes('part');
  if (jobType === 'freelance') return et.includes('gig') || et.includes('freelan');
  return true;
}

// ─── Date filter ─────────────────────────────────────────────────────────────

function matchesDatePosted(job: RawJob, filter?: string): boolean {
  if (!filter || !job.datePosted) return true;
  const posted = new Date(job.datePosted);
  if (isNaN(posted.getTime())) return true;
  const now = Date.now();
  const diffHours = (now - posted.getTime()) / 3_600_000;
  if (filter === '24h') return diffHours <= 24;
  if (filter === '7d') return diffHours <= 168;
  if (filter === '30d') return diffHours <= 720;
  return true;
}

// ─── Aggregate helper ────────────────────────────────────────────────────────

function aggregateSkills(jobs: AnalyzedJob[]): string[] {
  const freq: Record<string, number> = {};
  jobs.forEach(j => j.analysis.skills.forEach(s => { freq[s] = (freq[s] ?? 0) + 1; }));
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);
}

function aggregateKeywords(jobs: AnalyzedJob[], baseKeyword: string): string[] {
  const freq: Record<string, number> = {};
  jobs.forEach(j => j.analysis.keywords.forEach(k => { freq[k] = (freq[k] ?? 0) + 1; }));
  freq[baseKeyword] = (freq[baseKeyword] ?? 0) + 3; // boost the search keyword
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw]) => kw);
}

function commonRequirements(jobs: AnalyzedJob[]): string[] {
  const patterns = [
    { label: 'Resume/CV required', test: (j: AnalyzedJob) => j.analysis.requires_cv },
    { label: 'Platform redirect', test: (j: AnalyzedJob) => j.analysis.platform_redirect },
    { label: 'English communication', test: (j: AnalyzedJob) => (j.description ?? '').toLowerCase().includes('english') },
    { label: 'Remote/work from home', test: (j: AnalyzedJob) => (j.description ?? '').toLowerCase().includes('remote') },
    { label: 'Full-time availability', test: (j: AnalyzedJob) => (j.employmentType ?? '').toLowerCase().includes('full') },
  ];
  return patterns
    .filter(p => jobs.filter(j => p.test(j)).length > jobs.length * 0.3)
    .map(p => p.label);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const options: ScrapeOptions = await req.json();
    const { keyword, limit = 10, jobType, datePosted: dateFilter,
            minSalary, maxSalary, excludeUrls = [] } = options;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }

    // Read OJ.ph session from httpOnly cookie set at login
    const sessionCookie = req.cookies.get('oj_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated. Please sign in.' }, { status: 401 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const targetCount = Math.min(Math.max(limit, 1), 30);

    const validJobs: AnalyzedJob[] = [];
    const removedJobs: Array<{ job: RawJob; reason: string }> = [];
    // Pre-seed with URLs the client says to skip (already applied / rejected).
    // The existing dedupe check at the top of the pre-filter will drop them.
    const excludeSet = new Set<string>(excludeUrls);
    const seenUrls = new Set<string>(excludeSet);
    const excludedCounted = new Set<string>(); // urls counted toward excludedAsMarked (dedup across passes)
    let totalScraped = 0;
    let excludedAsMarked = 0;
    let passes = 0;
    let isLiveData = false;

    // ── Scrape + analyze loop ─────────────────────────────────────────────────
    // Each pass scrapes the next page of OnlineJobs.ph results (page-size 30)
    // so we can keep finding fresh listings even when many URLs are already
    // applied/rejected and being filtered out client-side.
    while (validJobs.length < targetCount && passes < MAX_PASSES) {
      const currentPage = passes; // 0-indexed: pass 0 = first page, pass 1 = offset 30, etc.
      passes++;
      const needed = Math.ceil((targetCount - validJobs.length) * BATCH_FACTOR) + 5;

      let rawBatch: RawJob[] = [];

      rawBatch = await scrapeFromOnlineJobs(keyword, sessionCookie, needed, currentPage);

      if (rawBatch.length > 0) {
        rawBatch = await enrichJobsWithDetails(rawBatch, sessionCookie);
        isLiveData = true;
      }

      if (rawBatch.length === 0) break;

      totalScraped += rawBatch.length;

      // Apply pre-filters before AI analysis (salary, job type, date)
      const preFiltered = rawBatch.filter(job => {
        if (seenUrls.has(job.url ?? '')) {
          // Attribute the drop to the user's applied/rejected list when applicable
          if (job.url && excludeSet.has(job.url) && !excludedCounted.has(job.url)) {
            excludedCounted.add(job.url);
            excludedAsMarked++;
          }
          return false;
        }
        if (job.url) seenUrls.add(job.url);

        const sal = evaluateSalary(job.salary, minSalary ?? 0);
        if (!sal.approved) {
          removedJobs.push({ job, reason: `Salary filter: ${sal.reason}` });
          return false;
        }
        // Max salary filter (rough check)
        if (maxSalary && sal.hourlyRate && sal.hourlyRate > maxSalary) {
          removedJobs.push({ job, reason: `Above max salary $${maxSalary}/hr` });
          return false;
        }
        if (!matchesJobType(job, jobType)) {
          removedJobs.push({ job, reason: `Job type mismatch (wanted: ${jobType})` });
          return false;
        }
        if (!matchesDatePosted(job, dateFilter)) {
          removedJobs.push({ job, reason: `Date filter: posted before ${dateFilter}` });
          return false;
        }

        // Attach hourly rate to job for downstream scoring
        const salEval = evaluateSalary(job.salary, 0);
        job.hourlyRate = salEval.hourlyRate;
        job.salaryReason = salEval.reason;
        return true;
      });

      // AI analysis
      const analyzed = await analyzeJobs(preFiltered, keyword, openRouterKey);

      // Post-AI filter: remove file-upload jobs
      for (const job of analyzed) {
        if (job.analysis.requires_file_upload) {
          removedJobs.push({
            job,
            reason: `Requires file upload: ${job.analysis.required_files.join(', ')}`,
          });
        } else {
          validJobs.push(job);
        }
      }
    }

    // Trim to requested limit
    const finalJobs = validJobs.slice(0, targetCount);

    // Re-score with final keyword context
    finalJobs.forEach(j => { j.score = scoreJob(j, j.analysis, keyword); });

    // Sort by score descending
    finalJobs.sort((a, b) => b.score - a.score);

    // Best matches: top 3
    const bestMatches = finalJobs.slice(0, 3);

    // Aggregated output
    const topSkills = aggregateSkills(finalJobs);
    const suggestedKeywords = aggregateKeywords(finalJobs, keyword);
    const commonReqs = commonRequirements(finalJobs);

    // Generate application message
    const applicationMessage = await generateApplicationMessage(finalJobs, openRouterKey);

    const result: ProcessResult = {
      validJobs: finalJobs,
      removedJobs,
      topSkills,
      commonRequirements: commonReqs,
      suggestedKeywords,
      bestMatches,
      applicationMessage,
      stats: {
        totalScraped,
        totalAnalyzed: validJobs.length + removedJobs.length,
        totalRemoved: removedJobs.length,
        scrapePasses: passes,
        targetRequested: targetCount,
        excludedAsMarked,
      },
      isLiveData,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/scrape]', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
