// Service-role Supabase client — bypasses row-level security. Server-only:
// used exclusively by the /api/admin routes to activate paying customers.
// The key must NEVER be exposed with a NEXT_PUBLIC_ prefix.

import { createClient } from '@supabase/supabase-js';

export function isAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured — see .env.example');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
