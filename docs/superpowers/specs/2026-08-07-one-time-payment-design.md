# JobIQ — One-Time Payment Amendment

**Date:** 2026-08-07
**Owner:** Rafael (McGen Digital)
**Status:** Approved by Rafael 2026-08-07 (chat)
**Amends:** 2026-08-05-jobiq-v1-design.md (Users & Tiers section)

## Change

The Free/Pro subscription split is replaced by a single one-time payment.

| | Free preview (unpaid) | Full access (paid ₱999 once) |
|---|---|---|
| Searches | **3 lifetime** (not per day) | 20 per Manila day |
| Sources | OnlineJobs.ph only | OnlineJobs.ph + LinkedIn + Upwork |
| Everything else (AI analysis, cover letters, tracking, email) | ✅ during preview | ✅ |

- Pricing copy everywhere: `Get full access — ₱999 one-time — via our Facebook page.`
- Landing page: single ₱999 card ("One price. Yours forever."), free-preview note.
- Payment collection unchanged from v1 launch plan: GCash/bank via the Easy
  Freelancing Facebook page; Rafael flips `profiles.tier` to `'pro'` by hand.
  Automated checkout (PayMongo, region-dependent methods) remains v2.
- The daily cap for paid users is deliberate: each search has real AI/Apify
  cost, so "unlimited forever" is not offered.

## Implementation

Zero schema change — `profiles.tier` values keep `'free'`/`'pro'`; only their
meaning and UI labels change ("Free preview" / "Full access"). `TIER_LIMITS`
gains a `scope: 'lifetime' | 'day'` field; the scrape and /api/me count
queries drop the Manila-day filter for lifetime scope. `SearchLimits`
wire shape unchanged.
