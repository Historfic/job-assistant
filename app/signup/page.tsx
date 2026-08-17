'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
          <span className="text-lg font-semibold text-white">EasyClient</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {sent ? (
            <>
              <h1 className="text-base font-semibold text-white mb-1">Check your email</h1>
              <p className="text-xs text-gray-500 mb-5">
                We sent a confirmation link to {email}. Click it to activate your EasyClient account.
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
              <h1 className="text-base font-semibold text-white mb-1">Create your account</h1>
              <p className="text-xs text-gray-500 mb-5">Start finding jobs with EasyClient.</p>

              {demoMode && (
                <div className="mb-4 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300 mb-2">Demo mode — Supabase is not configured.</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
                  >
                    Continue in demo mode
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Full name" disabled={demoMode}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email" disabled={demoMode}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Password" disabled={demoMode}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  type="submit" disabled={busy || demoMode}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-sm font-medium text-white transition-colors"
                >
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              {!demoMode && (
                <>
                  <GoogleSignIn onError={setError} />
                  <div className="mt-4 text-center text-xs">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-4">
          Your OnlineJobs.ph account is NOT used to log in here — connecting it is optional, inside the dashboard.
        </p>
      </div>
    </div>
  );
}
