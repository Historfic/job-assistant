import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { exchangeOjSession } from '@/lib/oj/exchangeSession';
import { encryptSecret } from '@/lib/crypto';

export const maxDuration = 60;

// Consent-gated connect. The password is used transiently by exchangeOjSession
// and never persisted or logged; only the encrypted ci_session is stored.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { email, password, consent } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json(
      { error: 'Please read and agree to the data privacy notice first.' },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: 'active', demo: true }); // nothing stored in demo
  }

  const result = await exchangeOjSession(email, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const { error } = await createSupabaseServer().from('oj_connections').upsert({
    user_id: user.id,
    encrypted_session: encryptSecret(result.ciSession),
    status: 'active',
    consent_at: new Date().toISOString(),
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) {
    console.error('[/api/oj/connect] upsert failed:', error.message);
    return NextResponse.json({ error: 'Could not save the connection. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ status: 'active' });
}
