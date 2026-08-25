import { describe, it, expect } from 'vitest';
import { countBySource, jobSource, SOURCE_LABEL, SOURCE_ORDER } from '@/lib/sourceLabels';

describe('job source labelling', () => {
  it('treats a job with no source as OnlineJobs — the pre-multi-source default', () => {
    expect(jobSource({})).toBe('onlinejobs');
    expect(jobSource({ source: 'upwork' })).toBe('upwork');
  });

  it('counts each source and skips the ones that returned nothing', () => {
    const jobs = [
      { source: 'linkedin' as const },
      { source: 'upwork' as const },
      { source: 'linkedin' as const },
      {},                                  // legacy → onlinejobs
    ];
    expect(countBySource(jobs)).toEqual([
      { source: 'onlinejobs', count: 1 },
      { source: 'linkedin',   count: 2 },
      { source: 'upwork',     count: 1 },
    ]);
  });

  it('orders counts consistently regardless of the order jobs arrived in', () => {
    const a = countBySource([{ source: 'upwork' as const }, { source: 'linkedin' as const }]);
    const b = countBySource([{ source: 'linkedin' as const }, { source: 'upwork' as const }]);
    expect(a.map(x => x.source)).toEqual(b.map(x => x.source));
  });

  it('every source has a display label', () => {
    for (const s of SOURCE_ORDER) expect(SOURCE_LABEL[s]).toBeTruthy();
  });
});
