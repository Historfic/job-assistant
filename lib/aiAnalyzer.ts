// ─── AI Analyzer ──────────────────────────────────────────────────────────────
// Analyzes raw job listings using either:
//   A) OpenRouter API (when OPENROUTER_API_KEY is set) — llama-3.1-8b-instruct
//   B) Local regex heuristics (zero-config fallback)
//
// Returns structured JobAnalysis objects matching the spec in the product brief.

import type { RawJob, JobAnalysis, AnalyzedJob } from '@/types';

// ─── Keyword lists ─────────────────────────────────────────────────────────────

const FILE_UPLOAD_KEYWORDS = [
  'video intro', 'video introduction', 'loom video', 'video application',
  'voice recording', 'audio recording', 'portfolio upload', 'upload portfolio',
  'video demo', 'demo reel', 'showreel', 'video reel', 'screen recording',
  'video submission', 'submit a video', 'record a video',
];

const CV_KEYWORDS = [
  'resume', 'cv', 'curriculum vitae', 'attach your cv', 'send your resume',
  'portfolio', 'work samples',
];

const PLATFORM_REDIRECT_PATTERNS: Record<string, RegExp> = {
  'LinkedIn':   /apply.*linkedin|linkedin.*apply|via linkedin/i,
  'Indeed':     /apply.*indeed|indeed.*apply|via indeed/i,
  'Upwork':     /apply.*upwork|upwork.*apply|continue on upwork/i,
  'Freelancer': /freelancer\.com|apply.*freelancer/i,
  'Email':      /email.*application|apply.*email|send.*email.*to apply/i,
  'Typeform':   /typeform|google form|application form/i,
};

const SKILL_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
  'javascript', 'typescript', 'node.js', 'express', 'fastapi', 'django', 'flask',
  'python', 'php', 'ruby', 'go', 'rust',
  'mysql', 'postgresql', 'mongodb', 'redis', 'supabase', 'firebase',
  'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'vercel', 'netlify',
  'wordpress', 'shopify', 'woocommerce',
  'figma', 'photoshop', 'illustrator', 'canva',
  'n8n', 'zapier', 'make', 'airtable',
  'openai', 'chatgpt', 'claude', 'ai', 'llm', 'machine learning',
  'seo', 'google ads', 'facebook ads', 'email marketing',
  'zendesk', 'hubspot', 'salesforce', 'notion', 'asana', 'jira',
  'excel', 'google sheets', 'data analysis', 'sql',
];

// ─── Local (regex) analyzer ────────────────────────────────────────────────────

export function analyzeJobLocally(job: RawJob): JobAnalysis {
  const fullText = `${job.title ?? ''} ${job.description ?? ''}`.toLowerCase();

  // File upload detection
  const requires_file_upload = FILE_UPLOAD_KEYWORDS.some(kw => fullText.includes(kw));
  const required_files = FILE_UPLOAD_KEYWORDS.filter(kw => fullText.includes(kw))
    .map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));

  // CV / resume detection
  const requires_cv = CV_KEYWORDS.some(kw => fullText.includes(kw));

  // Platform redirect detection
  let platform_redirect = false;
  let redirect_platform = '';
  for (const [platform, pattern] of Object.entries(PLATFORM_REDIRECT_PATTERNS)) {
    if (pattern.test(fullText)) {
      platform_redirect = true;
      redirect_platform = platform;
      break;
    }
  }

  // Skill extraction
  const skills = SKILL_KEYWORDS.filter(kw => fullText.includes(kw));

  // Keyword extraction: title words + top skills
  const titleWords = (job.title ?? '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .map(w => w.replace(/[^a-zA-Z0-9.+#]/g, ''))
    .filter(Boolean);
  const keywords = [...new Set([...skills.slice(0, 5), ...titleWords.slice(0, 5)])].slice(0, 10);

  return {
    title: job.title ?? '',
    platform_redirect,
    redirect_platform,
    requires_file_upload,
    required_files,
    requires_cv,
    skills,
    keywords,
  };
}

// ─── OpenRouter AI analyzer ────────────────────────────────────────────────────

async function analyzeJobWithAI(job: RawJob, apiKey: string): Promise<JobAnalysis> {
  const prompt = `Analyze this job listing and return ONLY a valid JSON object. No explanation, just JSON.

Job Title: ${job.title}
Description: ${(job.description ?? '').slice(0, 800)}

Return exactly this JSON structure:
{
  "title": "${job.title}",
  "platform_redirect": false,
  "redirect_platform": "",
  "requires_file_upload": false,
  "required_files": [],
  "requires_cv": false,
  "skills": [],
  "keywords": []
}

Rules:
- platform_redirect: true if job asks to apply on LinkedIn, Upwork, email, or external site
- redirect_platform: the platform name if platform_redirect is true
- requires_file_upload: true ONLY if job explicitly requires video intro, Loom recording, audio recording, portfolio file upload, or screen recording
- required_files: list what files are required if requires_file_upload is true
- requires_cv: true if job mentions resume, CV, or curriculum vitae
- skills: array of technical/professional skills mentioned (React, Python, SEO, etc.)
- keywords: 5-8 most important keywords from the job listing`;

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
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  // Extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');

  const parsed = JSON.parse(jsonMatch[0]) as JobAnalysis;
  return parsed;
}

// ─── Score calculator ──────────────────────────────────────────────────────────
// Score 0-100 based on salary, keyword match, and simplicity (no redirects)

export function scoreJob(job: RawJob, analysis: JobAnalysis, keyword: string): number {
  let score = 50; // base

  // Salary quality
  if (job.hourlyRate) {
    if (job.hourlyRate >= 30) score += 25;
    else if (job.hourlyRate >= 20) score += 18;
    else if (job.hourlyRate >= 10) score += 10;
  } else if (job.salary) {
    score += 8; // has some salary info
  }

  // Keyword match
  const kw = keyword.toLowerCase();
  const titleMatch = (job.title ?? '').toLowerCase().includes(kw);
  const descMatch = (job.description ?? '').toLowerCase().includes(kw);
  if (titleMatch) score += 15;
  if (descMatch) score += 5;

  // Skills richness
  score += Math.min(analysis.skills.length * 2, 10);

  // Simplicity bonus (no redirect, no CV required)
  if (!analysis.platform_redirect) score += 5;
  if (!analysis.requires_cv) score += 3;

  return Math.min(100, Math.round(score));
}

// ─── Main batch analyzer ───────────────────────────────────────────────────────

export async function analyzeJobs(
  jobs: RawJob[],
  keyword: string,
  openRouterKey?: string
): Promise<AnalyzedJob[]> {
  const results: AnalyzedJob[] = [];
  const useAI = Boolean(openRouterKey);

  for (const job of jobs) {
    let analysis: JobAnalysis;

    try {
      if (useAI) {
        analysis = await analyzeJobWithAI(job, openRouterKey!);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } else {
        analysis = analyzeJobLocally(job);
      }
    } catch {
      // Always fall back to local analysis on any AI error
      analysis = analyzeJobLocally(job);
    }

    const score = scoreJob(job, analysis, keyword);
    results.push({ ...job, analysis, score });
  }

  return results;
}

// ─── Application message generator ───────────────────────────────────────────

export async function generateApplicationMessage(
  jobs: AnalyzedJob[],
  openRouterKey?: string
): Promise<string> {
  const hasCV = jobs.some(j => j.analysis.requires_cv);
  const hasPlatformRedirect = jobs.some(j => j.analysis.platform_redirect);

  const allSkills = [...new Set(jobs.flatMap(j => j.analysis.skills))].slice(0, 8);
  const topKeywords = [...new Set(jobs.flatMap(j => j.analysis.keywords))].slice(0, 6);

  // Use AI if available
  if (openRouterKey) {
    const prompt = `Write a professional, human-sounding job application message for remote positions.

Skills to highlight: ${allSkills.join(', ')}
Keywords from job listings: ${topKeywords.join(', ')}
${hasCV ? '- Include: "I have attached my CV/resume for your review."' : ''}
${hasPlatformRedirect ? '- Include: "I am open to continuing the application process on your preferred platform."' : ''}

Structure:
1. Brief, engaging introduction (2 sentences)
2. Core skills and what I bring (3-4 sentences, mention the specific skills above)
3. ${hasCV ? 'CV mention' : 'Enthusiasm to discuss further'}
4. ${hasPlatformRedirect ? 'Platform flexibility line' : ''}
5. Professional closing

Tone: Professional, confident, human — NOT robotic or generic. Write in first person. Under 200 words.`;

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://job-assistant.vercel.app',
          'X-Title': 'JobIQ Assistant',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.choices?.[0]?.message?.content?.trim();
        if (msg && msg.length > 50) return msg;
      }
    } catch {
      // fall through to template
    }
  }

  // Template-based fallback
  const skillsText = allSkills.length > 0
    ? `I specialize in ${allSkills.slice(0, 4).join(', ')}, and I have hands-on experience delivering results in these areas.`
    : 'I bring a strong foundation in remote work, communication, and delivering high-quality results.';

  return `Hello,

I came across your job posting and I'm genuinely excited about this opportunity. Your role aligns well with my background, and I believe I can add real value to your team from day one.

${skillsText} I'm comfortable working independently, meeting deadlines, and adapting quickly to new tools and workflows. My experience in remote environments has made me highly responsive and proactive in my communication.
${hasCV ? '\nI have attached my CV/resume for your review.' : ''}${hasPlatformRedirect ? '\nI am open to continuing the application process on your preferred platform.' : ''}

I would love the chance to discuss how I can contribute to your team. Thank you for considering my application — looking forward to hearing from you!

Best regards`.trim();
}
