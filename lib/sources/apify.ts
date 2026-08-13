// ─── Apify REST helper ────────────────────────────────────────────────────────
// run-sync-get-dataset-items starts an actor run and returns its dataset in
// one call.
//
// The budget is 110s, not the 60s we started with: the Upwork actor regularly
// runs past a minute and was being killed mid-run, so that source came back
// empty while the others succeeded. Sources run in parallel, so this raises the
// worst case for a search rather than adding to every one. On failure the
// caller still shows a per-source notice and the other sources render.

const APIFY_BASE = 'https://api.apify.com/v2';
const DEFAULT_TIMEOUT_MS = 110_000;

export function pickString(item: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export async function runApifyActor(
  actorId: string,
  input: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN is not set');
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${Math.floor(timeoutMs / 1000)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(timeoutMs + 5_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Apify actor ${actorId} failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
