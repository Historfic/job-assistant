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

/**
 * Called as soon as ONE source answers, rather than when the slowest does.
 *
 * OnlineJobs.ph typically returns in ten seconds while the Apify actors for
 * LinkedIn and Upwork take thirty to sixty. Waiting for all three before doing
 * anything wastes the difference, which is most of the search.
 */
export interface SourceProgress {
  onSourceDone?: (source: JobSource, jobs: RawJob[]) => void | Promise<void>;
  onSourceError?: (error: SourceError) => void;
}

export async function getJobsFromSources(
  sources: JobSource[],
  opts: SourceSearchOptions,
  progress: SourceProgress = {},
): Promise<{ jobs: RawJob[]; errors: SourceError[]; isLive: boolean }> {
  const results = await Promise.allSettled(
    sources.map(async source => {
      const report = async (jobs: RawJob[]) => {
        // Awaited so a slow consumer (analysing and streaming these jobs)
        // finishes before this source is considered handled.
        //
        // Caught, because the consumer's failure is not the source's: letting
        // it reject rejected this whole source, so its scraped jobs vanished
        // and the user was told the site had not responded.
        try {
          await progress.onSourceDone?.(source, jobs);
        } catch (err) {
          console.error(`[sources] consumer failed for ${source}`, err);
        }
        return jobs;
      };
      if (!isLiveEnabled(source)) {
        if (process.env.DEMO_MODE === 'false' && source !== 'onlinejobs') {
          throw new Error('APIFY_TOKEN is not set — this source was skipped');
        }
        // Mocks mirror the adapters' pagination behavior
        if ((opts.page ?? 0) > 0 && source !== 'onlinejobs') return report([]);
        return report(mockJobsFor(source, opts.keyword, opts.limit));
      }
      try {
        return await report(await ADAPTERS[source].searchJobs(opts));
      } catch (err) {
        // Announced here rather than after Promise.allSettled resolves, so the
        // UI can say "LinkedIn did not respond" while the others are still
        // working instead of at the very end.
        progress.onSourceError?.({ source, message: (err as Error)?.message ?? 'Unknown error' });
        throw err;
      }
    }),
  );

  const perSourceJobs: RawJob[][] = [];
  const errors: SourceError[] = [];
  let isLive = false;
  results.forEach((r, i) => {
    const source = sources[i];
    if (r.status === 'fulfilled') {
      perSourceJobs.push(r.value);
      if (isLiveEnabled(source) && r.value.length > 0) isLive = true;
    } else {
      // Already announced above, at the moment it happened.
      errors.push({ source, message: (r.reason as Error)?.message ?? 'Unknown error' });
    }
  });

  // Round-robin interleave across sources so a multi-source search doesn't
  // get dominated by whichever source happens to be first (spec: fair mix).
  const jobs: RawJob[] = [];
  const maxLen = Math.max(0, ...perSourceJobs.map(arr => arr.length));
  for (let i = 0; i < maxLen; i++) {
    for (const arr of perSourceJobs) {
      if (i < arr.length) jobs.push(arr[i]);
    }
  }

  return { jobs, errors, isLive };
}
