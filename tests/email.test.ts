import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '@/lib/email';

describe('normalizeEmail', () => {
  it('collapses the Gmail aliases that would each get a fresh free tier', () => {
    const same = [
      'raffy@gmail.com',
      'Raffy@Gmail.com',
      'r.a.f.f.y@gmail.com',
      'raffy+jobiq@gmail.com',
      'r.affy+2@googlemail.com',
      '  raffy@gmail.com  ',
    ];
    for (const addr of same) expect(normalizeEmail(addr)).toBe('raffy@gmail.com');
  });

  it('keeps dots for providers where they mean different people', () => {
    // Outlook and Yahoo treat dots as significant. Stripping them would merge
    // two strangers and take away one of their free searches.
    expect(normalizeEmail('juan.cruz@outlook.com')).toBe('juan.cruz@outlook.com');
    expect(normalizeEmail('juan.cruz@yahoo.com')).toBe('juan.cruz@yahoo.com');
    expect(normalizeEmail('juan.cruz@outlook.com'))
      .not.toBe(normalizeEmail('juancruz@outlook.com'));
  });

  it('strips plus tags everywhere, since almost every provider supports them', () => {
    expect(normalizeEmail('juan+shopping@outlook.com')).toBe('juan@outlook.com');
    expect(normalizeEmail('juan+a+b@company.ph')).toBe('juan@company.ph');
  });

  it('leaves a leading plus alone rather than producing an empty local part', () => {
    expect(normalizeEmail('+tag@gmail.com')).toBe('+tag@gmail.com');
  });

  it('does not mangle input that is not an address', () => {
    expect(normalizeEmail('not-an-email')).toBe('not-an-email');
    expect(normalizeEmail('')).toBe('');
  });

  it('keeps genuinely different people apart', () => {
    expect(normalizeEmail('maria@gmail.com')).not.toBe(normalizeEmail('mario@gmail.com'));
  });
});
