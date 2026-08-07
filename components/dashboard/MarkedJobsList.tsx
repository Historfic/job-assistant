'use client';

import JobCard from '@/components/JobCard';
import { relativeAgo, type JobStatusEntry } from '@/lib/jobStatus';

// ─── Applied / Rejected tab body ──────────────────────────────────────────────
// Renders the list of jobs the user has flagged with a particular state across
// all past searches. Entries carry a snapshot of the AnalyzedJob, so we can
// render a full JobCard even if the listing has dropped out of the latest
// search results. Legacy migrated entries (no snapshot) fall back to a
// compact URL + timestamp row.

export default function MarkedJobsList({
  entries,
  state,
  baseMessage,
}: {
  entries: Array<{ url: string; entry: JobStatusEntry }>;
  state: 'applied' | 'rejected';
  baseMessage?: string;
}) {
  const isApplied = state === 'applied';
  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold uppercase tracking-wider ${isApplied ? 'text-emerald-400' : 'text-red-400'}`}>
          {isApplied ? '✓ Applied Jobs' : '✗ Rejected Jobs'} ({entries.length})
        </span>
        <div className={`flex-1 border-t ${isApplied ? 'border-emerald-500/20' : 'border-red-500/20'}`} />
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">No jobs marked as {state} yet.</p>
          <p className="text-xs mt-1">
            Click the {isApplied ? 'green check' : 'red ×'} icon on any job card to track it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(({ url, entry }) =>
            entry.job ? (
              <JobCard key={url} job={entry.job} baseMessage={baseMessage} />
            ) : (
              <div key={url} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-gray-300 hover:text-blue-400 truncate block"
                >
                  {url}
                </a>
                <p className="text-[10px] text-gray-600 mt-1">
                  Marked {state} {relativeAgo(entry.setAt)} · legacy entry, limited info
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
