import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

// Handles email-confirmation and OAuth redirects from Supabase.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/dashboard';
  // Same-origin only: URL parsing treats "\" like "/" so prefix checks alone
  // can be bypassed (e.g. next=/\evil.example). Resolve and compare origins.
  let next = '/dashboard';
  try {
    const resolved = new URL(nextParam, req.nextUrl.origin);
    if (resolved.origin === req.nextUrl.origin) {
      next = resolved.pathname + resolved.search + resolved.hash;
    }
  } catch {
    // keep /dashboard
  }
  if (code) {
    const supabase = createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
