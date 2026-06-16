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

  return `Generate 4-5 targeted questions to help personalize a cover letter for this job.

Job Title: ${job.title ?? 'Not specified'}
Company: ${job.companyName ?? 'Not specified'}
Skills Required: ${skills}
Job Description:
"""
${desc}
"""

Create questions that will surface concrete, compelling details for a cover letter. Make each question specific to THIS job's requirements — not generic.

Cover these areas:
1. Direct experience with the top 1-2 required skills (ask for a specific result or example)
2. A relevant achievement or project that proves they can do the work
3. What makes them uniquely qualified vs. other applicants
4. Availability and working hours (important for remote roles)
5. Any specific requirement from the job description worth addressing directly

Return ONLY a JSON array, no explanation:
[
  {
    "id": "q1",
    "question": "Full question text",
    "placeholder": "Short hint about what kind of answer works best"
  }
]`;
}

function localFallback(job: AnalyzedJob): CoverLetterQuestion[] {
  const skills = job.analysis.skills.slice(0, 2);
  const title = job.title ?? 'this role';

  const q1: CoverLetterQuestion = skills.length > 0
    ? {
        id: 'q1',
        question: `How many years of experience do you have with ${skills[0]}${skills[1] ? ` and ${skills[1]}` : ''}? Share a specific project or result you're proud of.`,
        placeholder: 'e.g. 3 years — built a reporting dashboard that cut manual work by 40%',
      }
    : {
        id: 'q1',
        question: `What is your most relevant experience for the ${title} position?`,
        placeholder: 'Describe your background and a key result',
      };

  return [
    q1,
    {
      id: 'q2',
      question: 'Describe a specific achievement or project that directly matches what this job requires.',
      placeholder: 'e.g. Managed social media for a 10k-follower brand and grew engagement by 25%',
    },
    {
      id: 'q3',
      question: 'What makes you a stronger fit for this role compared to other applicants?',
      placeholder: 'e.g. I combine technical skills with direct client-facing communication experience',
    },
    {
      id: 'q4',
      question: 'What is your availability and preferred working hours?',
      placeholder: 'e.g. Full-time, available 8am–6pm PHT, flexible for US timezone overlap',
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
              'X-Title': 'JobIQ Assistant',
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
