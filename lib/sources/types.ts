// ─── Source Adapter Contract ──────────────────────────────────────────────────
// Every job source (OnlineJobs.ph, LinkedIn, Upwork) implements this interface.
// The scrape route fans out to the selected adapters and merges results.

import type { JobSource, RawJob } from '@/types';

export interface SourceSearchOptions {
  keyword: string;
  limit: number;
  page?: number;             // pagination pass index — only OnlineJobs.ph uses it
  ojSessionCookie?: string;  // decrypted OnlineJobs ci_session, when user connected
}

export interface SourceAdapter {
  id: JobSource;
  searchJobs(opts: SourceSearchOptions): Promise<RawJob[]>;
}

export const ALL_SOURCES: JobSource[] = ['onlinejobs', 'linkedin', 'upwork'];

export function normalizeSources(input: unknown): JobSource[] {
  if (!Array.isArray(input)) return ['onlinejobs'];
  const valid = input.filter((s): s is JobSource => ALL_SOURCES.includes(s as JobSource));
  const deduped = Array.from(new Set(valid));
  return deduped.length > 0 ? deduped : ['onlinejobs'];
}
