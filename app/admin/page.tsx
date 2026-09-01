'use client';

import { useCallback, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';
import type { AdminCustomer } from '@/types';

// Customer console. Paste a payer's email, click Activate — the account is
// created (if new), an invite email goes out, and paid access is on.
interface PendingClaim {
  id: string;
  email: string;
  method: string;
  reference: string;
  amount: number;
  note: string | null;
  paymentId: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  // Customers who say they paid, waiting on Rafael checking GCash.
  const [claims, setClaims] = useState<PendingClaim[] | null>(null);
  const [notifications, setNotifications] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customers');
      if (res.status === 404 || res.status === 401) { router.replace('/dashboard'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load customers');
      setCustomers(data.customers);
    } catch (err) {
      setError((err as Error).message);
      setCustomers([]);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const loadClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/claims');
      if (!res.ok) return;
      const data = await res.json();
      setClaims(data.claims ?? []);
      setNotifications(Boolean(data.notifications));
    } catch { /* the customer list is the more important half */ }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  async function resolveClaim(id: string, decision: 'approved' | 'rejected') {
    setClaims(prev => (prev ?? []).filter(c => c.id !== id));   // optimistic
    try {
      const res = await fetch('/api/admin/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      // fetch only rejects on a network failure, so a 500 was silently
      // dropping the claim from the queue while it stayed pending in the
      // database — somebody's payment disappearing from the only place
      // Rafael would look for it.
      if (!res.ok) throw new Error('resolve failed');
    } catch {
      setError('That claim did not save. Reloading the queue.');
      loadClaims();
    }
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Activation failed');
      setNotice(data.invited
        ? `${data.email} is activated — invite email sent so they can set their password.`
        : `${data.email} already had an account and now has full access.`);
      setEmail('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(c: AdminCustomer) {
    if (!confirm(`Remove full access from ${c.email}? Their account and history stay intact.`)) return;
    setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not update this account');
      setNotice(`${c.email} is back on the free preview.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Permanent, so it takes the email typed back rather than a single click.
  async function removeAccount(c: AdminCustomer) {
    const typed = window.prompt(
      `This permanently deletes ${c.email} and everything they've saved — searches, applied jobs, CV. It cannot be undone.\n\nType their email to confirm:`,
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== c.email.toLowerCase()) {
      setError('The email you typed did not match. Nothing was deleted.');
      return;
    }
    setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: c.id, email: c.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not delete this account');
      setNotice(`${data.email} has been deleted, along with all their data.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const visible = (customers ?? []).filter(c =>
    !query.trim() || c.email.toLowerCase().includes(query.trim().toLowerCase()));
  const paidCount = (customers ?? []).filter(c => c.paid).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Logo size={28} boxed />
          <span className="font-semibold">EasyClient admin</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-400 hover:text-white transition-colors">
          Back to app
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        {/* Activate a payer */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          {claims !== null && claims.length > 0 && (
            <div className="mb-6 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-amber-200">
                  {claims.length} said they paid
                </h2>
                {!notifications && (
                  // Silence here means claims pile up unseen. Say so.
                  <span className="text-[10px] text-amber-400/80">
                    Email notifications are off — set SMTP_USER and SMTP_PASS
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {claims.map(c => (
                  <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{c.email}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                          {c.paymentId} · {c.method.toUpperCase()} · Ref {c.reference} · ₱{c.amount}
                        </p>
                        {c.note && <p className="text-[11px] text-gray-400 mt-1">{c.note}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setEmail(c.email); resolveClaim(c.id, 'approved'); }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white transition-colors"
                        >
                          Checked — fill in
                        </button>
                        <button
                          onClick={() => resolveClaim(c.id, 'rejected')}
                          className="px-2.5 py-1 rounded-lg border border-gray-700 text-[11px] text-gray-400 hover:text-white transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-500 mt-3">
                Check the amount in {'GCash, BPI or GoTyme'} first. &ldquo;Checked&rdquo; only clears
                the queue and fills the box below — it does not grant access.
              </p>
            </div>
          )}

          <h1 className="text-base font-semibold mb-1">Activate a customer</h1>
          <p className="text-xs text-gray-500 mb-4">
            Paste the email they sent after paying. New customers get an invite email to set their own password.
          </p>
          <form onSubmit={activate} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="customer@gmail.com"
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button type="submit" disabled={busy || !email.trim()}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-sm font-medium transition-colors">
              {busy ? 'Activating…' : 'Activate'}
            </button>
          </form>
          {notice && (
            <p className="mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">{notice}</p>
          )}
          {error && (
            <p className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</p>
          )}
        </section>

        {/* Customer list */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold">Customers</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {customers === null ? 'Loading…' : `${customers.length} signed up · ${paidCount} paid`}
              </p>
            </div>
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email"
              className="w-40 sm:w-56 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {customers !== null && visible.length === 0 && (
            <p className="text-xs text-gray-600 py-6 text-center">
              {customers.length === 0 ? 'No signups yet.' : 'No customer matches that search.'}
            </p>
          )}

          <div className="space-y-2">
            {visible.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{c.email}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5 tabular-nums">
                    {c.searchesUsed} search{c.searchesUsed === 1 ? '' : 'es'} · joined {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap
                    ${c.paid ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-800 text-gray-500'}`}>
                    {c.paid ? 'Full access' : 'Free preview'}
                  </span>
                  {c.paid ? (
                    <button onClick={() => deactivate(c)} className="text-[11px] text-gray-500 hover:text-yellow-400 transition-colors">
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEmail(c.email); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => removeAccount(c)}
                    title={`Delete ${c.email} and all their data`}
                    aria-label={`Delete ${c.email}`}
                    className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
