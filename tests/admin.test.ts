import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const saved: Record<string, string | undefined> = {};

beforeEach(() => { saved.ADMIN_EMAILS = process.env.ADMIN_EMAILS; });
afterEach(() => {
  if (saved.ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = saved.ADMIN_EMAILS;
});

describe('isAdminEmail', () => {
  it('nobody is an admin when ADMIN_EMAILS is unset', async () => {
    delete process.env.ADMIN_EMAILS;
    const { isAdminEmail } = await import('@/lib/admin');
    expect(isAdminEmail('rafael@mcgendigital.com')).toBe(false);
  });

  it('matches a listed email regardless of case or spacing', async () => {
    process.env.ADMIN_EMAILS = ' Rafael@McGenDigital.com , boss@example.com ';
    const { isAdminEmail } = await import('@/lib/admin');
    expect(isAdminEmail('rafael@mcgendigital.com')).toBe(true);
    expect(isAdminEmail('BOSS@EXAMPLE.COM')).toBe(true);
  });

  it('rejects unlisted emails and empty input', async () => {
    process.env.ADMIN_EMAILS = 'rafael@mcgendigital.com';
    const { isAdminEmail } = await import('@/lib/admin');
    expect(isAdminEmail('customer@gmail.com')).toBe(false);
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
