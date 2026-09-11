import { describe, it, expect } from 'vitest';
import { buildAlertHtml } from '@/lib/alertEmail';
import type { RawJob } from '@/types';

const NOW = new Date('2026-09-11T05:46:00Z');
const APP = 'https://easyclientph.com';

function job(over: Partial<RawJob>): RawJob {
  return {
    id: 'x', companyName: null, employmentType: null, title: 'A job',
    url: 'https://example.com/a', salary: null, description: null,
    datePosted: null, source: 'onlinejobs', ...over,
  };
}

describe('buildAlertHtml', () => {
  it('puts the rate and the post time on each listing', () => {
    const html = buildAlertHtml(
      [job({ salary: '$1800/month', datePosted: '2026-09-11 13:24:57' })], 'VA', APP, NOW);
    expect(html).toContain('$1800/month');
    expect(html).toContain('Sep 11, 1:24 PM');
  });

  it('says "Not listed" rather than leaving the rate out', () => {
    // Plenty of posts hide the pay until the interview. A missing line would
    // read as the email being broken; "Not listed" reads as the employer's choice.
    const html = buildAlertHtml([job({})], 'VA', APP, NOW);
    expect(html).toContain('Not listed');
  });

  it('lists the newest post first and undated ones last', () => {
    const html = buildAlertHtml([
      job({ title: 'ZULU' }),
      job({ title: 'YANKEE', source: 'upwork', datePosted: '2026-09-10T21:31:16.982Z' }),
      job({ title: 'XRAY', datePosted: '2026-09-11 13:24:57' }),
    ], 'VA', APP, NOW);
    expect(html.indexOf('XRAY')).toBeLessThan(html.indexOf('YANKEE'));
    expect(html.indexOf('YANKEE')).toBeLessThan(html.indexOf('ZULU'));
  });

  it('escapes what the job sites send', () => {
    const html = buildAlertHtml(
      [job({ title: '<script>x</script>', salary: '<b>5</b>' })], 'VA', APP, NOW);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>5</b>');
  });
});
