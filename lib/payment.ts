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
  id: 'gcash' | 'bpi' | 'gotyme';
  label: string;
  hint: string;
  accountName: string;
  accountNumber: string;
  qrSrc: string;
  hasQr: boolean;
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
  return RAW
    .filter(m => m.accountNumber.trim() || m.accountName.trim())
    .map(m => ({ ...m, hasQr: hasQrFor(m.id) }));
}

// Whether a QR image was uploaded. Checked at build time on the server so a
// missing file shows the account number instead of a broken image.
function hasQrFor(id: string): boolean {
  const flag = process.env.NEXT_PUBLIC_QR_METHODS ?? '';
  return flag.split(',').map(s => s.trim()).includes(id);
}
