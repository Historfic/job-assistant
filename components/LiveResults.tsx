'use client';

import JobCard from '@/components/JobCard';
import { SOURCE_LABEL, SOURCE_BADGE } from '@/lib/sourceLabels';
import UpgradeButton from '@/components/dashboard/UpgradeButton';
import type { AnalyzedJob, JobSource } from '@/types';

// What the user watches during the 30–60 seconds a search takes.
//
// The alternative is a spinner, and a spinner asks someone to trust that
// something is happening. Real jobs appearing one by one shows it. Each card
// that lands is also a card they can already read, open, and apply to while the
// slower sources are still working.

/** A card-shaped placeholder for a source that has not answered yet. */
function ShimmerCard({ source }: { source: JobSource }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 overflow-hidden relative">
      <div className="flex gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 rounded bg-gray-800 w-3/4" />
          <div className="h-2.5 rounded bg-gray-800/70 w-1/2" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SOURCE_BADGE[source]}`}>
          {SOURCE_LABEL[source]}
        </span>
        <span className="text-[11px] text-gray-500">searching…</span>
      </div>

      {/* The sweep is what separates "loading" from "broken". */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer
                      bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

/**
 * The blurred rows below a free user's results.
 *
 * These contain no job data at all. Sending real jobs and blurring them with
 * CSS would leave them readable in devtools — and we would have paid to analyse
 * something the user was never meant to read. The count above them is real; the
 * shapes are not.
 */
function LockedCards({ count, reason }: { count: number; reason: 'tier' | 'limit' }) {
  if (count <= 0) return null;

  // Past three, more blurred rows say nothing extra — the number does the work.
  const rows = Math.min(count, 3);

  if (reason === 'limit') {
    // A paying customer asked for fewer than we found. Not a paywall, and it
    // must not look like one.
    return (
      <p className="text-center text-xs text-gray-500 mt-4">
        {count} more match{count === 1 ? '' : 'es'} found. Raise <strong className="text-gray-400">Number of Jobs</strong> to see them.
      </p>
    );
  }

  return (
    <div className="relative mt-3">
      <div className="space-y-3 select-none" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 blur-[6px]">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-gray-700" style={{ width: `${70 - i * 12}%` }} />
                <div className="h-2.5 rounded bg-gray-800" style={{ width: `${45 - i * 8}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5
                      bg-gradient-to-b from-gray-950/40 via-gray-950/80 to-gray-950 rounded-xl px-4">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 118 0v4" />
        </svg>
        <p className="text-sm font-semibold text-white text-center">
          {count} more match{count === 1 ? '' : 'es'} found
        </p>
        <p className="text-[11px] text-gray-400 text-center max-w-[15rem]">
          Full access shows every match, adds LinkedIn and Upwork, and gives you 20 searches a day.
        </p>
        <UpgradeButton size="sm" className="mt-0.5" />
      </div>
    </div>
  );
}

export default function LiveResults({
  jobs,
  pendingSources,
  locked,
}: {
  jobs: AnalyzedJob[];
  pendingSources: JobSource[];
  locked?: { count: number; reason: 'tier' | 'limit' } | null;
}) {
  // The lock outlives the search: after results settle we render this again
  // with no jobs and no pending sources, purely to keep the paywall on screen.
  if (jobs.length === 0 && pendingSources.length === 0 && !locked) return null;

  return (
    <div className="px-4 sm:px-5 pb-6 pt-1">
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {jobs.length} {pendingSources.length > 0 ? 'found so far' : 'matches'}
          </span>
          <div className="flex-1 border-t border-blue-500/20" />
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => (
          // key on url so React moves the existing node when the list re-ranks
          // rather than rebuilding it — otherwise an expanded card would
          // collapse every time a better job arrived above it.
          <div key={job.url ?? job.id} className="animate-fade-in">
            <JobCard job={job} baseMessage="" />
          </div>
        ))}

        {pendingSources.map(source => (
          <ShimmerCard key={`pending-${source}`} source={source} />
        ))}
      </div>

      {locked && <LockedCards count={locked.count} reason={locked.reason} />}
    </div>
  );
}
