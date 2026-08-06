import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AppUser } from '@/types';

// Fixed identity used whenever Supabase is not configured. Tier 'pro' so the
// whole product is demoable on localhost with zero keys.
export const DEMO_USER: AppUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'demo@jobiq.local',
  tier: 'pro',
};

export async function getSessionUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return DEMO_USER;

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    tier: profile?.tier === 'pro' ? 'pro' : 'free',
  };
}
