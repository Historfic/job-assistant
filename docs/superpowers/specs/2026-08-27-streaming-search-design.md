# Streaming search results + cover-letter subject lines

## Why

A full-access search takes 30–60 seconds because it waits on Apify actors for
LinkedIn and Upwork. Today the user stares at a progress bar for all of it and
gets every result at once at the end.

The jobs are not all found at the end. OnlineJobs.ph usually returns within ten
seconds, and each job finishes AI analysis independently. The results exist long
before the UI admits it.

## What changes

### 1. Stream results as they are found

The scrape route stops returning one JSON blob and instead writes **NDJSON** —
one JSON object per line — as the pipeline runs. The browser reads the response
body incrementally.

**Transport: NDJSON over the existing POST.**

Rejected alternatives:

- **Server-Sent Events** — the conventional choice, but `EventSource` is GET-only
  and the search is a POST carrying filters. Would mean a second endpoint or
  moving filters into the query string.
- **Start-then-poll** — return a search id, poll for progress. Requires
  server-side state for in-flight searches, which does not survive an instance
  restart. Render restarts on every deploy.

NDJSON needs no new endpoint, no server state, and no client library.

> **Cloudflare caveat:** streaming works because the DNS records are set to
> *DNS only*. Switching them to *Proxied* makes Cloudflare buffer the response
> and every result arrives at once again — the exact bug this removes.

#### Event types

| Event | When | Payload |
|---|---|---|
| `meta` | immediately | tier limits, remaining searches, requested target |
| `job` | per job, after analysis clears the post-filters | the analysed job |
| `source-error` | a source fails | source name, message |
| `complete` | end of pipeline | application message, stats, removed jobs |
| `error` | fatal | message, code |

A job is emitted the moment its own AI analysis returns and it survives the
file-upload filter. Jobs that get filtered out are never emitted.

#### Ordering

**Live re-rank.** The list stays sorted by score at all times; a late arrival
with a higher score moves to the top. Positions animate rather than jump, and a
newly arrived card flashes briefly so the movement reads as an arrival rather
than a glitch.

#### Pending state

Sources still working render shimmer placeholder cards, so the UI shows that
more is coming rather than looking finished. A placeholder disappears when its
source emits `source-done` or `source-error`.

#### Behaviour change

Today the pipeline collects ~35 jobs and returns the best 10. Streaming emits
every job that passes the filters, so the user sees more results than before.
This is intended: hiding jobs already found and paid for serves nobody.

### 2. Cover-letter subject lines

Generated letters currently have a body only, so the user invents a subject or
sends one without. Every generated letter now carries a subject line, rendered
above the body with its own copy button — subject and body are pasted into
different fields, so they should be copyable separately.

## Testing

- Event encoding/decoding round-trips, including a payload containing newlines
- A job arriving with a higher score sorts above earlier arrivals
- `source-error` does not abort the stream; remaining sources still emit
- A truncated stream surfaces an error rather than a silent partial result
- Subject generation falls back to a sensible default when the model omits one

## Out of scope

- Cancelling an in-flight search
- Persisting partial results across a page reload
- Changing the search pipeline's cost profile — the same AI calls happen either
  way, only their delivery changes
