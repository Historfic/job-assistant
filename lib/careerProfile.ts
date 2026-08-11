// ─── Career Profile Store ─────────────────────────────────────────────────────
// The user's CV / experience summary. Kept in localStorage so it survives
// reloads and works with no Supabase configured, and synced to the account so
// it follows them across devices — the same pattern as jobStatus.ts.

export interface CareerProfile {
  headline: string;
  cvText: string;
}

export const EMPTY_PROFILE: CareerProfile = { headline: '', cvText: '' };

const STORAGE_KEY = 'jobiq_career_profile';

let snapshot: CareerProfile = EMPTY_PROFILE;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function commit(next: CareerProfile): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode — keep it in memory for this session
  }
  listeners.forEach(fn => fn());
}

// ── Public API ──────────────────────────────────────────────────────────────

export function subscribeCareerProfile(fn: () => void): () => void {
  hydrate();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getCareerProfileSnapshot(): CareerProfile {
  hydrate();
  return snapshot;
}

export function getServerProfileSnapshot(): CareerProfile {
  return EMPTY_PROFILE;
}

/** True when there's enough text to be worth sending to the AI. */
export function hasUsableProfile(p: CareerProfile): boolean {
  return p.cvText.trim().length >= 80;
}

/** Save locally, then sync to the account (fire-and-forget). */
export function saveCareerProfile(next: CareerProfile): void {
  hydrate();
  commit(next);
  void fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {});
}

/** Pull the account copy on load. No-op in demo mode or when offline. */
export async function refreshCareerProfile(): Promise<void> {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) return;
    const data = await res.json();
    if (data.profile) {
      hydrated = true;
      commit({ ...EMPTY_PROFILE, ...data.profile });
    }
  } catch {
    // offline / demo — localStorage stays the source of truth
  }
}
