import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveLastSearch, loadLastSearch, clearLastSearch, savedAgo } from '@/lib/lastSearch';
import type { ProcessResult, ScrapeOptions } from '@/types';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
});

const options = { keyword: 'virtual assistant', limit: 10 } as ScrapeOptions;
const result = { validJobs: [{ id: '1', title: 'VA' }], removedJobs: [] } as unknown as ProcessResult;

beforeEach(() => store.clear());

describe('lastSearch', () => {
  it('gives the search back', () => {
    saveLastSearch(options, result);
    expect(loadLastSearch()?.result.validJobs).toHaveLength(1);
  });

  it('returns nothing when there is nothing saved', () => {
    expect(loadLastSearch()).toBeNull();
  });

  it('drops a search older than a day', () => {
    // Job posts go stale. Restoring yesterday's list without saying so would
    // send someone applying to filled roles.
    saveLastSearch(options, result);
    const raw = JSON.parse(store.get('easyclient.lastSearch.v1')!);
    raw.savedAt = Date.now() - 25 * 60 * 60 * 1000;
    store.set('easyclient.lastSearch.v1', JSON.stringify(raw));
    expect(loadLastSearch()).toBeNull();
  });

  it('ignores a stored object from an older release', () => {
    // Shape-checked rather than trusted: an old object would otherwise crash
    // the dashboard on load, for everyone who had one.
    store.set('easyclient.lastSearch.v1', JSON.stringify({ savedAt: Date.now(), result: {} }));
    expect(loadLastSearch()).toBeNull();
    store.set('easyclient.lastSearch.v1', 'not json at all');
    expect(loadLastSearch()).toBeNull();
  });

  it('clears on request', () => {
    saveLastSearch(options, result);
    clearLastSearch();
    expect(loadLastSearch()).toBeNull();
  });

  it('says how long ago in words somebody can act on', () => {
    expect(savedAgo(Date.now())).toBe('just now');
    expect(savedAgo(Date.now() - 5 * 60_000)).toBe('5 minutes ago');
    expect(savedAgo(Date.now() - 60 * 60_000)).toBe('1 hour ago');
  });
});
