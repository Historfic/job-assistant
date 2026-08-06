// ─── Multi-source fan-out ─────────────────────────────────────────────────────
// Per-source failures are isolated: a dead source lands in `errors` while the
// others' jobs still return (spec: Error Handling).

import type { JobSource, RawJob, SourceError } from '@/types';
import type { SourceAdapter, SourceSearchOptions } from './types';
import { onlineJobsAdapter } from './onlinejobs';
import { linkedInAdapter } from './linkedin';
import { upworkAdapter } from './upwork';
import { mockJobsFor } from './mock';

const ADAPTERS: Record<JobSource, SourceAdapter> = {
  onlinejobs: onlineJobsAdapter,
  linkedin: linkedInAdapter,
  upwork: upworkAdapter,
};

// Live only when DEMO_MODE=false; Apify sources additionally need a token.
function isLiveEnabled(source: JobSource): boolean {
  if (process.env.DEMO_MODE !== 'false') return false;
  if (source === 'onlinejobs') return true; // public pages, no key needed
  return Boolean(process.env.APIFY_TOKEN);
}

export async function getJobsFromSources(
  sources: JobSource[],
  opts: SourceSearchOptions,
): Promise<{ jobs: RawJob[]; errors: SourceError[]; isLive: boolean }> {
  const results = await Promise.allSettled(
    sources.map(async source => {
      if (!isLiveEnabled(source)) {
        // Mocks mirror the adapters' pagination behavior
        if ((opts.page ?? 0) > 0 && source !== 'onlinejobs') return [] as RawJob[];
        return mockJobsFor(source, opts.keyword, opts.limit);
      }
      return ADAPTERS[source].searchJobs(opts);
    }),
  );

  const jobs: RawJob[] = [];
  const errors: SourceError[] = [];
  let isLive = false;
  results.forEach((r, i) => {
    const source = sources[i];
    if (r.status === 'fulfilled') {
      jobs.push(...r.value);
      if (isLiveEnabled(source) && r.value.length > 0) isLive = true;
    } else {
      errors.push({ source, message: (r.reason as Error)?.message ?? 'Unknown error' });
    }
  });
  return { jobs, errors, isLive };
}
