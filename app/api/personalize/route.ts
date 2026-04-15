// ─── POST /api/personalize ────────────────────────────────────────────────────
// Takes a single job + the base reusable message and returns a version
// personalized specifically for that listing.
//
// Uses OpenRouter if OPENROUTER_API_KEY is set, otherwise applies
// a fast template-based approach (no API call needed).

import { NextRequest, NextResponse } from 'next/server';
import type { AnalyzedJob } from '@/types';

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    let message: string;

    if (apiKey) {
      try {
        message = await personalizeWithAI(job, baseMessage, apiKey);
      } catch {
        // Fall back to local if AI fails
        message = personalizeLocally(job, baseMessage);
      }
    } else {
      message = personalizeLocally(job, baseMessage);
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
