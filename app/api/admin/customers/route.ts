// ─── GET /api/admin/customers ─────────────────────────────────────────────────
// Admin-only customer list: who signed up, whether they've paid, how many
// searches they've run. Non-admins get 404 so the console's existence isn't
// advertised.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { isAdminConfigured, createSupabaseAdmin } from '@/lib/supabase/admin';
import type { AdminCustomer } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Admin console needs SUPABASE_SERVICE_ROLE_KEY in .env.local' },
      { status: 503 },
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,tier,created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[/api/admin/customers]', error.message);
    return NextResponse.json({ error: 'Could not load customers' }, { status: 500 });
  }

  // One grouped count of every search, then look up per profile — avoids a
  // query per customer.
  const searchCounts = new Map<string, number>();
  const { data: searches } = await supabase.from('searches').select('user_id');
  for (const row of searches ?? []) {
    const id = (row as { user_id: string }).user_id;
    searchCounts.set(id, (searchCounts.get(id) ?? 0) + 1);
  }

  const customers: AdminCustomer[] = (profiles ?? []).map(p => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name ?? null,
    paid: p.tier === 'pro',
    searchesUsed: searchCounts.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ customers });
}
