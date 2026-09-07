// ─── Where you left off ───────────────────────────────────────────────────────
// A search takes 30–60 seconds and costs the user one of their allowance, so
// losing it to a reload, a closed tab, or a tapped link is expensive in a way
// most lost UI state is not. This keeps the last one.
//
// Browser-only, deliberately. A stored search is 10–35 jobs with full
// descriptions — roughly 100–400 KB — and putting that in Postgres for every
// user would fill Supabase's free tier in weeks while solving a problem that
// only exists on the device the person is already using.
//
// Everything here fails soft. Private mode throws on write, a full quota throws
// on write, and an older shape can be left over from a previous release. None
// of that is worth an error in front of someone who just wants their jobs back.

import type { ProcessResult, ScrapeOptions } from '@/types';

const KEY = 'easyclient.lastSearch.v1';

/** Older than this and the jobs are probably filled. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface StoredSearch {
  savedAt: number;
  options: ScrapeOptions;
  result: ProcessResult;
}

export function saveLastSearch(options: ScrapeOptions, result: ProcessResult): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), options, result }));
  } catch {
    // Quota or private mode. The search is still on screen; only the restore
    // is lost, and telling someone their browser is full helps nobody.
  }
}

export function loadLastSearch(): StoredSearch | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredSearch>;
    // Shape-checked rather than trusted: this survives releases, and a stored
    // object from an older version would otherwise crash the dashboard on load.
    if (!parsed?.result?.validJobs || !Array.isArray(parsed.result.validJobs)) return null;
    if (typeof parsed.savedAt !== 'number') return null;

    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearLastSearch();
      return null;
    }
    return parsed as StoredSearch;
  } catch {
    return null;
  }
}

export function clearLastSearch(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
}

/** "2 hours ago" — enough for someone to judge whether it is still worth using. */
export function savedAgo(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}
