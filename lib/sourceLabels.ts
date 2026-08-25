// One place deciding how each job source looks, so a badge on a card and a
// filter chip above the list can never disagree about what LinkedIn is called
// or coloured.
//
// Jobs scraped before multi-source support have no `source` field; they came
// from OnlineJobs.ph, which is what the fallback assumes.

import type { JobSource } from '@/types';

export const SOURCE_ORDER: JobSource[] = ['onlinejobs', 'linkedin', 'upwork'];

export const SOURCE_LABEL: Record<JobSource, string> = {
  onlinejobs: 'OnlineJobs.ph',
  linkedin:   'LinkedIn',
  upwork:     'Upwork',
};

/** Badge colours. Each source gets its own hue so the list is scannable. */
export const SOURCE_BADGE: Record<JobSource, string> = {
  onlinejobs: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  linkedin:   'bg-sky-500/10 text-sky-300 border-sky-500/25',
  upwork:     'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
};

export function jobSource(job: { source?: JobSource }): JobSource {
  return job.source ?? 'onlinejobs';
}

/** How many jobs came from each source, in a stable display order. */
export function countBySource<T extends { source?: JobSource }>(
  jobs: T[],
): Array<{ source: JobSource; count: number }> {
  const counts = new Map<JobSource, number>();
  for (const job of jobs) {
    const s = jobSource(job);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return SOURCE_ORDER
    .filter(s => counts.has(s))
    .map(s => ({ source: s, count: counts.get(s)! }));
}
