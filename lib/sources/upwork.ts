import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { runApifyActor, pickString } from './apify';

// Input below matches neatrat/upwork-job-scraper's schema: `query` and
// `perPage`, not the `searchQuery`/`maxItems` an earlier actor used. Override
// with APIFY_UPWORK_ACTOR if you switch actors — and check its input names,
// since they differ between them.
const DEFAULT_ACTOR = 'neatrat~upwork-job-scraper';

export function mapUpworkItem(
  item: Record<string, unknown>,
  idx: number,
  keyword: string,
): RawJob {
  return {
    id: `upwork-${idx}-${Date.now()}`,
    source: 'upwork',
    title: pickString(item, ['title', 'jobTitle', 'name']),
    // Upwork clients are usually anonymous; fall back to their country so the
    // card isn't blank.
    companyName: pickString(item, ['clientName', 'client', 'company', 'clientCountry', 'country']),
    employmentType: pickString(item, ['jobType', 'type', 'engagement', 'contractType']),
    url: pickString(item, ['url', 'link', 'jobUrl', 'jobLink']),
    salary: pickString(item, [
      'hourlyRate', 'hourlyRateText', 'budget', 'amount', 'price', 'salary', 'fixedPrice',
    ]),
    description: pickString(item, ['description', 'descriptionText', 'snippet', 'jobDescription']),
    datePosted: pickString(item, ['publishedOn', 'postedOn', 'publishedAt', 'datePosted', 'createdOn']),
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
      perPage: Math.min(opts.limit, 25),
      pagesToScrape: 1,
      sort: 'newest',
    });
    return items
      .map((it, i) => mapUpworkItem(it as Record<string, unknown>, i, opts.keyword))
      .filter(j => j.title);
  },
};
