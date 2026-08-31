// ─── Email normalisation ──────────────────────────────────────────────────────
// The free tier is 3 lifetime searches. Without this, one Gmail account gives
// an unlimited supply of them: Gmail ignores dots and everything after a `+`,
// so `raffy@gmail.com`, `r.a.f.f.y@gmail.com` and `raffy+1@gmail.com` all
// deliver to the same inbox — while Supabase sees three different users.
//
// That is the cheap end of abuse: no new account, no phone, no effort. Closing
// it costs twenty lines. The determined attacker with real second addresses is
// a separate and much smaller problem, and one worth measuring before spending
// anything on.
//
// Deliberately NOT applied to other providers. Outlook and Yahoo treat dots as
// significant, so stripping them there would merge two genuinely different
// people into one account and take away a stranger's free searches because
// somebody with a similar address signed up first.

/** Providers that route every dotted variant to one inbox. */
const DOT_INSENSITIVE = new Set(['gmail.com', 'googlemail.com']);

/**
 * Plus-addressing is near-universal, so the `+tag` suffix is stripped for every
 * provider. Dot-stripping is Gmail-only, for the reason above.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed;           // not an address; leave it alone

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);

  if (DOT_INSENSITIVE.has(domain)) {
    local = local.replace(/\./g, '');
    // googlemail.com is an alias of gmail.com — same inbox, different spelling.
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}
