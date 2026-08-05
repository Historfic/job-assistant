# JobIQ v1 — Design Spec

**Date:** 2026-08-05
**Owner:** Rafael (McGen Digital)
**Status:** Awaiting approval

## Overview

JobIQ is a job-hunting assistant for Filipino freelancers, sold as a digital product
through the "Easy Freelancing" Facebook page and Meta ads. It searches OnlineJobs.ph,
LinkedIn, and Upwork, analyzes listings with AI, scores them against the user's
keywords, and generates application messages and personalized cover letters.

v1 evolves the existing `job-assistant` Next.js app (cloned from
github.com/Historfic/job-assistant) rather than rebuilding. The working pieces —
OnlineJobs.ph cheerio scraper, AI analysis/scoring pipeline, cover-letter
personalization, email delivery — are kept. What changes: JobIQ gets its own user
accounts, a freemium/Pro tier system, LinkedIn + Upwork sources via Apify, and the
OnlineJobs.ph account login becomes an optional, consent-gated feature instead of the
app's front door.

## Goals

1. JobIQ's own authentication (signup/login) — independent of OnlineJobs.ph.
2. Job search across OnlineJobs.ph (built-in scraper), LinkedIn (Apify), Upwork (Apify).
3. OnlineJobs.ph account connection is **optional**, used only to unlock personalized
   cover letters, with an explicit Data Privacy Act consent step.
4. Freemium tiers: Free (OnlineJobs.ph, limited searches) and Pro (all sources, higher
   limits). Payment processing is **deferred** — Pro is granted manually for now.
5. Marketing landing page suitable as a Meta-ads destination, mobile-first.
6. Runs locally on :3000 for Rafael's approval before anything is pushed to main.

## Non-Goals (v1)

- Payment processor integration (PayMongo/Xendit/GCash checkout) — deferred by Rafael.
  The tier system is built so a processor can be attached later without schema changes.
- Auto-apply / bulk-apply automation.
- Mobile app. (Web is mobile-first instead.)
- Facebook page content / ad creative (marketing work, separate from this build).

## Approach

**Chosen: evolve the existing app in place** (vs. rebuilding from scratch, or bolting
auth in front of the current single-user app). The scraper, AI pipeline, and dashboard
UI already work; rebuilding discards proven code, and a thin bolt-on can't deliver
multi-source search or optional OnlineJobs login. All work happens on branch
`feature/jobiq-v1`; nothing merges to `main` until Rafael approves the local demo.

## Users & Tiers

| Capability | Free | Pro |
|---|---|---|
| OnlineJobs.ph search | ✅ 3 searches/day | ✅ 20 searches/day |
| LinkedIn + Upwork search | ❌ (upsell prompt) | ✅ |
| AI job analysis + scoring | ✅ | ✅ |
| Generic application message | ✅ | ✅ |
| Personalized cover letters — OnlineJobs.ph listings | ✅ *if OnlineJobs account connected* | ✅ *if OnlineJobs account connected* |
| Personalized cover letters — LinkedIn/Upwork listings | ❌ (sources are Pro) | ✅ (no OnlineJobs connection needed — data comes from Apify) |
| Email the application to yourself | ✅ | ✅ |

- One "search" = one submission of the search form, regardless of how many sources
  are selected. Search-day boundaries use Asia/Manila time.
- Personalized cover letters are the incentive to connect an OnlineJobs.ph account
  (per Rafael's requirement); they are not a Pro-only feature.
- `profiles.tier` is `'free' | 'pro'`. Until payments ship, Rafael grants Pro manually
  in the Supabase dashboard (early-access customers pay via the Facebook page, e.g.
  GCash P2P, and are upgraded by hand). The landing page shows Pro pricing as
  "₱299/month — early access via our Facebook page" (copy adjustable).

## Architecture

- **Framework:** Next.js 14 App Router (existing), TypeScript, Tailwind. Deploys to
  Vercel (vercel.json already present).
- **Supabase:** Auth (email/password + Google OAuth), Postgres with Row Level
  Security, accessed via `@supabase/supabase-js` + `@supabase/ssr`. No Supabase MCP
  dependency — plain SDK with project keys.
- **Job source adapters** (`lib/sources/`): a common interface
  `searchJobs(options): Promise<RawJob[]>` with three implementations:
  - `onlinejobs.ts` — existing cheerio scraper, moved out of the route file. Works
    **without** any session cookie (the jobsearch pages are public); the cookie, when
    a user has connected their account, is only added for richer detail fetches.
  - `linkedin.ts` — Apify actor call (actor chosen at implementation from Apify Store
    LinkedIn-jobs scrapers), server-side with `APIFY_TOKEN`, mapped to `RawJob`.
  - `upwork.ts` — same pattern with an Upwork jobs actor.
- **AI pipeline:** unchanged — OpenRouter (llama-3.1-8b) for analysis/scoring with
  local regex fallback; Claude Haiku → OpenRouter → template chain for cover-letter
  personalization.
- **Demo mode:** preserved. With no API keys, every source returns realistic mock data
  so the app is fully demoable on :3000.

## Authentication (new)

- Supabase Auth: email + password (with confirmation email) and Google sign-in.
- Middleware protects `/dashboard` and all API routes; unauthenticated users land on
  the marketing page / login.
- On signup, a `profiles` row is created (trigger) with `tier = 'free'`.
- The old login flow (posting OnlineJobs.ph credentials as the app's login) is
  **removed** as the front door.

## Optional OnlineJobs.ph Connection

- New "Connect your OnlineJobs.ph account" card in dashboard settings — clearly
  optional.
- **Consent modal (Data Privacy Act):** before connecting, a small window explains in
  plain language: what is stored (an encrypted session token, never the password),
  why (to fetch full job details from your OnlineJobs account and generate
  personalized cover letters), where (our Supabase database), retention (deleted the
  moment you disconnect), and their rights under RA 10173 (Data Privacy Act of 2012).
  The user must tick "I understand and agree" to proceed.
- Flow reuses the existing credential → `ci_session` exchange: the password is used
  transiently server-side to obtain the session cookie and is never persisted or
  logged. The `ci_session` value is encrypted (AES-256-GCM, key in
  `OJ_SESSION_ENCRYPTION_KEY` env var) and stored in `oj_connections`.
- Session expiry is detected on use → status flips to `expired` → UI prompts a
  reconnect.
- "Disconnect" deletes the row immediately.
- Personalized cover-letter generation for OnlineJobs listings is enabled only when a
  connection exists; otherwise the button shows a lock with "Connect OnlineJobs.ph to
  unlock personalized cover letters."

## Database Schema (Supabase, all tables RLS: owner-only)

```
profiles        id (uuid, = auth.users.id), email, full_name, tier ('free'|'pro'),
                created_at
oj_connections  user_id (uuid, PK), encrypted_session, status ('active'|'expired'),
                consent_at, connected_at
job_statuses    id, user_id, job_url, status ('applied'|'rejected'), title,
                company, source, created_at        -- replaces localStorage tracking
searches        id, user_id, sources (text[]), keyword, created_at   -- one row per
                search-form submission; powers the daily rate limits
```

## API Routes (all require JobIQ auth)

| Route | Change |
|---|---|
| `POST /api/scrape` | Accepts `sources: string[]`; fans out to adapters; enforces tier + daily limits; no longer requires an OnlineJobs session |
| `POST /api/personalize` | Requires an active `oj_connections` row for OnlineJobs.ph listings; LinkedIn/Upwork listings personalize without one (Pro tier already required for those sources) |
| `POST /api/generate-questions` | Unchanged behavior, behind auth |
| `POST /api/send-email` | Unchanged behavior, behind auth; default recipient = account email |
| `POST /api/oj/connect`, `POST /api/oj/disconnect` | New — replaces `/api/auth/login` `/api/auth/logout` |
| Auth pages/routes | Supabase Auth (signup, login, confirm, Google callback, password reset) |

## Pages & UX

- **`/` marketing landing page** (new — the Meta-ads destination): hero with the
  product promise for Filipino freelancers, "how it works" in 3 steps, source logos
  (OnlineJobs.ph, LinkedIn, Upwork), Free vs Pro pricing table, data-privacy FAQ,
  signup CTA. Mobile-first (Facebook ad traffic is overwhelmingly mobile), fast,
  peso-denominated pricing.
- **`/login`, `/signup`** — JobIQ's own auth (replaces the OnlineJobs credential form).
- **`/dashboard`** — existing UI, refactored: the current 32KB `dashboard/page.tsx`
  is split into focused components; adds a source selector (chips: OnlineJobs.ph /
  LinkedIn 🔒 / Upwork 🔒 for free users), remaining-searches counter, and an
  account menu (tier badge, OnlineJobs connection status, logout).
- Applied/Rejected tracking moves from localStorage to `job_statuses` so it follows
  the account across devices.
- Existing UX kept: Top Matches, Other Jobs, Applied/Rejected tabs, salary filters,
  email preview.

## Error Handling

- Per-source failures are isolated: if Apify times out, OnlineJobs results still
  render, with a dismissible banner naming the failed source.
- Apify calls: 60s budget with actor-run polling; on failure → clear message, no
  partial charge surprises.
- Expired OnlineJobs session → 409 from personalize → reconnect prompt.
- AI failures keep the existing graceful fallback chain (never block results).
- Rate-limit hit → friendly upsell modal (Free) or hard stop with reset time (Pro).

## Environment & Accounts Rafael Must Provide

| Item | Used for |
|---|---|
| Supabase project (URL, anon key, service-role key) | Auth + database |
| `APIFY_TOKEN` (Apify account, paid usage) | LinkedIn + Upwork sources |
| `OPENROUTER_API_KEY` | Job analysis |
| `ANTHROPIC_API_KEY` (optional) | Best-quality cover letters |
| `OJ_SESSION_ENCRYPTION_KEY` (generated) | Encrypting OnlineJobs sessions |
| SMTP creds (existing Gmail app-password flow) | Email delivery |

Missing keys never crash the app — demo mode covers every gap.

## Testing & Approval Gates

1. Runs locally at `localhost:3000` in full demo mode (no keys) and live mode.
2. Manual test script: signup → search (free limits enforced) → connect OnlineJobs
   (consent modal) → personalized letter → applied tracking → logout/login persistence.
3. **Gate:** Rafael reviews the running app on :3000 and approves **before** anything
   is pushed to `main`.

## Later (v2+)

- PayMongo (or Xendit) checkout + webhook-driven tier upgrades — schema already ready.
- Upwork/LinkedIn saved-search alerts, result caching to cut Apify spend.
- OnlineJobs.ph profile import to enrich cover letters further.
- Referral program for the Facebook community.
