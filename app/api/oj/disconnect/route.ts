import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// "Disconnect" deletes the row immediately (spec: retention promise).
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (isSupabaseConfigured()) {
    const { createSupabaseServer } = await import('@/lib/supabase/server');
    await createSupabaseServer().from('oj_connections').delete().eq('user_id', user.id);
  }
  return NextResponse.json({ disconnected: true });
}
