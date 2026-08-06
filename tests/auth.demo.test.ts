import { describe, it, expect, beforeEach } from 'vitest';

describe('getSessionUser demo fallback', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('returns the demo pro user when Supabase env vars are absent', async () => {
    const { getSessionUser, DEMO_USER } = await import('@/lib/auth');
    const user = await getSessionUser();
    expect(user).toEqual(DEMO_USER);
    expect(user?.tier).toBe('pro');
  });
});
