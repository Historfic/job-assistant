// ─── POST /api/generate-questions ─────────────────────────────────────────────
// Generates targeted cover-letter questions based on a specific job description.
// Uses Claude → OpenRouter → local fallback.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AnalyzedJob } from '@/types';

export interface CoverLetterQuestion {
  id: string;
  question: string;
  placeholder: string;
}

function buildQuestionsPrompt(job: AnalyzedJob): string {
  const desc = (job.description ?? '').slice(0, 1500);
  const skills = job.analysis.skills.join(', ') || 'Not listed';

  return `Generate exactly 2-3 short questions to help personalize a cover letter for this job. Keep it light — these are just quick prompts to give the letter a personal touch, not a full interview.

Job Title: ${job.title ?? 'Not specified'}
Company: ${job.companyName ?? 'Not specified'}
Skills Required: ${skills}
Job Description:
"""
${desc}
"""

Pick only the 2-3 most useful questions based on what the job actually asks for. Focus on:
- A quick note on relevant experience or a standout example (if the job has specific skill requirements)
- Anything personal that would make the letter feel genuine (availability, why this role, etc.)

Do NOT ask about things not relevant to this specific job. Fewer, better questions over many generic ones.

Return ONLY a JSON array, no explanation:
[
  {
    "id": "q1",
    "question": "Full question text",
    "placeholder": "Short hint about what kind of answer works best"
  }
]`;
}

/**
 * Words too generic to build a question around, even when they are genuinely
 * in the post. "What's your experience with AI?" tells the letter nothing, and
 * reads like the software did not understand the job.
 */
const TOO_VAGUE = new Set(['ai', 'excel', 'google sheets', 'notion', 'canva']);

function localFallback(job: AnalyzedJob): CoverLetterQuestion[] {
  const title = job.title ?? 'this role';

  // The job title beats a keyword list. It is always present, always specific
  // to the post, and a question built from it cannot be nonsense — whereas a
  // skill list can be, and was: users were asked about "go or make" on an HVAC
  // estimator job because those matched inside "going" and "makes".
  const specific = job.analysis.skills.filter(s => !TOO_VAGUE.has(s.toLowerCase())).slice(0, 2);

  const q1: CoverLetterQuestion = specific.length > 0
    ? {
        id: 'q1',
        question: `You'll be working with ${specific[0]}${specific[1] ? ` and ${specific[1]}` : ''} in this role. What have you done with ${specific[1] ? 'them' : 'it'}?`,
        placeholder: 'A sentence is enough. A real example beats a long answer.',
      }
    : {
        id: 'q1',
        question: `What have you done that is closest to this ${title.toLowerCase()} role?`,
        placeholder: 'A sentence is enough. A real example beats a long answer.',
      };

  return [
    q1,
    {
      id: 'q2',
      question: 'Anything specific you want the cover letter to mention? (optional)',
      placeholder: 'e.g. availability, a past result, why you want this role',
    },
  ];
}

function parseQuestions(text: string): CoverLetterQuestion[] | null {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as CoverLetterQuestion[];
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { job }: { job: AnalyzedJob } = await req.json();
    if (!job) return NextResponse.json({ error: 'job is required' }, { status: 400 });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const prompt = buildQuestionsPrompt(job);
    let questions: CoverLetterQuestion[] | null = null;

    if (anthropicKey) {
      try {
        const client = new Anthropic({ apiKey: anthropicKey });
        const res = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }],
        });
        const block = res.content[0];
        if (block.type === 'text') questions = parseQuestions(block.text);
      } catch (err) {
        console.error('[generate-questions] Claude failed:', err);
      }
    }

    if (!questions && openRouterKey) {
      const models = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free'];
      for (const model of models) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://job-assistant.vercel.app',
              'X-Title': 'EasyClient Assistant',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.4,
              max_tokens: 700,
            }),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() ?? '';
          questions = parseQuestions(text);
          if (questions) break;
        } catch (err) {
          console.error(`[generate-questions] OpenRouter model ${model} failed:`, err);
        }
      }
    }

    if (!questions) questions = localFallback(job);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[generate-questions]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
