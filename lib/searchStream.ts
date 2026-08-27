// ─── Search result streaming (NDJSON) ────────────────────────────────────────
// The scrape pipeline finds jobs over 30–60 seconds, but every job is ready
// long before the last one arrives: OnlineJobs.ph usually answers within ten
// seconds, and each job's AI analysis completes independently. Holding all of
// them back until the slowest source finishes is a UI choice, not a constraint.
//
// One JSON object per line, written as the pipeline runs. Chosen over Server-
// Sent Events because EventSource is GET-only and the search is a POST carrying
// filters; chosen over start-then-poll because that needs server-side state for
// in-flight searches, which does not survive the instance restart that every
// deploy causes.
//
// Newlines are the record separator, so payloads must never contain a raw one.
// JSON.stringify escapes them inside strings, which is exactly the guarantee
// this format needs — but it is a guarantee worth having a test for, since a
// job description containing a newline is not an edge case, it is normal.

import type { AnalyzedJob, JobSource, ProcessResult, SearchLimits, SourceError } from '@/types';

export type SearchEvent =
  /** Sent first, before any scraping, so the UI can show limits immediately. */
  | { type: 'meta'; limits: SearchLimits; targetRequested: number; sources: JobSource[] }
  /** One job, emitted the moment its own analysis clears the post-filters. */
  | { type: 'job'; job: AnalyzedJob }
  /** A source finished. The UI drops that source's shimmer placeholder. */
  | { type: 'source-done'; source: JobSource; found: number }
  /** A source failed. The stream continues — the other sources still count. */
  | { type: 'source-error'; error: SourceError }
  /** Pipeline finished. Carries everything that can only be known at the end. */
  | { type: 'complete'; result: ProcessResult }
  /** Fatal. The stream stops here. */
  | { type: 'error'; message: string; code?: string };

export const NDJSON_CONTENT_TYPE = 'application/x-ndjson';

/** One event as a single line, newline-terminated. */
export function encodeEvent(event: SearchEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Pulls whole events out of a growing buffer.
 *
 * Returns the events that are complete and whatever partial text is left over,
 * which the caller feeds back in with the next chunk. A network chunk boundary
 * lands mid-object often enough that treating the tail as a parse failure would
 * drop roughly one job in every read.
 */
export function decodeChunk(buffer: string): { events: SearchEvent[]; rest: string } {
  const lines = buffer.split('\n');
  // The last element is either an incomplete line or '' when the buffer ended
  // on a newline. Either way it is not ours to parse yet.
  const rest = lines.pop() ?? '';
  const events: SearchEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as SearchEvent);
    } catch {
      // A malformed line means the stream is corrupt, not that this job is bad.
      // Skipping it keeps the rest of the search usable.
    }
  }

  return { events, rest };
}

/**
 * Live ranking. A job arriving late with a better score belongs at the top —
 * that is the whole point of showing results before the search finishes.
 *
 * Ties break on url so the order is stable: without it, two jobs sharing a
 * score would swap places on every re-sort and the list would flicker.
 */
export function insertRanked(jobs: AnalyzedJob[], incoming: AnalyzedJob): AnalyzedJob[] {
  // Sources can return the same posting twice across passes.
  if (incoming.url && jobs.some(j => j.url === incoming.url)) return jobs;

  return [...jobs, incoming].sort((a, b) => {
    const byScore = (b.score ?? 0) - (a.score ?? 0);
    if (byScore !== 0) return byScore;
    return (a.url ?? '').localeCompare(b.url ?? '');
  });
}
