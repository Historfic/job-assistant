import { describe, it, expect } from 'vitest';
import { encodeEvent, decodeChunk, insertRanked, type SearchEvent } from '@/lib/searchStream';
import type { AnalyzedJob } from '@/types';

function job(url: string, score: number, title = 'VA'): AnalyzedJob {
  return {
    id: url, title, url, score,
    description: '', companyName: '', salary: '', datePosted: null,
    analysis: {
      title, platform_redirect: false, redirect_platform: '',
      requires_file_upload: false, required_files: [], requires_cv: false,
      skills: [], keywords: [],
    },
  } as unknown as AnalyzedJob;
}

describe('NDJSON encoding', () => {
  it('writes one newline-terminated line per event', () => {
    const line = encodeEvent({ type: 'source-done', source: 'linkedin', found: 4 });
    expect(line.endsWith('\n')).toBe(true);
    expect(line.slice(0, -1).includes('\n')).toBe(false);
  });

  it('survives a payload containing newlines', () => {
    // Job descriptions have newlines constantly. If they leaked through raw
    // they would split one event into several unparseable fragments.
    const messy = job('https://x/1', 90, 'Line one\nLine two\r\nLine three');
    const { events, rest } = decodeChunk(encodeEvent({ type: 'job', job: messy }));
    expect(rest).toBe('');
    expect(events).toHaveLength(1);
    expect((events[0] as { job: AnalyzedJob }).job.title).toBe('Line one\nLine two\r\nLine three');
  });
});

describe('decodeChunk', () => {
  it('holds back a partial line for the next chunk', () => {
    const whole = encodeEvent({ type: 'source-done', source: 'upwork', found: 2 });
    const split = Math.floor(whole.length / 2);

    const first = decodeChunk(whole.slice(0, split));
    expect(first.events).toHaveLength(0);

    const second = decodeChunk(first.rest + whole.slice(split));
    expect(second.events).toHaveLength(1);
    expect(second.rest).toBe('');
  });

  it('reads several events out of one chunk', () => {
    const buf =
      encodeEvent({ type: 'source-done', source: 'onlinejobs', found: 3 }) +
      encodeEvent({ type: 'source-done', source: 'linkedin', found: 1 });
    expect(decodeChunk(buf).events).toHaveLength(2);
  });

  it('skips a corrupt line rather than losing the rest of the search', () => {
    const buf = 'not json at all\n' + encodeEvent({ type: 'source-done', source: 'upwork', found: 9 });
    const { events } = decodeChunk(buf);
    expect(events).toHaveLength(1);
    expect((events[0] as Extract<SearchEvent, { type: 'source-done' }>).found).toBe(9);
  });
});

describe('insertRanked', () => {
  it('puts a late high scorer above earlier arrivals', () => {
    let jobs: AnalyzedJob[] = [];
    jobs = insertRanked(jobs, job('https://x/88', 88));
    jobs = insertRanked(jobs, job('https://x/81', 81));
    jobs = insertRanked(jobs, job('https://x/99', 99));   // arrives last, ranks first
    expect(jobs.map(j => j.score)).toEqual([99, 88, 81]);
  });

  it('drops a duplicate url instead of showing the job twice', () => {
    // Multi-pass scraping re-fetches pages, so the same posting can arrive again.
    let jobs = insertRanked([], job('https://x/1', 90));
    jobs = insertRanked(jobs, job('https://x/1', 90));
    expect(jobs).toHaveLength(1);
  });

  it('orders equal scores stably so the list does not flicker', () => {
    let a: AnalyzedJob[] = [];
    a = insertRanked(a, job('https://x/b', 80));
    a = insertRanked(a, job('https://x/a', 80));

    let b: AnalyzedJob[] = [];
    b = insertRanked(b, job('https://x/a', 80));
    b = insertRanked(b, job('https://x/b', 80));

    expect(a.map(j => j.url)).toEqual(b.map(j => j.url));
  });
});
