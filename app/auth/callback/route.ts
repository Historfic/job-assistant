import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { publicOrigin } from '@/lib/publicUrl';

// Handles email-confirmation and OAuth redirects from Supabase.
export async function GET(req: NextRequest) {
  // Must be the public address, not req.nextUrl.origin — behind a proxy that
  // resolves to the internal port and sends the user to a dead localhost URL.
  const origin = publicOrigin(req);

  const code = req.nextUrl.searchParams.get('code');
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/dashboard';

  // Same-origin only: URL parsing treats "\" like "/" so prefix checks alone
  // can be bypassed (e.g. next=/\evil.example). Resolve and compare origins.
  let next = '/dashboard';
  try {
    const resolved = new URL(nextParam, origin);
    if (resolved.origin === new URL(origin).origin) {
      next = resolved.pathname + resolved.search + resolved.hash;
    }
  } catch {
    // keep /dashboard
  }

  if (code) {
    const supabase = createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, origin));
}
