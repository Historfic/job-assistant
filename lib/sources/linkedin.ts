import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { runApifyActor, pickString } from './apify';

// Actor is env-overridable: set APIFY_LINKEDIN_ACTOR to any Apify Store
// LinkedIn-jobs scraper slug (owner~actor-name). Mapping below is defensive
// across the common output shapes.
const DEFAULT_ACTOR = 'bebity~linkedin-jobs-scraper';

export function mapLinkedInItem(
  item: Record<string, unknown>,
  idx: number,
  keyword: string,
): RawJob {
  return {
    id: `linkedin-${idx}-${Date.now()}`,
    source: 'linkedin',
    title: pickString(item, ['title', 'jobTitle', 'position']),
    companyName: pickString(item, ['companyName', 'company', 'companyUniversalName']),
    employmentType: pickString(item, ['contractType', 'employmentType', 'jobType']),
    url: pickString(item, ['jobUrl', 'link', 'url']),
    salary: pickString(item, ['salary', 'salaryInfo']),
    description: pickString(item, ['description', 'descriptionText', 'jobDescription']),
    datePosted: pickString(item, ['postedTime', 'publishedAt', 'postedDate']),
    query: keyword,
  };
}

export const linkedInAdapter: SourceAdapter = {
  id: 'linkedin',
  async searchJobs(opts: SourceSearchOptions): Promise<RawJob[]> {
    if ((opts.page ?? 0) > 0) return []; // one Apify run per search — no pagination re-runs
    const actor = process.env.APIFY_LINKEDIN_ACTOR ?? DEFAULT_ACTOR;
    const items = await runApifyActor(actor, {
      title: opts.keyword,
      location: 'Philippines',
      rows: Math.min(opts.limit, 25),
      proxy: { useApifyProxy: true },
    });
    return items
      .map((it, i) => mapLinkedInItem(it as Record<string, unknown>, i, opts.keyword))
      .filter(j => j.title);
  },
};
