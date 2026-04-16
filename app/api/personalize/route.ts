// ─── POST /api/personalize ────────────────────────────────────────────────────
// Takes a single job + the base reusable message and returns a version
// personalized specifically for that listing.
//
// Uses OpenRouter if OPENROUTER_API_KEY is set, otherwise applies
// a fast template-based approach (no API call needed).

import { NextRequest, NextResponse } from 'next/server';
import type { AnalyzedJob } from '@/types';

// ─── Fetch full job description from the detail page ─────────────────────────
// Called when the job's stored description is missing or too short to
// produce a good personalized message. Individual job pages on onlinejobs.ph
// are server-rendered and contain the complete job post.

async function fetchFullDescription(url: string, sessionCookie?: string): Promise<string> {
  try {
    const { load } = await import('cheerio');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    };
    if (sessionCookie) headers['Cookie'] = `ci_session=${sessionCookie}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return '';

    const html = await res.text();
    const $ = load(html);

    // Try specific job-content selectors first
    const selectors = [
      '.jobpost-details', '.job-description', '.job-details',
      '#job-description', '[class*="job-desc"]', '.description-content',
    ];
    for (const sel of selectors) {
      const text = $(sel).text().replace(/\s+/g, ' ').trim();
      if (text.length > 100) return text.slice(0, 2000);
    }

    // Fallback: collect all meaningful paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 30) paragraphs.push(t);
    });
    return paragraphs.join(' ').slice(0, 2000);
  } catch {
    return '';
  }
}

async function personalizeWithAI(
  job: AnalyzedJob,
  baseMessage: string,
  apiKey: string
): Promise<string> {
  const prompt = `You are helping someone apply for a remote job on OnlineJobs.ph.

Here is their base application message:
"""
${baseMessage}
"""

Now personalize it specifically for this job posting:
- Job Title: ${job.title}
- Company: ${job.companyName ?? 'Unknown'}
- Salary: ${job.salary ?? 'Not specified'}
- Skills required: ${job.analysis.skills.join(', ') || 'Not listed'}
- Description: ${(job.description ?? '').slice(0, 500)}
${job.analysis.requires_cv ? '- This job requires a CV/resume attachment.' : ''}
${job.analysis.platform_redirect ? `- This job asks to apply via ${job.analysis.redirect_platform}.` : ''}

Rules:
- Keep the same professional, human tone
- Reference the specific job title and 1-2 skills from the listing naturally
- Mention the company name once if available
- Keep it under 180 words
- Do NOT add a subject line or "Dear Hiring Manager" header — start directly with the opening sentence
- Return ONLY the message text, nothing else`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://job-assistant.vercel.app',
      'X-Title': 'JobIQ Assistant',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.65,
      max_tokens: 350,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

  const data = await res.json();
  const msg = data.choices?.[0]?.message?.content?.trim();
  if (!msg || msg.length < 30) throw new Error('Empty AI response');
  return msg;
}

function personalizeLocally(job: AnalyzedJob, baseMessage: string): string {
  // Simple template injection — works without any API key
  const title   = job.title ?? 'this position';
  const company = job.companyName;
  const skills  = job.analysis.skills.slice(0, 3);

  // Build an opening line that references the specific role
  const opener = company
    ? `I came across ${company}'s posting for a ${title} and I'm genuinely excited to apply.`
    : `I came across your posting for a ${title} and I'm genuinely excited to apply.`;

  // Build a skills sentence if available
  const skillLine = skills.length > 0
    ? `My background in ${skills.join(', ')} directly aligns with what you're looking for.`
    : '';

  // Splice the opener into the base message, replacing the first sentence
  const lines = baseMessage.split('\n').filter(Boolean);
  // Replace first paragraph with the personalized opener
  lines[0] = opener;
  if (skillLine && lines.length > 1) {
    lines.splice(1, 0, skillLine);
  }

  return lines.join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const { job, baseMessage }: { job: AnalyzedJob; baseMessage: string } = await req.json();

    if (!job || !baseMessage) {
      return NextResponse.json({ error: 'job and baseMessage are required' }, { status: 400 });
    }

    // If the description is missing or too short, fetch the full job page so
    // the AI has enough context to write a genuinely tailored message.
    let enrichedJob = job;
    if (job.url && (job.description ?? '').length < 150) {
      const sessionCookie = process.env.ONLINEJOBS_SESSION_COOKIE;
      const fullDesc = await fetchFullDescription(job.url, sessionCookie);
      if (fullDesc.length > (job.description ?? '').length) {
        enrichedJob = { ...job, description: fullDesc };
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    let message: string;

    if (apiKey) {
      try {
        message = await personalizeWithAI(enrichedJob, baseMessage, apiKey);
      } catch {
        message = personalizeLocally(enrichedJob, baseMessage);
      }
    } else {
      message = personalizeLocally(enrichedJob, baseMessage);
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error('[/api/personalize]', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to personalize' },
      { status: 500 }
    );
  }
}
