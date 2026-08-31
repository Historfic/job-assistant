import { describe, it, expect } from 'vitest';
import { paymentIdFor, normalizePaymentId } from '@/lib/paymentId';

describe('paymentIdFor', () => {
  it('is stable — the same user always gets the same code', () => {
    // It goes in a GCash message. If it changed between visits, the reference
    // the customer sent would stop matching the one we show.
    const id = '9f8c1b52-4d3a-4c1e-9f2b-77aa1c0d5e31';
    expect(paymentIdFor(id)).toBe(paymentIdFor(id));
  });

  it('differs between users', () => {
    expect(paymentIdFor('user-a')).not.toBe(paymentIdFor('user-b'));
  });

  it('uses only characters that survive being retyped into a banking app', () => {
    const code = paymentIdFor('some-user-id').slice(3);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRTUVWXYZ]{5}$/);
    // No 0/O, 1/I/L or 5/S — the pairs people actually get wrong.
    expect(code).not.toMatch(/[01ILOS]/);
  });

  it('is prefixed so it reads as a code, not a typo', () => {
    expect(paymentIdFor('anything')).toMatch(/^EC-/);
  });
});

describe('normalizePaymentId', () => {
  it('accepts what people actually type', () => {
    for (const typed of ['EC-4F7K2', 'ec-4f7k2', '  EC 4F7K2 ', '4F7K2', 'ec4f7k2']) {
      expect(normalizePaymentId(typed)).toBe('EC-4F7K2');
    }
  });

  it('returns empty for empty input rather than a bare prefix', () => {
    expect(normalizePaymentId('')).toBe('');
    expect(normalizePaymentId('EC-')).toBe('');
  });
});
