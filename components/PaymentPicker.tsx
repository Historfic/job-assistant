'use client';

import { useState } from 'react';
import type { PaymentMethod } from '@/lib/payment';

// Tabs rather than three stacked QR codes: on a phone, showing all of them at
// once means a lot of scrolling and a real chance of scanning the wrong one.
export default function PaymentPicker({ methods }: { methods: PaymentMethod[] }) {
  const [active, setActive] = useState(methods[0]?.id);
  const [copied, setCopied] = useState('');
  const current = methods.find(m => m.id === active) ?? methods[0];

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      // clipboard blocked — the number is on screen to type manually
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {methods.length > 1 && (
        <div className="flex border-b border-slate-200" role="tablist">
          {methods.map(m => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === active}
              onClick={() => setActive(m.id)}
              // Every tab carries the 2px border, transparent when inactive, so
              // selecting one does not make it taller than its siblings. -mb-px
              // pulls it onto the container's own border instead of sitting
              // below it, which is what made the row look bent.
              className={`flex-1 px-3 py-3 text-sm font-semibold transition-colors
                border-b-2 -mb-px
                ${m.id === active
                  ? 'text-slate-900 bg-slate-50 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4">{current.hint}</p>

          {/* Card has no QR and no account number — it has a checkout. */}
          {current.checkoutUrl && (
            <>
              <a
                href={current.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm
                           font-semibold text-white text-center transition-colors"
              >
                Pay ₱999 by card
              </a>
              <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                Handled by our payment provider. We never see or store your card number,
                and nothing renews — this is a single payment.
              </p>
            </>
          )}

          {current.hasQr && (
            <div className="flex justify-center mb-5">
              {/* White plate: QR codes need light behind them to scan reliably */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.qrSrc}
                  alt={`${current.label} QR code`}
                  width={200}
                  height={200}
                  className="block w-[200px] h-[200px] object-contain"
                />
              </div>
            </div>
          )}

          <div className={`space-y-2.5 ${current.checkoutUrl ? 'hidden' : ''}`}>
            {current.accountName && (
              <Field label="Account name" value={current.accountName} />
            )}
            {current.accountNumber && (
              <Field
                label={current.id === 'gcash' ? 'GCash number' : 'Account number'}
                value={current.accountNumber}
                onCopy={() => copy(current.accountNumber)}
                copied={copied === current.accountNumber}
              />
            )}
            <Field label="Amount" value="₱999" />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onCopy, copied }: {
  label: string; value: string; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm text-slate-900 font-medium truncate tabular-nums">{value}</p>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="shrink-0 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}
