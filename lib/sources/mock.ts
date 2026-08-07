import { generateMockJobs } from '@/lib/mockJobs';
import type { JobSource, RawJob } from '@/types';

// Deterministic per-source mock URLs so applied/rejected tracking (keyed by
// URL) behaves consistently across demo searches.
const URL_BUILDERS: Record<JobSource, (i: number) => string> = {
  onlinejobs: i => `https://www.onlinejobs.ph/jobseekers/job/mock-${i}`,
  linkedin:   i => `https://www.linkedin.com/jobs/view/90000${i}`,
  upwork:     i => `https://www.upwork.com/jobs/~mock${i}`,
};

export function mockJobsFor(source: JobSource, keyword: string, count: number): RawJob[] {
  return generateMockJobs(keyword, count).map((job, i) => ({
    ...job,
    id: `${source}-${job.id}`,
    source,
    url: URL_BUILDERS[source](i),
  }));
}
