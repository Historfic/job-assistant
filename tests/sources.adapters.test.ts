import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pickString } from '@/lib/sources/apify';
import { mapLinkedInItem } from '@/lib/sources/linkedin';
import { mapUpworkItem } from '@/lib/sources/upwork';
import { mockJobsFor } from '@/lib/sources/mock';
import { getJobsFromSources } from '@/lib/sources';

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

describe('getJobsFromSources', () => {
  it('interleaves jobs round-robin across sources instead of concatenating', async () => {
    delete process.env.DEMO_MODE; // demo/mock mode (isLiveEnabled requires DEMO_MODE === 'false')
    const { jobs } = await getJobsFromSources(
      ['onlinejobs', 'linkedin', 'upwork'],
      { keyword: 'react', limit: 5 },
    );
    const firstThreeSources = jobs.slice(0, 3).map(j => j.source);
    expect(new Set(firstThreeSources).size).toBe(3);
  });
});

describe('getJobsFromSources live mode without token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    saved.DEMO_MODE = process.env.DEMO_MODE;
    saved.APIFY_TOKEN = process.env.APIFY_TOKEN;
    process.env.DEMO_MODE = 'false';
    delete process.env.APIFY_TOKEN;
  });
  afterEach(() => {
    if (saved.DEMO_MODE === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = saved.DEMO_MODE;
    if (saved.APIFY_TOKEN === undefined) delete process.env.APIFY_TOKEN; else process.env.APIFY_TOKEN = saved.APIFY_TOKEN;
  });

  it('reports an error for apify sources instead of silently mocking', async () => {
    const result = await getJobsFromSources(['linkedin'], { keyword: 'react', limit: 3 });
    expect(result.jobs).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].source).toBe('linkedin');
    expect(result.errors[0].message).toContain('APIFY_TOKEN');
  });
});

describe('mapUpworkItem url', () => {
  it('rebuilds the permalink from subId, not the markup-laden search url', () => {
    const job = mapUpworkItem({
      title: 'Social Media Virtual Assistant',
      subId: '~022087880195093014006',
      url: 'https://www.upwork.com/jobs/Social-Media-span-class-highlight-Virtual-span-Dropshipping_~022087880195093014006/?referrer_url_path=/nx/search/jobs/',
    }, 0, 'virtual assistant');
    expect(job.url).toBe('https://www.upwork.com/jobs/~022087880195093014006');
    expect(job.url).not.toContain('span-class-highlight');
  });

  it('falls back to the raw url when subId is absent', () => {
    const job = mapUpworkItem(
      { title: 'X', url: 'https://www.upwork.com/jobs/~0123' }, 0, 'x');
    expect(job.url).toBe('https://www.upwork.com/jobs/~0123');
  });

  it('shows the client average rate when budget is N/A', () => {
    const job = mapUpworkItem(
      { title: 'X', budget: 'N/A', clientAvgHourlyRate: '$12.50/hr' }, 0, 'x');
    expect(job.salary).toBe('$12.50/hr');
  });
});
