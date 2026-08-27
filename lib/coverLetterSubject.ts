// A cover letter without a subject line is a letter someone has to finish
// writing before they can send it. Every generated letter gets one.
//
// Derived from the job rather than asked of the model: a second AI call per
// letter would add cost and latency to produce a line whose whole job is to
// name the role and the applicant. The information is already here.

import type { AnalyzedJob } from '@/types';

/**
 * Employers scan subject lines for the role they posted, so the role goes
 * first. A headline like "Virtual Assistant · 4 years · e-commerce" carries
 * the years and the niche too, but only the first segment reads as a job title.
 */
export function coverLetterSubject(job: AnalyzedJob, headline?: string): string {
  const role = (job.title ?? '').trim() || 'Your open role';

  const credential = (headline ?? '')
    .split(/\s*[·|,]\s*/)
    .map(part => part.trim())
    .filter(Boolean)[0];

  // "Application: Executive VA — Virtual Assistant"  reads as a stutter when
  // the headline just repeats the job title back.
  const sameThing =
    credential && role.toLowerCase().includes(credential.toLowerCase());

  return credential && !sameThing
    ? `Application: ${role} — ${credential}`
    : `Application: ${role}`;
}
