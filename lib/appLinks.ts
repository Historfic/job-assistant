// ─── Why there is no "Open GCash" button ──────────────────────────────────────
// Kept as a record so this does not get rebuilt from the same reasoning.
//
// The idea: most traffic arrives from Facebook, so the QR is on the same phone
// that would have to scan it. A button that opened the banking app would remove
// the worst step.
//
// It does not work. GCash, BPI and GoTyme publish no deep-link scheme for a
// personal account, so an intent:// URL naming a guessed scheme cannot resolve
// — and Android's failure mode is to open the Play Store. Tapping "Open GCash"
// and landing on a store page for an app you already have, mid-payment, reads
// as a broken site. Tested on a real handset: it went to the Play Store.
//
// iOS is worse: an unregistered scheme does nothing at all, silently.
//
// What works instead, and is what the page does:
//   • Save the QR to photos, then scan it from the gallery inside the app
//   • Copy the account number and use Send Money
//
// If one of these providers ever documents a scheme, this is where it goes.
export {};
