import { describe, it, expect } from 'vitest';
import { coverLetterSubject } from '@/lib/coverLetterSubject';
import type { AnalyzedJob } from '@/types';

const job = (title?: string) => ({ title } as unknown as AnalyzedJob);

describe('coverLetterSubject', () => {
  it('leads with the role, because that is what an employer scans for', () => {
    expect(coverLetterSubject(job('Executive Virtual Assistant')))
      .toBe('Application: Executive Virtual Assistant');
  });

  it('adds the applicant credential from a headline', () => {
    expect(coverLetterSubject(job('Bookkeeper'), 'Certified Accountant · 6 years · SaaS'))
      .toBe('Application: Bookkeeper — Certified Accountant');
  });

  it('does not stutter when the headline repeats the job title', () => {
    // "Application: Virtual Assistant — Virtual Assistant" reads as a bug.
    expect(coverLetterSubject(job('Virtual Assistant'), 'Virtual Assistant · 4 years'))
      .toBe('Application: Virtual Assistant');
  });

  it('still produces a usable subject when the job has no title', () => {
    expect(coverLetterSubject(job(undefined))).toBe('Application: Your open role');
    expect(coverLetterSubject(job('   '))).toBe('Application: Your open role');
  });

  it('ignores an empty or punctuation-only headline', () => {
    expect(coverLetterSubject(job('Designer'), '   ')).toBe('Application: Designer');
    expect(coverLetterSubject(job('Designer'), '·,·')).toBe('Application: Designer');
  });
});
