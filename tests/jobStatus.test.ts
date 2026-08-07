import { describe, it, expect } from 'vitest';
import { applyToggle } from '@/lib/jobStatus';

const URL = 'https://example.com/job/1';

describe('applyToggle', () => {
  it('adds a new entry with the given state', () => {
    const next = applyToggle({}, URL, 'applied');
    expect(next[URL]?.state).toBe('applied');
    expect(next[URL]?.setAt).toBeTruthy();
  });

  it('removes the entry when toggling the same state (toggle-off)', () => {
    const once = applyToggle({}, URL, 'rejected');
    const twice = applyToggle(once, URL, 'rejected');
    expect(twice[URL]).toBeUndefined();
  });

  it('switches state when toggling the other state', () => {
    const applied = applyToggle({}, URL, 'applied');
    const rejected = applyToggle(applied, URL, 'rejected');
    expect(rejected[URL]?.state).toBe('rejected');
  });

  it('does not mutate the input snapshot', () => {
    const input = {};
    applyToggle(input, URL, 'applied');
    expect(input).toEqual({});
  });
});
