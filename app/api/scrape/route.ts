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
import { generateMockJobs } from '@/lib/mockJobs';
import { analyzeJobs, generateApplicationMessage, scoreJob } from '@/lib/aiAnalyzer';

export const maxDuration = 60; // Vercel: allow up to 60s for scraping + AI

const MAX_PASSES   = 3;   // maximum scrape iterations
const BATCH_FACTOR = 1.5; // over-fetch to compensate for filtered-out jobs

// ─── Live scraper (cheerio + fetch) ─────────────────────────────────────────

async function scrapeFromOnlineJobs(
  keyword: string,
  sessionCookie?: string,
  limit = 10
): Promise<RawJob[]> {
  const { load } = await import('cheerio');
  const url = `https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=${encodeURIComponent(keyword)}`;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };
  if (sessionCookie) {
    headers['Cookie'] = `ci_session=${sessionCookie}`;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from onlinejobs.ph`);

  const html = await res.text();
  const $ = load(html);
  const jobs: RawJob[] = [];

  // Selectors confirmed from the existing scraper's DOM inspection
  $('.latest-job-post').each((idx, card) => {
    if (jobs.length >= limit * 2) return; // over-fetch buffer

    // Company name
    const logoImg = $(card).find('.jobpost-cat-box-logo');
    const companyName = logoImg.length ? (logoImg.attr('alt') ?? null) : null;

    // Employment type badge
    const badgeEl = $(card).find('h4 .badge');
    const employmentType = badgeEl.length ? badgeEl.text().trim() || null : null;

    // Title — clone h4, remove badge span
    const h4 = $(card).find('h4').first();
    const titleText = h4.clone().find('span').remove().end().text().trim() || null;

    // URL — the slug URL is on the <a> that WRAPS the card div, not inside it.
    // Structure: <a href="/jobseekers/job/Title-Slug-ID"><div class="latest-job-post">...</div></a>
    const wrapperAnchor = $(card).parent('a[href*="/jobseekers/job/"]');
    let jobUrl: string | null = wrapperAnchor.length
      ? (wrapperAnchor.attr('href') ?? null)
      : null;

    // Fallback: the "See More" link inside .desc (numeric ID URL)
    if (!jobUrl) {
      const seeMore = $(card).find('.desc a[href*="/jobseekers/job/"]').first();
      jobUrl = seeMore.length ? (seeMore.attr('href') ?? null) : null;
    }
    if (jobUrl && !jobUrl.startsWith('http')) jobUrl = `https://www.onlinejobs.ph${jobUrl}`;

    // Salary
    const salaryEl = $(card).find('dd.col').first();
    const salary = salaryEl.length ? salaryEl.text().trim() || null : null;

    // Description snippet
    const descDiv = $(card).find('.desc');
    let description: string | null = null;
    if (descDiv.length) {
      const descAnchor = descDiv.find('a').not('[target="_blank"]').first();
      const text = descAnchor.length ? descAnchor.text() : descDiv.text();
      description = text.trim().replace(/\s+/g, ' ').slice(0, 400) || null;
    }

    // Date posted
    const dateEl = $(card).find('[data-temp]').first();
    const datePosted = dateEl.length
      ? (dateEl.attr('data-temp') ?? dateEl.text().trim() ?? null)
      : null;

    if (titleText) {
      jobs.push({
        id: `live-${idx}-${Date.now()}`,
        companyName,
        employmentType,
        title: titleText,
        url: jobUrl,
        salary,
        description,
        datePosted,
        query: keyword,
      });
    }
  });

  return jobs;
}

// ─── Individual job detail fetcher ───────────────────────────────────────────
// The list page only has a short description snippet (or nothing when JS-gated).
// Each individual job page at /jobseekers/job/<slug> is server-rendered HTML
// and contains the full description + requirements — perfect for AI analysis.

async function fetchJobDetails(
  job: RawJob,
  sessionCookie?: string
): Promise<RawJob> {
  if (!job.url) return job;

  try {
    const { load } = await import('cheerio');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (sessionCookie) headers['Cookie'] = `ci_session=${sessionCookie}`;

    // follow redirects (numeric ID → slug URL)
    const res = await fetch(job.url, { headers, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    if (!res.ok) return job;

    const html = await res.text();
    const $ = load(html);

    // Confirmed selector from live DOM inspection: <p id="job-description" class="job-description">
    const descSelectors = [
      '#job-description',
      '.job-description',
      '.jobpost-details',
      '.job-details',
      '.description-content',
    ];

    let fullDescription = '';
    for (const sel of descSelectors) {
      const el = $(sel);
      if (el.length) {
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (text.length > fullDescription.length) fullDescription = text;
      }
    }

    // If no specific selector worked, grab all paragraph text from main content
    if (fullDescription.length < 100) {
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) paragraphs.push(t);
      });
      const joined = paragraphs.join(' ').slice(0, 2000);
      if (joined.length > fullDescription.length) fullDescription = joined;
    }

    // Only update if we got something richer than what we had
    if (fullDescription.length > (job.description?.length ?? 0)) {
      return { ...job, description: fullDescription.slice(0, 2000) };
    }
  } catch {
    // Non-fatal — just return the job as-is
  }

  return job;
}

// ─── Batch detail enrichment ──────────────────────────────────────────────────
// Fetches individual job pages concurrently (max 5 at a time to avoid
// rate-limiting) and enriches each job with its full description.

async function enrichJobsWithDetails(
  jobs: RawJob[],
  sessionCookie?: string,
  concurrency = 5
): Promise<RawJob[]> {
  const results: RawJob[] = [];

  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const enriched = await Promise.all(
      batch.map(j => fetchJobDetails(j, sessionCookie))
    );
    results.push(...enriched);
    // Small pause between batches to be polite to the server
    if (i + concurrency < jobs.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

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
    const { keyword, limit = 10, sessionCookie, jobType, datePosted: dateFilter,
            minSalary, maxSalary } = options;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const demoMode = process.env.DEMO_MODE !== 'false'; // default true
    const targetCount = Math.min(Math.max(limit, 1), 30);

    const validJobs: AnalyzedJob[] = [];
    const removedJobs: Array<{ job: RawJob; reason: string }> = [];
    const seenUrls = new Set<string>();
    let totalScraped = 0;
    let passes = 0;
    let isLiveData = false;

    // ── Scrape + analyze loop ─────────────────────────────────────────────────
    while (validJobs.length < targetCount && passes < MAX_PASSES) {
      passes++;
      const needed = Math.ceil((targetCount - validJobs.length) * BATCH_FACTOR) + 5;

      let rawBatch: RawJob[] = [];

      if (!demoMode) {
        try {
          rawBatch = await scrapeFromOnlineJobs(keyword, sessionCookie, needed);

          // Enrich each job with its full description from the detail page.
          // This is the critical step — the list page only has snippet text
          // (or nothing if JS-gated), but individual job pages are static HTML
          // with complete descriptions that the AI can properly analyze.
          if (rawBatch.length > 0) {
            rawBatch = await enrichJobsWithDetails(rawBatch, sessionCookie);
            isLiveData = true;
          }
        } catch {
          // Live scrape failed — use mock
        }
      }

      // Fall back to mock if no results or demo mode
      if (rawBatch.length === 0) {
        rawBatch = generateMockJobs(keyword, needed);
      }

      totalScraped += rawBatch.length;

      // Apply pre-filters before AI analysis (salary, job type, date)
      const preFiltered = rawBatch.filter(job => {
        if (seenUrls.has(job.url ?? '')) return false;
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
