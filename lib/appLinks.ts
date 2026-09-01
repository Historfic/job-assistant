// ─── Opening a banking app from the payment page ──────────────────────────────
// The QR is usually on the same phone that would have to scan it, so a button
// that opens the app removes the worst step of the flow.
//
// The hard part is failing well. GCash, BPI and GoTyme publish no deep-link
// scheme for a personal account, so these are best guesses — and the first
// attempt used Android's intent:// URL, whose failure mode is to open the Play
// Store. Tapping "Open GCash" and landing on a store page for an app you
// already have, mid-payment, reads as a broken site. Tested; it did exactly
// that.
//
// So: never navigate anywhere on failure. Try the scheme, and if the page is
// still here a moment later the app did not open — say so, and point at the
// saved-QR route that always works. Nothing is worse off than before the tap.

export interface AppLink {
  scheme: string;
  label: string;
}

const DEFAULTS: Record<string, string> = {
  gcash: 'gcash',
  gotyme: 'gotyme',
  bpi: 'bpiapp',
};

/** `NEXT_PUBLIC_APP_LINKS=gcash:gcash,gotyme:gotymebank` — scheme only. */
function schemeFor(id: string): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_LINKS?.trim();
  if (raw) {
    for (const entry of raw.split(',')) {
      const [key, value] = entry.split(':');
      if (key?.trim() === id && value?.trim()) return value.trim();
    }
  }
  return DEFAULTS[id] ?? null;
}

export function appLinkFor(methodId: string, label: string): AppLink | null {
  const scheme = schemeFor(methodId);
  return scheme ? { scheme: `${scheme}://`, label } : null;
}

/**
 * Resolves false when the app did not take over the page.
 *
 * A successful scheme launch backgrounds the browser, so `visibilitychange`
 * fires; if it has not fired by the deadline, nothing opened. Deliberately no
 * navigation and no store fallback — the only honest outcomes are "the app
 * opened" or "nothing happened, here is what to do instead".
 */
export function tryOpenApp(scheme: string, timeoutMs = 1200): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const done = (opened: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('visibilitychange', onHide);
      resolve(opened);
    };
    const onHide = () => { if (document.hidden) done(true); };

    document.addEventListener('visibilitychange', onHide);
    window.setTimeout(() => done(false), timeoutMs);

    // An unregistered scheme does nothing on iOS and shows a small dialog on
    // some Android browsers. Neither navigates away, which is the point.
    window.location.href = scheme;
  });
}
