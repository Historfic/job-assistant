import type { RawJob } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { runApifyActor, pickString } from './apify';

// valig, not bebity: bebity is a monthly-rental actor whose free trial has
// expired, so it returns 403 on a free Apify plan. valig is pay-per-use, rates
// highest of the alternatives, and its input names are almost the same.
// Verified against a live run returning real Philippine listings.
const DEFAULT_ACTOR = 'valig~linkedin-jobs-scraper';

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
    employmentType: pickString(item, ['contractType', 'workType', 'employmentType', 'jobType']),
    url: pickString(item, ['url', 'jobUrl', 'link', 'applyUrl']),
    salary: pickString(item, ['salary', 'salaryInfo']),
    description: pickString(item, ['description', 'descriptionText', 'jobDescription']),
    datePosted: pickString(item, ['postedDate', 'postedTimeAgo', 'publishedAt', 'postedTime']),
    query: keyword,
  };
}

export const linkedInAdapter: SourceAdapter = {
  id: 'linkedin',
  async searchJobs(opts: SourceSearchOptions): Promise<RawJob[]> {
    if ((opts.page ?? 0) > 0) return []; // one paid run per search — no pagination re-runs
    const actor = process.env.APIFY_LINKEDIN_ACTOR ?? DEFAULT_ACTOR;
    const items = await runApifyActor(actor, {
      title: opts.keyword,
      location: 'Philippines',
      limit: Math.min(opts.limit, 25),
    });
    return items
      .map((it, i) => mapLinkedInItem(it as Record<string, unknown>, i, opts.keyword))
      .filter(j => j.title);
  },
};
