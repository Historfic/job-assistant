import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Protects the dashboard, the admin console, and every API route. When
// Supabase is not configured the app is in demo mode and everything is open
// (the admin routes stay closed there — they check ADMIN_EMAILS themselves).
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // Scheduled jobs have no user session — they authenticate with CRON_SECRET
  // inside the route itself.
  if (req.nextUrl.pathname.startsWith('/api/cron/')) return res;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated. Please sign in.' }, { status: 401 });
    }
    const redirect = req.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*'],
};
