// ─── Job-Status Store ─────────────────────────────────────────────────────────
// Client-side singleton tracking which jobs the user has marked as either
// Applied (sent in an application) or Rejected (not interested / wrong fit).
//
// Keyed by job URL (NOT job.id) because the scrape route generates a fresh id
// (`live-${idx}-${Date.now()}`) on every search — URLs are the only stable
// identifier across scrapes.
//
// Each entry also stores a SNAPSHOT of the AnalyzedJob at the time of marking,
// so the Applied / Rejected tabs can render full job cards even after that
// listing has dropped out of the latest search results.
//
// Storage: localStorage. Subscription via useSyncExternalStore so toggles
// propagate to every consumer (JobCard, dashboard tabs, search exclusion).

import type { AnalyzedJob } from '@/types';

const STORAGE_KEY = 'jobiq_job_status';
const LEGACY_APPLIED_KEY = 'jobiq_applied'; // pre-2026-05-26 single-state schema

export type JobState = 'applied' | 'rejected';

export interface JobStatusEntry {
  state: JobState;
  setAt: string;             // ISO timestamp
  job?: AnalyzedJob;         // snapshot at time of marking (optional for migrated entries)
}

type Snapshot = Record<string, JobStatusEntry>;

let snapshot: Snapshot = {};
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      snapshot = JSON.parse(raw) as Snapshot;
      return;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  // Migrate from the legacy applied-only schema if present.
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_APPLIED_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Record<string, { appliedAt: string }>;
      for (const [url, entry] of Object.entries(legacy)) {
        snapshot[url] = { state: 'applied', setAt: entry.appliedAt };
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      window.localStorage.removeItem(LEGACY_APPLIED_KEY);
    }
  } catch {
    // best-effort migration — ignore corrupt legacy data
  }
}

function commit(next: Snapshot): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode — keep in-memory state and move on
  }
  listeners.forEach(fn => fn());
}

// ── Public API ──────────────────────────────────────────────────────────────

export function subscribeJobStatus(fn: () => void): () => void {
  hydrate();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getJobStatusSnapshot(): Snapshot {
  hydrate();
  return snapshot;
}

export function getServerSnapshot(): Snapshot {
  return {};
}

/**
 * Toggle a job into the given state. If already in that state, the entry is
 * removed (toggle-off). If in the other state, it's switched. Pass `job` to
 * store a snapshot of the AnalyzedJob for later rendering in the tabs.
 */
export function toggleStatus(url: string, state: JobState, job?: AnalyzedJob): void {
  hydrate();
  const next = { ...snapshot };
  if (next[url]?.state === state) {
    delete next[url];
  } else {
    next[url] = { state, setAt: new Date().toISOString(), job };
  }
  commit(next);
}

export function getStatus(url: string | null | undefined): JobStatusEntry | null {
  if (!url) return null;
  hydrate();
  return snapshot[url] ?? null;
}

export function isMarked(url: string | null | undefined): boolean {
  return getStatus(url) !== null;
}

export function getMarkedUrls(): string[] {
  hydrate();
  return Object.keys(snapshot);
}

// ── Relative-time helper ────────────────────────────────────────────────────

export function relativeAgo(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
