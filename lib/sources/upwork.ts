import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { runApifyActor, pickString } from './apify';

// Input below matches neatrat/upwork-job-scraper's schema: `query` and
// `perPage`, not the `searchQuery`/`maxItems` an earlier actor used. Override
// with APIFY_UPWORK_ACTOR if you switch actors — and check its input names,
// since they differ between them.
const DEFAULT_ACTOR = 'neatrat~upwork-job-scraper';

// Field names confirmed against a live run of neatrat~upwork-job-scraper.
export function mapUpworkItem(
  item: Record<string, unknown>,
  idx: number,
  keyword: string,
): RawJob {
  // The actor reports "N/A" for budget on hourly posts; show the client's
  // average rate instead of a meaningless placeholder.
  const budget = pickString(item, ['budget', 'hourlyRate', 'amount', 'fixedPrice']);
  const avgRate = pickString(item, ['clientAvgHourlyRate']);
  const salary = budget && budget !== 'N/A' ? budget : avgRate;

  // The actor builds its url from the highlighted search markup, so it arrives
  // as .../Social-Media-span-class-highlight-Virtual-span-... plus a referrer
  // query. subId is Upwork's canonical permalink id, so rebuild from that.
  const subId = pickString(item, ['subId']);
  const url = subId
    ? `https://www.upwork.com/jobs/${subId.startsWith('~') ? subId : `~${subId}`}`
    : pickString(item, ['url', 'link', 'jobUrl', 'jobLink']);

  return {
    id: `upwork-${idx}-${Date.now()}`,
    source: 'upwork',
    title: pickString(item, ['title', 'jobTitle', 'name']),
    // Upwork clients are often anonymous; their location is the useful
    // fallback so the card isn't blank.
    companyName: pickString(item, ['clientName', 'client', 'clientLocation', 'company']),
    employmentType: pickString(item, ['jobType', 'type', 'engagement', 'contractType']),
    url,
    salary,
    description: pickString(item, ['description', 'descriptionText', 'snippet', 'jobDescription']),
    datePosted: pickString(item, ['absoluteDate', 'relativeDate', 'publishedOn', 'postedOn', 'datePosted']),
    query: keyword,
  };
}

export const upworkAdapter: SourceAdapter = {
  id: 'upwork',
  async searchJobs(opts: SourceSearchOptions): Promise<RawJob[]> {
    if ((opts.page ?? 0) > 0) return [];
    const actor = process.env.APIFY_UPWORK_ACTOR ?? DEFAULT_ACTOR;
    const items = await runApifyActor(actor, {
      query: opts.keyword,
      perPage: Math.max(10, Math.min(opts.limit, 25)), // actor rejects perPage < 10
      pagesToScrape: 1,
      sort: 'newest',
    });
    return items
      .map((it, i) => mapUpworkItem(it as Record<string, unknown>, i, opts.keyword))
      .filter(j => j.title);
  },
};
