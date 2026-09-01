// ─── POST /api/cover-letter ───────────────────────────────────────────────────
// Turns a pasted job post into the same shape a searched job has, so the
// existing personalisation path can write a letter for it.
//
// A beta tester asked for this: they find jobs in Facebook groups, from
// referrals, and on sites we do not cover, and had no way to use the one
// feature they wanted. Search is how we find jobs; it should not be the only
// way in.
//
// Returns the analysed job, not the letter. The client then calls
// /api/personalize exactly as a search result does — one code path for letters,
// so the two can never drift apart.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { analyzeJobs } from '@/lib/aiAnalyzer';
import { consumeSearchAllowance } from '@/lib/searchAllowance';
import type { RawJob } from '@/types';

const MAX_CHARS = 12_000;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  // This costs a Claude call, so it counts against the same allowance searches
  // do. Without it, a free user out of lifetime searches had an unlimited
  // supply of paid analysis through the paste box.
  const denied = await consumeSearchAllowance(user, { keyword: 'pasted job', sources: [] });
  if (denied) return denied;

  const { description, title, company } = (await req.json().catch(() => ({}))) as {
    description?: string; title?: string; company?: string;
  };

  const text = (description ?? '').trim();
  if (text.length < 80) {
    return NextResponse.json({
      error: 'Paste a bit more of the job post so we have something to work from.',
    }, { status: 400 });
  }

  // Marks it as pasted rather than scraped, so /api/personalize does not treat
  // it as an OnlineJobs listing and demand a connection for it.
  const raw: RawJob = {
    id: `pasted-${Date.now()}`,
    source: undefined,
    title: (title ?? '').trim() || firstLineAsTitle(text),
    companyName: (company ?? '').trim() || '',
    description: text.slice(0, MAX_CHARS),
    url: '',
    salary: '',
    datePosted: null,
  } as RawJob;

  // The keyword is what the scorer matches against. For a pasted job the title
  // is the closest thing to intent we have.
  const [analyzed] = await analyzeJobs([raw], raw.title ?? '', process.env.OPENROUTER_API_KEY);
  return NextResponse.json({ job: analyzed });
}

/**
 * Job posts almost always open with the role. Guessing it beats making someone
 * fill in a second field before they can get what they came for.
 */
function firstLineAsTitle(text: string): string {
  const first = text.split('\n').map(l => l.trim()).find(Boolean) ?? '';
  return first.length > 0 && first.length <= 90 ? first : 'This role';
}
