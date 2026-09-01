// ─── Why there is no "Open GCash" button ──────────────────────────────────────
// Kept as a record so this is not rebuilt from the same reasoning a third time.
//
// The idea is sound: most traffic arrives from Facebook, so the QR is on the
// same phone that would have to scan it, and a button opening the banking app
// would remove the worst step of the flow.
//
// It cannot be built. Tested on a real handset, September 2026 — typing each of
// gcash://, gcashapp://, gotyme://, gotymebank://, bpiapp:// and bpi:// into a
// mobile browser produced no "Open in..." prompt for any of them. These apps do
// not register URL schemes, so nothing on a web page can launch them.
//
// Two implementations were tried and both removed:
//   1. Android intent:// with a package name — resolves to the PLAY STORE when
//      the intent fails, so tapping "Open GCash" sent someone who already has
//      GCash to a store page, mid-payment. Worse than no button.
//   2. Plain scheme with a visibilitychange timeout and no navigation — failed
//      safely, but failed every time, so it was a button that never worked.
//
// What works, and is what the page does:
//   • Save the QR to photos, then scan it from the gallery inside the app
//   • Copy the account number and use Send Money
//
// Revisit only if one of these providers publishes a scheme, or if their own
// share feature is found to emit an openable URL.
export {};
