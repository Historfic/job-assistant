// ─── Applied-Jobs Store ───────────────────────────────────────────────────────
// Client-side singleton tracking which jobs the user has marked as applied.
//
// Keyed by job URL (NOT job.id) because scrape route generates a fresh id
// (`live-${idx}-${Date.now()}`) on every search — URLs are the only stable
// identifier across scrapes.
//
// Storage: localStorage. Subscription model uses useSyncExternalStore so a
// toggle from one component re-renders every other consumer (JobCard,
// dashboard filter chip, future Applied tab, etc.) in sync.

const STORAGE_KEY = 'jobiq_applied';

export interface AppliedEntry {
  appliedAt: string; // ISO timestamp
}

type Snapshot = Record<string, AppliedEntry>;

let snapshot: Snapshot = {};
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = JSON.parse(raw) as Snapshot;
  } catch {
    // Corrupted entry — wipe it rather than crash on every render
    window.localStorage.removeItem(STORAGE_KEY);
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

export function subscribeAppliedJobs(fn: () => void): () => void {
  hydrate();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getAppliedSnapshot(): Snapshot {
  hydrate();
  return snapshot;
}

export function getServerSnapshot(): Snapshot {
  return {};
}

export function toggleApplied(url: string): void {
  hydrate();
  const next = { ...snapshot };
  if (next[url]) delete next[url];
  else next[url] = { appliedAt: new Date().toISOString() };
  commit(next);
}

export function isApplied(url: string | null | undefined): boolean {
  if (!url) return false;
  hydrate();
  return url in snapshot;
}

export function appliedAt(url: string | null | undefined): string | null {
  if (!url) return null;
  hydrate();
  return snapshot[url]?.appliedAt ?? null;
}

// ── Relative-time helper (also used by JobCard) ─────────────────────────────

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
