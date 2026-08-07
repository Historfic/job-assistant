'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (password !== confirm) { setError('Passwords do not match'); return; }
      const { createSupabaseBrowser } = await import('@/lib/supabase/client');
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">J</div>
          <span className="text-lg font-semibold text-white">JobIQ</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h1 className="text-base font-semibold text-white mb-1">Set a new password</h1>
          <p className="text-xs text-gray-500 mb-5">Choose a new password for your JobIQ account.</p>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="New password"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'} required value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit" disabled={busy}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-sm font-medium text-white transition-colors"
            >
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
