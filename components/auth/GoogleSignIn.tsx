'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Google sign-in that runs on OUR domain.
//
// The default Supabase OAuth redirect sends people to
// <project>.supabase.co, and Google's prompt then reads "Sign in to
// seddaaomlpnwjqmyvwmh.supabase.co" — which looks like a phishing attempt to
// anyone who didn't build this. Google Identity Services keeps the whole
// exchange on our origin, so the prompt shows EasyClient instead.
//
// Without NEXT_PUBLIC_GOOGLE_CLIENT_ID we fall back to the old redirect flow,
// so nothing breaks if the client ID isn't configured.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Google wants the SHA-256 of the nonce; Supabase verifies against the raw one. */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return { raw, hashed };
}

export default function GoogleSignIn({ onError }: { onError: (msg: string) => void }) {
  const router = useRouter();
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let cancelled = false;

    async function start() {
      const { raw, hashed } = await makeNonce();

      await new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('load failed')));
          return;
        }
        const script = document.createElement('script');
        script.src = GSI_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('load failed'));
        document.head.appendChild(script);
      });

      if (cancelled || !holder.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashed,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return;
          try {
            const { createSupabaseBrowser } = await import('@/lib/supabase/client');
            const { error } = await createSupabaseBrowser().auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce: raw,
            });
            if (error) throw new Error(error.message);
            router.push('/dashboard');
            router.refresh();
          } catch (err) {
            onError((err as Error).message);
          }
        },
      });

      window.google.accounts.id.renderButton(holder.current, {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'pill',
      });
      setReady(true);
    }

    start().catch(() => { if (!cancelled) setReady(false); });
    return () => { cancelled = true; };
  }, [clientId, onError, router]);

  // No client ID configured, or the Google script was blocked — use the
  // redirect flow so signing in still works.
  async function redirectFallback() {
    const { createSupabaseBrowser } = await import('@/lib/supabase/client');
    const { error } = await createSupabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) onError(error.message);
  }

  if (!clientId || !ready) {
    return (
      <>
        <div ref={holder} className="hidden" />
        <button
          onClick={redirectFallback}
          className="mt-3 w-full py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-sm font-medium text-gray-300 transition-colors"
        >
          Continue with Google
        </button>
      </>
    );
  }

  return <div ref={holder} className="mt-3 flex justify-center" />;
}
