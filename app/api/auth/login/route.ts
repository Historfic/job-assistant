import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
};

function collectSetCookies(headers: Headers): string[] {
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=[^ ].*?=)/).map(c => c.trim().split(';')[0]);
}

function cookieHeader(pairs: string[]): string {
  return pairs.join('; ');
}

function extractCiSession(cookiePairs: string[]): string | null {
  const entry = cookiePairs.find(c => c.startsWith('ci_session='));
  return entry ? entry.slice('ci_session='.length) : null;
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]/g, ' ');
  return local.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function verifySession(ciSession: string): Promise<boolean> {
  try {
    // Use the job search page — it's accessible from Vercel IPs (the scraper uses it)
    // and it shows a logout link only when the user is authenticated.
    const res = await fetch('https://www.onlinejobs.ph/jobseekers/jobsearch', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': `ci_session=${ciSession}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return false;

    const html = await res.text();
    // OJ.ph renders a logout link in the nav only for authenticated sessions
    const hasLogout = /\/jobseekers\/auth\/logout/i.test(html) ||
                      /href="[^"]*logout[^"]*"/i.test(html);
    return hasLogout;
  } catch {
    return false;
  }
}

const LOGIN_URL = 'https://www.onlinejobs.ph/login';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { load } = await import('cheerio');
    let warmCookies: string[] = [];

    // Step 1: warm-up via a public page to get initial cookies
    try {
      const warmRes = await fetch('https://www.onlinejobs.ph/jobseekers/jobsearch', {
        headers: { ...BASE_HEADERS, 'Sec-Fetch-Site': 'none' },
        signal: AbortSignal.timeout(10000),
      });
      warmCookies = collectSetCookies(warmRes.headers);
    } catch {
      // non-fatal
    }

    // Step 2: GET login page to collect CSRF hidden fields
    let csrfFields: Record<string, string> = {};
    let loginPageCookies: string[] = [];
    try {
      const loginPageRes = await fetch(LOGIN_URL, {
        headers: {
          ...BASE_HEADERS,
          'Referer': 'https://www.onlinejobs.ph/',
          ...(warmCookies.length ? { 'Cookie': cookieHeader(warmCookies) } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });

      console.log(`[auth/login] login page: ${loginPageRes.status}`);

      if (loginPageRes.ok) {
        loginPageCookies = collectSetCookies(loginPageRes.headers);
        const html = await loginPageRes.text();
        const $ = load(html);

        // Log the form action so we know where to POST
        const formAction = $('form').first().attr('action');
        console.log(`[auth/login] form action: ${formAction}`);

        // Log all input fields to debug field names
        $('input').each((_, el) => {
          const name = $(el).attr('name');
          const type = $(el).attr('type');
          const value = $(el).attr('value') ?? '';
          console.log(`[auth/login] input: name="${name}" type="${type}" value="${type === 'hidden' ? value : '***'}"`);
        });

        $('input[type="hidden"]').each((_, el) => {
          const name = $(el).attr('name');
          const value = $(el).attr('value') ?? '';
          if (name) csrfFields[name] = value;
        });
      }
    } catch (e) {
      console.warn('[auth/login] could not fetch login page:', e);
    }

    // Merge warm + login-page cookies for the POST request
    const preCookieMap: Record<string, string> = {};
    [...warmCookies, ...loginPageCookies].forEach(c => {
      const k = c.split('=')[0];
      preCookieMap[k] = c;
    });
    const preCookies = Object.values(preCookieMap);

    // Step 3: POST credentials
    const form = new URLSearchParams();
    form.set('info[email]', email);
    form.set('info[password]', password);
    for (const [k, v] of Object.entries(csrfFields)) {
      form.set(k, v);
    }

    const postRes = await fetch('https://www.onlinejobs.ph/authenticate', {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': LOGIN_URL,
        'Origin': 'https://www.onlinejobs.ph',
        ...(preCookies.length ? { 'Cookie': cookieHeader(preCookies) } : {}),
      },
      body: form.toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });

    const postLocation = postRes.headers.get('location') ?? '';
    console.log(`[auth/login] POST: ${postRes.status}, location: ${postLocation}`);

    // Wrong credentials → redirect back to login page
    if (postRes.status === 200 || postLocation.includes('/login') || postLocation.includes('/error')) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // OJ.ph sets the authenticated session cookie on the redirect destination,
    // not on the 303 itself. Follow the redirect to collect it.
    const redirectTarget = postLocation.startsWith('http')
      ? postLocation
      : `https://www.onlinejobs.ph${postLocation}`;

    // Accumulate cookies from 303 response + redirect destination
    const cookieMap: Record<string, string> = {};
    [...preCookies, ...collectSetCookies(postRes.headers)].forEach(c => {
      cookieMap[c.split('=')[0]] = c;
    });

    const followRes = await fetch(redirectTarget, {
      headers: {
        ...BASE_HEADERS,
        'Cookie': cookieHeader(Object.values(cookieMap)),
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    const followCookies = collectSetCookies(followRes.headers);
    console.log(`[auth/login] follow status: ${followRes.status}, cookies: ${followCookies.map(c => c.split('=')[0]).join(', ')}`);

    followCookies.forEach(c => { cookieMap[c.split('=')[0]] = c; });
    const allCookies = Object.values(cookieMap);
    const ciSession = extractCiSession(allCookies);

    console.log(`[auth/login] ci_session: ${ciSession ? 'found' : 'not found'}`);

    if (!ciSession) {
      return NextResponse.json({ error: 'Could not establish session. Please try again.' }, { status: 502 });
    }

    // Step 4: verify the session is actually authenticated
    const authenticated = await verifySession(ciSession);
    console.log(`[auth/login] session verified: ${authenticated}`);

    if (!authenticated) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const name = nameFromEmail(email);
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`;
    const user = { name, email, avatar };

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('oj_session', ciSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
