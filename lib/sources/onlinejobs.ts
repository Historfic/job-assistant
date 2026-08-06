// ─── OnlineJobs.ph Source Adapter ─────────────────────────────────────────────
// Cheerio scraper for the public jobsearch pages. Works WITHOUT a session
// cookie; the cookie (when the user connected their OJ account) only makes
// individual job-detail fetches richer.

import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';

// OnlineJobs.ph paginates with a URL path segment that's the offset, NOT a
// page number (e.g. .../jobsearch/30 is page 2, .../jobsearch/60 is page 3).
// 30 listings per page — confirmed from the rendered pagination nav.
const PAGE_SIZE = 30;

export async function scrapeFromOnlineJobs(
  keyword: string,
  sessionCookie?: string,
  limit = 10,
  page = 0,
): Promise<RawJob[]> {
  const { load } = await import('cheerio');
  const offset = page * PAGE_SIZE;
  const pathSuffix = offset > 0 ? `/${offset}` : '';
  const url = `https://www.onlinejobs.ph/jobseekers/jobsearch${pathSuffix}?jobkeyword=${encodeURIComponent(keyword)}`;

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
        source: 'onlinejobs',
      });
    }
  });

  return jobs;
}

// ─── Individual job detail fetcher ───────────────────────────────────────────
// The list page only has a short description snippet (or nothing when JS-gated).
// Each individual job page at /jobseekers/job/<slug> is server-rendered HTML
// and contains the full description + requirements — perfect for AI analysis.

export async function fetchJobDetails(
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
      const joined = paragraphs.join(' ').slice(0, 5000);
      if (joined.length > fullDescription.length) fullDescription = joined;
    }

    // Only update if we got something richer than what we had
    if (fullDescription.length > (job.description?.length ?? 0)) {
      return { ...job, description: fullDescription.slice(0, 5000) };
    }
  } catch {
    // Non-fatal — just return the job as-is
  }

  return job;
}

// ─── Batch detail enrichment ──────────────────────────────────────────────────
// Fetches individual job pages concurrently (max 5 at a time to avoid
// rate-limiting) and enriches each job with its full description.

export async function enrichJobsWithDetails(
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

export const onlineJobsAdapter: SourceAdapter = {
  id: 'onlinejobs',
  async searchJobs(opts: SourceSearchOptions): Promise<RawJob[]> {
    const raw = await scrapeFromOnlineJobs(
      opts.keyword,
      opts.ojSessionCookie,
      opts.limit,
      opts.page ?? 0,
    );
    if (raw.length === 0) return [];
    const enriched = await enrichJobsWithDetails(raw, opts.ojSessionCookie);
    return enriched.map(j => ({ ...j, source: 'onlinejobs' as const }));
  },
};
