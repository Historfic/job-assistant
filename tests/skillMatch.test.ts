import { describe, it, expect } from 'vitest';
import { analyzeJobLocally } from '@/lib/aiAnalyzer';
import type { RawJob } from '@/types';

const job = (description: string, title = 'HVAC Estimator') =>
  ({ title, description } as unknown as RawJob);

describe('skill extraction', () => {
  it('does not find skills inside ordinary words', () => {
    // The bug this replaces: plain substring matching tagged an HVAC estimator
    // job with go, make, ai and excel, which then fed the score, the cover
    // letter and the quick questions.
    const skills = analyzeJobLocally(job(
      'The employee must be available and responsive. Excellent communication. ' +
      'Email us. We are going to move fast and this makes a difference.',
    )).skills;
    for (const wrong of ['ai', 'excel', 'go', 'make']) {
      expect(skills).not.toContain(wrong);
    }
  });

  it('still finds skills that are really mentioned', () => {
    const skills = analyzeJobLocally(job(
      'Strong Excel and Google Sheets. We automate with Make.com and n8n.',
    )).skills;
    expect(skills).toEqual(expect.arrayContaining(['excel', 'google sheets', 'make.com', 'n8n']));
  });

  it('matches a dotted name without the dot cutting it short', () => {
    expect(analyzeJobLocally(job('Backend in Node.js please')).skills).toContain('node.js');
  });

  it('finds AI when it is actually the subject', () => {
    expect(analyzeJobLocally(job('You will work with AI tooling daily')).skills).toContain('ai');
  });
});
