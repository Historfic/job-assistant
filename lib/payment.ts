// ─── Payment methods ──────────────────────────────────────────────────────────
// Manual billing: the customer pays by QR or transfer, sends proof, and gets
// activated by hand in /admin. Everything here is public by design — it's an
// account number on a payment page, the same as any shop's.
//
// A method only appears on the page once its details are filled in, so you can
// launch with GCash alone and add the banks later without a code change.
//
// QR images: drop them in /public as qr-gcash.png, qr-bpi.png, qr-gotyme.png.

export interface PaymentMethod {
  id: 'gcash' | 'bpi' | 'gotyme' | 'card';
  label: string;
  hint: string;
  accountName: string;
  accountNumber: string;
  qrSrc: string;
  hasQr: boolean;
  /**
   * A link that opens the payment directly, when one exists for this method.
   *
   * Bare schemes like gcash:// do nothing — tested, no prompt on any handset.
   * A working link has to carry a payment session, and only three things
   * produce one: GCash's own Request Money feature, a payment-link service, or
   * a gateway like PayMongo. All three hand back a URL, so this is a slot
   * rather than an integration: paste whichever you get and the button works.
   */
  payLink?: string;
  /**
   * Set only for `card`: where the checkout lives.
   *
   * Card payment goes through a Merchant of Record (Paddle or Lemon Squeezy),
   * which sells on our behalf and handles the tax — the only route open to
   * someone without DTI or SEC registration. It also means card details never
   * touch our servers, so the privacy policy's "we do not collect payment card
   * details" stays true.
   *
   * A ONE-OFF payment, not a subscription. Nothing is stored and nothing
   * renews, which is what keeps the rest of the promise intact.
   */
  checkoutUrl?: string;
}

const RAW: Array<Omit<PaymentMethod, 'hasQr'>> = [
  {
    id: 'gcash',
    label: 'GCash',
    hint: 'Fastest — most people use this',
    accountName: process.env.NEXT_PUBLIC_GCASH_NAME ?? '',
    accountNumber: process.env.NEXT_PUBLIC_GCASH_NUMBER ?? '',
    qrSrc: '/qr-gcash.png',
  },
  {
    id: 'bpi',
    label: 'BPI',
    hint: 'Bank transfer or InstaPay',
    accountName: process.env.NEXT_PUBLIC_BPI_NAME ?? '',
    accountNumber: process.env.NEXT_PUBLIC_BPI_ACCOUNT ?? '',
    qrSrc: '/qr-bpi.png',
  },
  {
    id: 'gotyme',
    label: 'GoTyme',
    hint: 'Bank transfer or InstaPay',
    accountName: process.env.NEXT_PUBLIC_GOTYME_NAME ?? '',
    accountNumber: process.env.NEXT_PUBLIC_GOTYME_ACCOUNT ?? '',
    qrSrc: '/qr-gotyme.png',
  },
];

/** Only methods you've actually configured. Empty until the details are set. */
export function paymentMethods(): PaymentMethod[] {
  const local = RAW
    .filter(m => m.accountNumber.trim() || m.accountName.trim())
    .map(m => ({ ...m, hasQr: hasQrFor(m.id), payLink: payLinkFor(m.id) }));

  // Card goes last: it costs about ₱65 in fees per payment against nothing for
  // a bank transfer, so it belongs beside the free options rather than ahead
  // of them.
  const checkoutUrl = process.env.NEXT_PUBLIC_CARD_CHECKOUT_URL?.trim();
  if (!checkoutUrl) return local;

  return [...local, {
    id: 'card' as const,
    label: 'Card',
    hint: 'Visa, Mastercard. One payment — nothing is saved and nothing renews.',
    accountName: '',
    accountNumber: '',
    qrSrc: '',
    hasQr: false,
    checkoutUrl,
  }];
}

/**
 * Literal keys, not a computed lookup: Next only inlines NEXT_PUBLIC_ values
 * when the key is written out, so a template string would read as undefined the
 * day this moves to a client component.
 */
function payLinkFor(id: string): string | undefined {
  const links: Record<string, string | undefined> = {
    gcash: process.env.NEXT_PUBLIC_GCASH_LINK,
    bpi: process.env.NEXT_PUBLIC_BPI_LINK,
    gotyme: process.env.NEXT_PUBLIC_GOTYME_LINK,
  };
  return links[id]?.trim() || undefined;
}

// Whether a QR image was uploaded. Checked at build time on the server so a
// missing file shows the account number instead of a broken image.
function hasQrFor(id: string): boolean {
  const flag = process.env.NEXT_PUBLIC_QR_METHODS ?? '';
  return flag.split(',').map(s => s.trim()).includes(id);
}
