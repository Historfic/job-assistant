// ─── Payment reference ID ─────────────────────────────────────────────────────
// A customer pays by scanning a QR. Nothing in that transaction carries their
// account, so we ask them to type a short code into the GCash message field and
// into the claim form -- that is what ties the money to the account.
//
// Derived from the user id rather than stored, so there is no column to keep in
// sync and no uniqueness to manage. It is a convenience for matching, not a
// secret: Rafael confirms against his own GCash record either way.

import { createHash } from 'crypto';

// No 0/O, 1/I/L, or 5/S. Somebody is going to read this off one screen and type
// it into a banking app on another, and those are the pairs they will get wrong.
const ALPHABET = '23456789ABCDEFGHJKMNPQRTUVWXYZ';
const LENGTH = 5;

export function paymentIdFor(userId: string): string {
  const digest = createHash('sha256').update(userId).digest();
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[digest[i] % ALPHABET.length];
  return `EC-${out}`;
}

/** Accepts what people actually type: lowercase, spaces, a missing prefix. */
export function normalizePaymentId(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('EC') ? cleaned.slice(2) : cleaned;
  return body ? `EC-${body}` : '';
}
