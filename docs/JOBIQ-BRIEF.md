# JobIQ — project brief

*Paste this at the start of a Claude chat to bring it up to speed. Never paste
API keys, passwords, or the Supabase service-role key into a chat.*

---

You are helping me launch and grow **JobIQ**, my first digital product. I'm
Rafael, based in the Philippines, trading as McGen Digital. I am not a
developer — explain things in plain language, and when you recommend something,
tell me what it costs and what it demands of me.

## The product

JobIQ is a web app that helps **Filipino freelancers find online work faster**.

One search covers **OnlineJobs.ph, LinkedIn and Upwork** at the same time. AI
reads every listing, scores how well it fits, and filters out the time-wasters.
It then writes a ready-to-send application message, plus a personalised cover
letter for any individual job — using the user's own CV, so it cites real
experience instead of generic filler.

Users can save their CV once, track which jobs they've applied to or rejected
(synced across devices), and turn on a daily email alert for new matching jobs.

Optionally they can connect their real OnlineJobs.ph account, which unlocks
richer cover letters. This is consent-gated with a Data Privacy Act (RA 10173)
notice — we store an encrypted session token, never their password, and delete
it the moment they disconnect.

**Live at:** https://jobiq-23e4.onrender.com

## The customer

Filipino freelancers and virtual assistants — VAs, customer support, admin,
social media, bookkeeping, design, some developers. Typically:

- On a **phone**, arriving from Facebook
- Paying with **GCash**, often no credit card
- **Cautious about scams** — online fraud is common here, so trust signals
  matter more than clever marketing
- Price-sensitive: ₱999 a month is a real decision, roughly a day's pay for many

## Pricing and how sales work

**₱999 a month.** Founding price, locked for life for the first 50 members;
₱1,499/month for everyone after that.

| | Free preview | Full access — ₱999/month |
|---|---|---|
| Searches | 3 total, ever | 20 per day |
| Job sites | OnlineJobs.ph only | OnlineJobs.ph + LinkedIn + Upwork |
| Everything else (AI ranking, cover letters, CV, tracking, alerts) | ✅ | ✅ |

Almost every feature is in the free preview on purpose — people should feel the
quality before they hit the wall. The limits are searches and job sites.

**₱1,499 is a real future price, never a struck-through past one.** Inventing a
"was" price is a deceptive sales act under the Consumer Act (RA 7394), and Meta
rejects ads claiming false discounts. The promise only stays honest if it is
kept: a founding member pays ₱999 for as long as they stay, even after the price
rises. Raising them later makes it a fake discount with extra steps.

The numbers live in `lib/tiers.ts` — `PRICE_COPY`, `REGULAR_PRICE_COPY` and
`FOUNDING_SEATS`. Change them there, not only here.

**The sales flow today is manual:**

1. Customer messages my Facebook page wanting to buy
2. They pay ₱999 by GCash or bank transfer
3. They send me their email
4. I open `/admin` in the app, paste the email, click **Activate**
5. They get an email inviting them to set a password, and they're in with full
   access

The admin console also shows every signup, how many searches they've used, and
lets me revoke or permanently delete an account.

**Renewals are manual too, and nothing expires on its own.** No code counts
months or lapses an account — a subscriber who stops paying keeps full access
until I revoke them by hand in `/admin`. Same for the 50 founding seats: that is
a number I track myself, not one the app enforces.

## Marketing plan

- Facebook page: **Easy Freelancing**
- Paid traffic via **Meta ads**, aimed at Filipino freelancers
- The landing page is the ad destination and is mobile-first

## What's built and working

Own login (email/password + Google) · three-site search · AI ranking and
filtering · application messages · personalised cover letters from the user's
CV · applied/rejected tracking · daily job alerts · marketing landing page ·
free/paid access control · admin console for activating customers · mobile-
friendly throughout.

## Technical (short version)

Next.js 14 + TypeScript + Tailwind, hosted on **Render** (free tier), database
and login by **Supabase**, LinkedIn/Upwork scraping via **Apify**, AI via
OpenRouter or Anthropic. Code at github.com/Historfic/job-assistant. Roughly
29 automated tests; the app was code-reviewed and security-hardened during the
build.

## Current status — honest version

**Working:** the live site, signups, all features listed above, email sending
via Gmail SMTP.

**Not yet done:**

- **Job results are still realistic sample data, not live listings.** Turning
  on real data needs an OpenRouter key (free tier available), `DEMO_MODE=false`,
  and an Apify subscription (~$49/month) for LinkedIn and Upwork. I could launch
  OnlineJobs.ph-only first and add the others later.
- **No custom domain yet.** The site is on a Render address, which looks less
  trustworthy than e.g. `jobiq.ph`. A domain also fixes the Google sign-in
  prompt currently showing a random Supabase address.
- **Free hosting sleeps** after 15 minutes idle, so the first visitor waits
  ~50 seconds. Fixing it costs about $7/month.
- **No customers yet**, so no testimonials or reviews.
- **No logo on the Facebook page yet** — the app now uses a mark called
  "Ranked": three bars of decreasing length, longest on top, representing the
  shortlist the AI produces.

## Decisions already made — please don't re-litigate these

- **Monthly subscription at ₱999, not a one-off.** This brief previously said
  one-time; the app has been monthly with founding pricing since. If the two
  ever disagree again, `lib/tiers.ts` is the truth.
- **Manual activation for now.** Automated checkout (PayMongo — GCash, Maya,
  bank, cards) comes once sales justify the setup. Stripe is not an option:
  it doesn't support Philippine businesses.
- **No auto-apply feature.** It gets users banned from OnlineJobs.ph and
  Upwork, so it's off the table however often people ask.
- **Render, not Vercel.** A live search takes 15–30 seconds and Vercel caps
  requests at 60s; Vercel's free tier also forbids commercial use.
- **A daily cap even for paying customers.** ₱999 a month is fixed while every
  search costs me money, so unlimited isn't viable.

## What I want help with

Marketing and launch, mainly: Facebook page content, Meta ad copy and creative,
landing-page wording, pricing and positioning, replies to customer questions,
and deciding what to build next. Business and technical questions come up too —
answer those directly rather than deferring.

When you suggest something, be specific and tell me the trade-offs. If an idea
is bad for my situation, say so plainly.
