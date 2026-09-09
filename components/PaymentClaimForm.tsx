'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { PaymentMethod } from '@/lib/payment';

// The step between "I sent the money" and "somebody knows".
//
// Before this, a customer who had just paid ₱999 was told to find us on
// Facebook. If they gave up we had their money and they had nothing — which
// reads as a scam, in the one market where that accusation travels fastest.

export default function PaymentClaimForm({
  methods,
  signedIn,
  paymentId,
}: {
  methods: PaymentMethod[];
  signedIn: boolean;
  paymentId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(methods[0]?.id ?? 'gcash');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setState('sending');
    try {
      // Multipart, not JSON — the receipt is an image now.
      const body = new FormData();
      body.append('method', method);
      body.append('reference', reference);
      body.append('note', note);
      if (receipt) body.append('receipt', receipt);

      const res = await fetch('/api/payment-claim', { method: 'POST', body });
      const data = await res.json();
      // An already-pending claim is not a failure — it is the reassurance the
      // customer was looking for when they pressed the button again.
      if (!res.ok && data.code !== 'ALREADY_PENDING') throw new Error(data.error ?? 'Something went wrong.');
      setState('done');
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-emerald-900">Got it. We&apos;re checking your payment.</p>
        <p className="text-sm text-emerald-800/80 mt-1.5 leading-relaxed">
          Full access is usually switched on within the hour during the day. You&apos;ll get an
          email when it&apos;s done. Nothing else is needed from you.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm text-slate-600">
          Already paid?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>{' '}
          and tell us — that&apos;s how we know which account to switch on.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border-2 border-blue-600 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
      >
        I&apos;ve paid — tell us
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {paymentId && (
        <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Your payment ID</p>
            <p className="text-sm text-slate-900 font-semibold tabular-nums">{paymentId}</p>
          </div>
          <p className="text-[11px] text-slate-500 text-right max-w-[9rem] leading-snug">
            Put this in the message when you pay
          </p>
        </div>
      )}

      <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
        How did you pay?
      </label>
      <div className="flex gap-2 mb-4">
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors
              ${m.id === method
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* A screenshot rather than a typed reference. Finding and retyping a
          reference number is where people give up, and everybody already
          screenshots the receipt — that image carries the amount, the time,
          the sender name and the reference all at once. */}
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
        Receipt screenshot
      </label>

      {preview ? (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your receipt" className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-slate-50" />
          <button
            onClick={() => { setReceipt(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
            className="mt-2 text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
          >
            Choose a different one
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full mb-1.5 py-6 rounded-lg border-2 border-dashed border-slate-300
                     hover:border-blue-500 hover:bg-blue-50/40 transition-colors"
        >
          <span className="block text-sm font-semibold text-blue-700">Upload receipt screenshot</span>
          <span className="block text-[11px] text-slate-500 mt-0.5">Tap to pick it from your photos</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          setReceipt(file);
          setPreview(URL.createObjectURL(file));
        }}
        className="hidden"
      />
      {!preview && (
        <p className="text-[11px] text-slate-500 mb-4">
          The screenshot your bank showed after paying. Nothing else needed.
        </p>
      )}

      <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
        Anything else? <span className="normal-case tracking-normal font-normal text-slate-400">(optional)</span>
      </label>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Paid from a different name, etc."
        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900
                   placeholder:text-slate-400 focus:outline-none focus:border-blue-500 mb-4"
      />

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={state === 'sending' || (!receipt && reference.trim().length < 4)}
          className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300
                     text-xs font-semibold text-white transition-colors"
        >
          {state === 'sending' ? 'Sending...' : 'Send receipt'}
        </button>
      </div>
    </div>
  );
}
