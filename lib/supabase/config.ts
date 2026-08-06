// Central check for whether Supabase is wired up. When it is not, the entire
// app runs in demo mode: demo user, no persistence, everything unlocked.
// A function (not a module-level const) so tests can toggle env vars.

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
