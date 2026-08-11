'use client';

import { useEffect, useState } from 'react';
import type { ScrapeOptions } from '@/types';

// Offered right after a search, while the user can see the results are worth
// repeating. One alert per account, so turning it on for a new search replaces
// the previous one.
export default function AlertToggle({ options }: { options: ScrapeOptions | null }) {
  const [savedKeyword, setSavedKeyword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/alerts')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d?.alert?.enabled) setSavedKeyword(d.alert.keyword); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!options) return null;

  const isThisSearch = savedKeyword !== null &&
    savedKeyword.toLowerCase() === options.keyword.trim().toLowerCase();

  async function enable() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: options!.keyword,
          sources: options!.sources,
          minSalary: options!.minSalary,
          jobType: options!.jobType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not turn on alerts');
      setSavedKeyword(options!.keyword.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/alerts', { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not turn off alerts');
      setSavedKeyword(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-xs text-gray-300">
          {isThisSearch
            ? `You'll get an email when new "${savedKeyword}" jobs appear.`
            : 'Want new jobs like these emailed to you daily?'}
        </p>
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
        {!isThisSearch && savedKeyword && (
          <p className="text-[10px] text-gray-600 mt-0.5">
            This replaces your current alert for &ldquo;{savedKeyword}&rdquo;.
          </p>
        )}
      </div>
      <button
        onClick={isThisSearch ? disable : enable}
        disabled={busy}
        className={`shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50
          ${isThisSearch
            ? 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
            : 'bg-blue-600/15 text-blue-400 border-blue-600/40 hover:bg-blue-600/25'}`}
      >
        {busy ? 'Saving…' : isThisSearch ? 'Turn off' : 'Email me daily'}
      </button>
    </div>
  );
}
