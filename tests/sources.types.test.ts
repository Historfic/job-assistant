import { describe, it, expect } from 'vitest';
import { normalizeSources } from '@/lib/sources/types';

describe('normalizeSources', () => {
  it('defaults to onlinejobs when input is missing', () => {
    expect(normalizeSources(undefined)).toEqual(['onlinejobs']);
  });

  it('defaults to onlinejobs when the array is empty or all-invalid', () => {
    expect(normalizeSources([])).toEqual(['onlinejobs']);
    expect(normalizeSources(['myspace'])).toEqual(['onlinejobs']);
  });

  it('drops unknown sources and dedupes', () => {
    expect(normalizeSources(['linkedin', 'linkedin', 'myspace'])).toEqual(['linkedin']);
  });

  it('keeps valid multi-source selections in order', () => {
    expect(normalizeSources(['onlinejobs', 'upwork'])).toEqual(['onlinejobs', 'upwork']);
  });
});
