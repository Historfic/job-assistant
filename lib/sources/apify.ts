// ─── Apify REST helper ────────────────────────────────────────────────────────
// run-sync-get-dataset-items starts an actor run and returns its dataset in
// one call. 60s budget per the spec — on failure the caller shows a
// per-source banner and other sources still render.

const APIFY_BASE = 'https://api.apify.com/v2';

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
  timeoutMs = 60_000,
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
