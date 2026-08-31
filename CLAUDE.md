# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # http://localhost:3000 — predev frees the port first
npm test             # vitest run
npm run lint         # next lint
npm run build        # verify before deploying
```

Single test file or single test:

```bash
npx vitest run tests/tiers.test.ts
npx vitest run -t "counts a free search against the lifetime allowance"
npx vitest            # watch mode
```

There is no `type-check` script; `npm run build` type-checks as part of the
Next build.

## What this is

A job search for Filipino freelancers. One search covers **OnlineJobs.ph,
LinkedIn and Upwork** at once, Claude scores each listing against the user's CV,
and the app writes a ready-to-send application message and cover letter.

`docs/JOBIQ-BRIEF.md` is the product brief — customer, pricing, sales flow,
written for pasting into a chat. **`lib/tiers.ts` is the truth about pricing**;
the brief drifted out of step with it once and was corrected, and
`docs/superpowers/specs/2026-08-07-one-time-payment-design.md` is the superseded
one-time model, kept only as a record.

## Architecture

```
search form → /api/scrape ─→ lib/sources/*  (three adapters, in parallel)
                          ├→ lib/aiAnalyzer (Claude scores each job)
                          └→ NDJSON stream ─→ dashboard renders as they arrive
```

**Sources fan out and fail independently.** `lib/sources/index.ts` runs all
three adapters at once; a dead source lands in `errors` while the others still
return jobs. Adding a source means an adapter in `lib/sources/` plus an entry in
the `ADAPTERS` map — nothing else dispatches on source.

**Results stream as NDJSON, one JSON object per line.** A search takes 30–60
seconds but OnlineJobs.ph usually answers within ten, and each job's AI analysis
finishes independently, so results are written as they are found rather than
held for the slowest source. `lib/searchStream.ts` defines the event union and
explains why not SSE (EventSource is GET-only; the search is a POST carrying
filters) and why not poll-after-start (that needs server-side state for
in-flight searches, which no deploy survives).

Newlines are the record separator, so **no payload may contain a raw one**.
`JSON.stringify` escapes them inside strings — a job description containing a
newline is normal, not an edge case, and there is a test pinning this.

**Supabase is optional, and its absence is a mode.** `isSupabaseConfigured()`
in `lib/supabase/config.ts` gates everything: with no URL and anon key the whole
app runs in **demo mode** — a demo user, no persistence, every limit unlocked.
It is a function, not a const, so tests can toggle env vars. Admin routes stay
closed in demo mode; they check `ADMIN_EMAILS` themselves.

**`DEMO_MODE` is separately checked as the string `'false'`.** Live scraping
requires `DEMO_MODE=false`; LinkedIn and Upwork additionally require
`APIFY_TOKEN`. OnlineJobs.ph needs no key — it reads public pages.

## Rules the code depends on

**Tiers are enforced in `lib/tiers.ts` and nowhere else.** `free` gets 3
**lifetime** searches and OnlineJobs.ph only; `pro` gets 20 per **Manila day**
and all sources. One search means one submission of the form, however many
sources it covers. Day boundaries are Asia/Manila — UTC+8, no DST.

**Billing is manual and nothing expires on its own.** Customers pay by GCash and
are flipped to `pro` in the admin console. A lapsed subscriber stays `pro` until
somebody revokes them by hand.

**The founding price is a promise, not a marketing line.** `REGULAR_PRICE_COPY`
is a real *future* price, never a struck-through past one — inventing a "was"
price is a deceptive sales act under the Consumer Act (RA 7394), and Meta
rejects ads claiming false discounts. A founding member keeps `PRICE_COPY` for
as long as they stay. Raising them later makes it a fake discount with extra
steps.

**OnlineJobs.ph session tokens are encrypted at rest, never passwords.**
`lib/crypto.ts` uses AES-256-GCM keyed by `OJ_SESSION_ENCRYPTION_KEY` (64 hex
chars). Connecting is consent-gated with a Data Privacy Act (RA 10173) notice,
and disconnecting deletes the token. Do not widen what is stored.

**Middleware protects the dashboard, admin and every API route** — except
`/api/cron/*`, which has no user session and authenticates with `CRON_SECRET`
inside the route.

## Deploying

**Render**, not a serverless host — see `render.yaml`. A live search scrapes
three sites and runs AI analysis for 15–30 seconds; serverless free tiers abort
at ~10s. Singapore region, closest to the Philippines. The free plan sleeps;
`starter` does not.

`vercel.json` is also present and raises `maxDuration` for the slow routes, so
Vercel remains possible — but the timeout reasoning above is why Render is the
one configured with a start command.

Secrets live in the Render dashboard, never in git. `.env.example` lists them.

## Writing code here

Comments here explain **why**, usually by naming the constraint or the failure
behind a decision — a ten-second serverless timeout, a legal rule about
discounts, a newline in a job description. Match that: a comment restating the
line is not worth the space, the reason it is shaped that way is.

`tests/` documents policy as much as behaviour (what a "search" counts as, what
a tier allows, that NDJSON survives a newline). When changing behaviour, update
the reasoning with the assertion.
