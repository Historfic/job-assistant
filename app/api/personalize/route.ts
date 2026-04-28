// ─── POST /api/personalize ────────────────────────────────────────────────────
// Takes a single job + the base reusable message and returns a version
// personalized specifically for that listing.
//
// Uses Claude Haiku (ANTHROPIC_API_KEY) for high-quality personalization,
// falls back to OpenRouter (OPENROUTER_API_KEY), then local template.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    if (!res.ok) return '';

    const html = await res.text();
    const $ = load(html);

    // Confirmed selector: <p id="job-description" class="job-description">
    const selectors = [
      '#job-description',
      '.job-description',
      '.jobpost-details',
      '.job-details',
      '.description-content',
    ];
    for (const sel of selectors) {
      const text = $(sel).text().replace(/\s+/g, ' ').trim();
      if (text.length > 100) return text;
    }

    // Fallback: collect all meaningful paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 30) paragraphs.push(t);
    });
    return paragraphs.join(' ');
  } catch {
    return '';
  }
}

function buildPersonalizePrompt(job: AnalyzedJob, baseMessage: string): string {
  const raw = job.description ?? '';
  const head = raw.slice(0, 1000);
  const tail = raw.length > 1800 ? '\n\n[...]\n\n' + raw.slice(-800) : '';
  const description = head + tail;
  const skills = job.analysis.skills.join(', ') || 'Not listed';

  return `You are writing a personalized job application message for a remote job on OnlineJobs.ph.

Job Title: ${job.title}
Company: ${job.companyName ?? 'Not specified'}
Salary: ${job.salary ?? 'Not specified'}
Skills Required: ${skills}
Job Description:
"""
${description}
"""
${job.analysis.requires_cv ? '\nNote: This job requires a CV/resume.' : ''}
${job.analysis.platform_redirect ? `\nNote: This job asks to apply via ${job.analysis.redirect_platform}.` : ''}

Here is the applicant's background for reference:
"""
${baseMessage}
"""

Write a unique, personalized cover letter that:
- Opens with a specific hook referencing something concrete from the job description (NOT a generic "I came across your posting" opener)
- Demonstrates understanding of what this specific role actually needs
- Naturally weaves in 2-3 relevant skills from the job listing
- Mentions the company name if available
- Stays under 180 words
- Sounds human and enthusiastic, not robotic
${job.analysis.requires_cv ? '- Mentions that CV is attached' : ''}
${job.analysis.platform_redirect ? `- Mentions willingness to continue on ${job.analysis.redirect_platform}` : ''}
- Does NOT start with "Dear Hiring Manager" or a subject line
- Returns ONLY the message text, nothing else`;
}

async function personalizeWithClaude(job: AnalyzedJob, baseMessage: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: buildPersonalizePrompt(job, baseMessage) }],
  });

  const block = response.content[0];
  if (block.type !== 'text' || block.text.length < 30) throw new Error('Empty Claude response');
  return block.text.trim();
}

async function personalizeWithOpenRouter(job: AnalyzedJob, baseMessage: string, apiKey: string): Promise<string> {
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
      messages: [{ role: 'user', content: buildPersonalizePrompt(job, baseMessage) }],
      temperature: 0.65,
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message?.content?.trim();
  if (!msg || msg.length < 30) throw new Error('Empty OpenRouter response');
  return msg;
}

function personalizeLocally(job: AnalyzedJob, baseMessage: string): string {
  const title   = job.title ?? 'this position';
  const company = job.companyName;
  const skills  = job.analysis.skills.slice(0, 3);
  const desc    = job.description ?? '';

  // Extract a concrete detail from the job description for the opener
  const sentences = desc.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 150);
  const detailHook = sentences.length > 0
    ? sentences[0]
    : null;

  // Build opener that references something specific about the role
  let opener: string;
  if (detailHook) {
    opener = company
      ? `When I read about ${company}'s need for a ${title} — specifically "${detailHook.toLowerCase()}" — I knew this was a role I could make an immediate impact in.`
      : `Your posting for a ${title} caught my attention right away, particularly the focus on ${detailHook.toLowerCase()}.`;
  } else {
    opener = company
      ? `I'm excited to apply for the ${title} role at ${company} — the scope of this position is exactly the kind of work I do best.`
      : `I'm applying for your ${title} role and am confident I can deliver exactly what you're looking for.`;
  }

  // Skills paragraph
  const skillLine = skills.length > 0
    ? `I bring hands-on experience with ${skills.join(', ')}, which maps directly to what this role requires.`
    : 'I bring a strong track record in remote work, fast turnaround, and high-quality output.';

  // Pull the middle/closing from the base message (skip its generic opener)
  const baseLines = baseMessage.split('\n').filter(Boolean);
  const middle = baseLines.slice(1).join('\n\n');

  return [opener, skillLine, middle].filter(Boolean).join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const { job, baseMessage }: { job: AnalyzedJob; baseMessage: string } = await req.json();

    if (!job || !baseMessage) {
      return NextResponse.json({ error: 'job and baseMessage are required' }, { status: 400 });
    }

    // Always re-fetch the full job page — the scraper caps descriptions at
    // 2000 chars during bulk scraping, which cuts off the "how to apply"
    // section that typically appears at the end. One extra request per
    // personalization click is acceptable and ensures the AI sees everything.
    let enrichedJob = job;
    if (job.url) {
      const sessionCookie = process.env.ONLINEJOBS_SESSION_COOKIE;
      const fullDesc = await fetchFullDescription(job.url, sessionCookie);
      if (fullDesc.length > 0) {
        enrichedJob = { ...job, description: fullDesc };
      }
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    let message: string;
    let source = 'local';

    if (anthropicKey) {
      try {
        message = await personalizeWithClaude(enrichedJob, baseMessage, anthropicKey);
        source = 'claude';
      } catch (err) {
        console.error('[/api/personalize] Claude failed:', err);
        message = personalizeLocally(enrichedJob, baseMessage);
      }
    } else if (openRouterKey) {
      try {
        message = await personalizeWithOpenRouter(enrichedJob, baseMessage, openRouterKey);
        source = 'openrouter';
      } catch (err) {
        console.error('[/api/personalize] OpenRouter failed:', err);
        message = personalizeLocally(enrichedJob, baseMessage);
      }
    } else {
      console.warn('[/api/personalize] No AI key found — using local fallback. ANTHROPIC_API_KEY set:', Boolean(anthropicKey));
      message = personalizeLocally(enrichedJob, baseMessage);
    }

    console.log(`[/api/personalize] source=${source} descLen=${enrichedJob.description?.length ?? 0}`);
    return NextResponse.json({ message, source });
  } catch (err) {
    console.error('[/api/personalize]', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to personalize' },
      { status: 500 }
    );
  }
}
