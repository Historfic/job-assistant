import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { runApifyActor, pickString } from './apify';

// Env-overridable: set APIFY_UPWORK_ACTOR to the Upwork-jobs scraper slug you
// picked on the Apify Store (owner~actor-name).
const DEFAULT_ACTOR = 'memo23~apify-upwork-jobs-scraper';

export function mapUpworkItem(
  item: Record<string, unknown>,
  idx: number,
  keyword: string,
): RawJob {
  return {
    id: `upwork-${idx}-${Date.now()}`,
    source: 'upwork',
    title: pickString(item, ['title', 'jobTitle']),
    companyName: pickString(item, ['clientName', 'company']), // usually anonymous on Upwork
    employmentType: pickString(item, ['jobType', 'engagement', 'type']),
    url: pickString(item, ['link', 'url', 'jobUrl']),
    salary: pickString(item, ['hourlyRate', 'budget', 'price', 'salary']),
    description: pickString(item, ['description', 'descriptionText', 'snippet']),
    datePosted: pickString(item, ['postedOn', 'publishedAt', 'datePosted']),
    query: keyword,
  };
}

export const upworkAdapter: SourceAdapter = {
  id: 'upwork',
  async searchJobs(opts: SourceSearchOptions): Promise<RawJob[]> {
    if ((opts.page ?? 0) > 0) return [];
    const actor = process.env.APIFY_UPWORK_ACTOR ?? DEFAULT_ACTOR;
    const items = await runApifyActor(actor, {
      searchQuery: opts.keyword,
      maxItems: Math.min(opts.limit, 25),
      proxy: { useApifyProxy: true },
    });
    return items
      .map((it, i) => mapUpworkItem(it as Record<string, unknown>, i, opts.keyword))
      .filter(j => j.title);
  },
};
