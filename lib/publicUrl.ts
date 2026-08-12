// ─── The address the outside world uses ───────────────────────────────────────
// Hosts like Render run the app behind a proxy, so `req.nextUrl.origin` is the
// internal bind address (http://localhost:10000) rather than the public URL.
// Anything the user's browser or inbox will follow — auth redirects, invite
// links, email buttons — has to be built from the forwarded headers instead,
// or people get sent to a dead localhost address.

import type { NextRequest } from 'next/server';

export function publicOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim()
      ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return req.nextUrl.origin; // local dev with no proxy in front
}
