'use client';

import JobCard from '@/components/JobCard';
import { SOURCE_LABEL, SOURCE_BADGE } from '@/lib/sourceLabels';
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

export default function LiveResults({
  jobs,
  pendingSources,
}: {
  jobs: AnalyzedJob[];
  pendingSources: JobSource[];
}) {
  if (jobs.length === 0 && pendingSources.length === 0) return null;

  return (
    <div className="px-4 sm:px-5 pb-6">
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {jobs.length} found so far
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
    </div>
  );
}
