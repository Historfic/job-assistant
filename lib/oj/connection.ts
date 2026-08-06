// ─── OnlineJobs.ph connection accessors ───────────────────────────────────────
// RLS scopes every query to the signed-in user; no explicit user_id filter
// is needed. Demo mode reports an active connection so the personalized
// cover-letter flow stays demoable.

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { decryptSecret } from '@/lib/crypto';

export async function getOjConnectionStatus(): Promise<'active' | 'expired' | null> {
  if (!isSupabaseConfigured()) return 'active';
  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { data } = await createSupabaseServer()
    .from('oj_connections').select('status').maybeSingle();
  return data?.status === 'active' ? 'active' : data?.status === 'expired' ? 'expired' : null;
}

export async function getOjSessionCookie(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null; // demo: scraper works cookieless
  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { data } = await createSupabaseServer()
    .from('oj_connections').select('encrypted_session,status').maybeSingle();
  if (!data || data.status !== 'active') return null;
  try {
    return decryptSecret(data.encrypted_session);
  } catch {
    return null; // key rotated or row corrupt — treat as disconnected
  }
}

export async function markOjExpired(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { createSupabaseServer } = await import('@/lib/supabase/server');
  await createSupabaseServer()
    .from('oj_connections').update({ status: 'expired' }).eq('status', 'active');
}
