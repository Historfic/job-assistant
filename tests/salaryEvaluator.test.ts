import { describe, it, expect } from 'vitest';
import { evaluateSalary } from '@/lib/salaryEvaluator';

describe('evaluateSalary — currency', () => {
  it('reads a peso salary as pesos, not dollars', () => {
    // The bug this replaces: ₱30,000/mo ÷ 160 = $187/hr, which sailed past
    // every filter and scored maximum on pay. It is really about $3/hr.
    const r = evaluateSalary('₱30,000/month', 10);
    expect(r.hourlyRate).toBeLessThan(5);
    expect(r.approved).toBe(false);
  });

  it('recognises PHP written out', () => {
    expect(evaluateSalary('PHP 40,000 per month', 10).hourlyRate)
      .toBeCloseTo(evaluateSalary('₱40,000 per month', 10).hourlyRate!, 1);
  });

  it('still reads a dollar salary as dollars', () => {
    const r = evaluateSalary('$25/hr', 10);
    expect(r.hourlyRate).toBe(25);
    expect(r.approved).toBe(true);
  });

  it('converts a dollar monthly salary to hourly', () => {
    // $3,200/mo over 160 hours is $20/hr.
    expect(evaluateSalary('$3,200/month', 10).hourlyRate).toBe(20);
  });

  it('a good peso salary still clears a realistic minimum', () => {
    // ₱90,000/mo is roughly $9.70/hr — a strong OnlineJobs salary.
    const r = evaluateSalary('₱90,000/month', 5);
    expect(r.approved).toBe(true);
  });
});

describe('evaluateSalary — approve when unsure', () => {
  it('approves when no salary is listed, rather than hiding the job', () => {
    // A filter that silently drops every post without a salary line would
    // remove most of OnlineJobs.
    for (const input of [null, undefined, '', '   ']) {
      expect(evaluateSalary(input, 50).approved).toBe(true);
    }
  });

  it('approves negotiable and unparseable salaries', () => {
    expect(evaluateSalary('Negotiable', 50).approved).toBe(true);
    expect(evaluateSalary('Competitive package', 50).approved).toBe(true);
  });

  it('takes the top of a range, so a wide band is judged on its ceiling', () => {
    expect(evaluateSalary('$800-$1,200/month', 5).hourlyRate).toBe(7.5);
  });
});

describe('evaluateSalary — the forms OnlineJobs actually writes', () => {
  it('reads Php with no space, which is how the site writes it', () => {
    // "\bphp\b" could never match here: there is no word boundary between
    // "p" and "3", so these all fell through to the dollar branch and became
    // $187/hr — exactly the bug the currency fix was meant to remove.
    for (const s of ['Php30,000/month', 'PHP30000 per month', 'P30,000/month']) {
      expect(evaluateSalary(s, 10).hourlyRate).toBeLessThan(10);
    }
  });

  it('lets an explicit dollar amount win over a mention of pesos', () => {
    const r = evaluateSalary('USD $1,500/month or PHP equivalent', 5);
    expect(r.hourlyRate).toBeCloseTo(9.38, 1);
    expect(r.approved).toBe(true);
  });

  it('still reads pesos when a dollar conversion is shown alongside', () => {
    // The symbol attached to the number is the one that counts.
    expect(evaluateSalary('₱30,000/month ($517)', 10).hourlyRate).toBeLessThan(10);
  });
});
