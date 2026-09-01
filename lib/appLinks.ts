// ─── Opening a banking app from the payment page ──────────────────────────────
// Most of this traffic arrives from Facebook and Instagram, so the QR is on the
// same phone that would have to scan it. These links jump straight to the app,
// removing the worst step: hunting for it on a home screen while holding a
// half-finished payment.
//
// What they CANNOT do is pre-fill the amount. The codes are QR Ph (EMVCo), not
// URLs, and neither GCash nor GoTyme publishes a scheme for pre-filling a
// payment to a personal account. So this opens the app; the customer then scans
// the saved image or types the account number. That is why the "Save this QR"
// button sits beside this one rather than being replaced by it.
//
// Android `intent://` falls back to the Play Store when the app is missing.
// iOS has no equivalent — an unknown scheme does nothing at all, silently.
//
// None of these schemes is verified against a real handset, which is why they
// are overridable: a wrong one is then an env change, not a deploy.

export interface AppLink {
  /** iOS, and any browser that honours custom schemes. */
  scheme: string;
  /** Android: opens the app, or the Play Store if it is not installed. */
  intent: string;
}

const DEFAULTS: Record<string, { scheme: string; pkg: string }> = {
  gcash:  { scheme: 'gcash',  pkg: 'com.globe.gcash.android' },
  gotyme: { scheme: 'gotyme', pkg: 'com.gotyme.android' },
  bpi:    { scheme: 'bpiapp', pkg: 'com.bpi.ng.app' },
};

/** `NEXT_PUBLIC_APP_LINKS=gcash:gcash|com.globe.gcash.android,bpi:bpiapp|com.bpi.ng.app` */
function overridesFor(id: string): { scheme?: string; pkg?: string } {
  const raw = process.env.NEXT_PUBLIC_APP_LINKS?.trim();
  if (!raw) return {};
  for (const entry of raw.split(',')) {
    const [key, value] = entry.split(':');
    if (key?.trim() !== id || !value) continue;
    const [scheme, pkg] = value.split('|');
    return { scheme: scheme?.trim(), pkg: pkg?.trim() };
  }
  return {};
}

export function appLinkFor(methodId: string): AppLink | null {
  const base = DEFAULTS[methodId];
  if (!base) return null;                       // card has no app to open

  const { scheme = base.scheme, pkg = base.pkg } = overridesFor(methodId);
  return {
    scheme: `${scheme}://`,
    intent: `intent://#Intent;scheme=${scheme};package=${pkg};end`,
  };
}
