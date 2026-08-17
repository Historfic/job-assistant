'use client';

import { useState } from 'react';

export default function OjConnectModal({ open, onClose, onConnected }: {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !consent) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/oj/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Connection failed');
      setPassword('');
      onConnected();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-white mb-1">Connect your OnlineJobs.ph account</h2>
        <p className="text-xs text-gray-500 mb-4">
          Optional — unlocks personalized cover letters for OnlineJobs.ph listings.
        </p>

        {/* Data Privacy Act consent notice — required reading before connecting */}
        <div className="mb-4 px-3 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-1.5">
          <p className="text-[11px] font-semibold text-blue-300">
            Data privacy notice (RA 10173 — Data Privacy Act of 2012)
          </p>
          <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4">
            <li><strong className="text-gray-300">What we store:</strong> an encrypted session token — never your password.</li>
            <li><strong className="text-gray-300">Why:</strong> to fetch full job details from your OnlineJobs.ph account and personalize your cover letters.</li>
            <li><strong className="text-gray-300">Where:</strong> in EasyClient&apos;s database, encrypted (AES-256).</li>
            <li><strong className="text-gray-300">How long:</strong> until you disconnect — deletion is immediate.</li>
            <li><strong className="text-gray-300">Your rights:</strong> you may access, correct, or delete your data anytime.</li>
          </ul>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
        )}

        <form onSubmit={handleConnect} className="space-y-3">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="OnlineJobs.ph email"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="OnlineJobs.ph password (used once, never stored)"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-[11px] text-gray-400">I understand and agree to the data privacy notice above.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-700 text-xs text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy || !consent}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-xs font-medium text-white transition-colors">
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
