import { describe, it, expect } from 'vitest';
import { pickString } from '@/lib/sources/apify';
import { mapLinkedInItem } from '@/lib/sources/linkedin';
import { mapUpworkItem } from '@/lib/sources/upwork';
import { mockJobsFor } from '@/lib/sources/mock';

describe('pickString', () => {
  it('returns the first non-empty string among candidate keys', () => {
    expect(pickString({ a: '', b: '  hi  ', c: 'later' }, ['a', 'b', 'c'])).toBe('hi');
  });
  it('returns null when nothing matches', () => {
    expect(pickString({ a: 42 }, ['a', 'b'])).toBeNull();
  });
});

describe('mapLinkedInItem', () => {
  it('maps a typical actor item to RawJob', () => {
    const job = mapLinkedInItem({
      title: 'React Developer',
      companyName: 'Acme Corp',
      jobUrl: 'https://www.linkedin.com/jobs/view/123',
      description: 'Build UIs',
      postedTime: '2026-08-01',
    }, 0, 'react');
    expect(job.source).toBe('linkedin');
    expect(job.title).toBe('React Developer');
    expect(job.companyName).toBe('Acme Corp');
    expect(job.url).toBe('https://www.linkedin.com/jobs/view/123');
    expect(job.query).toBe('react');
  });
});

describe('mapUpworkItem', () => {
  it('maps budget fields into salary', () => {
    const job = mapUpworkItem({
      title: 'Data entry',
      link: 'https://www.upwork.com/jobs/~abc',
      hourlyRate: '$5-$8',
      description: 'Sheets work',
    }, 0, 'data entry');
    expect(job.source).toBe('upwork');
    expect(job.salary).toBe('$5-$8');
  });
});

describe('mockJobsFor', () => {
  it('stamps source and a source-appropriate URL', () => {
    const jobs = mockJobsFor('linkedin', 'react', 3);
    expect(jobs).toHaveLength(3);
    jobs.forEach(j => {
      expect(j.source).toBe('linkedin');
      expect(j.url).toContain('linkedin.com');
    });
  });
});
