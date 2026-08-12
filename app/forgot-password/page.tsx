'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const demoMode = !isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { createSupabaseBrowser } = await import('@/lib/supabase/client');
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
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
          <Logo size={32} boxed />
          <span className="text-lg font-semibold text-white">JobIQ</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {sent ? (
            <>
              <h1 className="text-base font-semibold text-white mb-1">Check your email</h1>
              <p className="text-xs text-gray-500 mb-5">
                If that email has an account, a reset link is on its way.
              </p>
              <Link
                href="/login"
                className="block w-full text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-base font-semibold text-white mb-1">Reset your password</h1>
              <p className="text-xs text-gray-500 mb-5">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {demoMode && (
                <div className="mb-4 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300">Demo mode — Supabase is not configured.</p>
                </div>
              )}

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email" disabled={demoMode}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit" disabled={busy || demoMode}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-sm font-medium text-white transition-colors"
                >
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-4 text-center text-xs">
                <Link href="/login" className="text-gray-500 hover:text-gray-300">Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
