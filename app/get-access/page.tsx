import Link from 'next/link';
import Logo from '@/components/Logo';
import { getSessionUser } from '@/lib/auth';
import { BUY_URL, FOUNDING_NOTE, REGULAR_PRICE_COPY } from '@/lib/tiers';
import { paymentMethods } from '@/lib/payment';
import PaymentPicker from '@/components/PaymentPicker';
import PaymentClaimForm from '@/components/PaymentClaimForm';
import { paymentIdFor } from '@/lib/paymentId';

// Where "Get full access" lands. Keeping payment on our own page rather than
// sending people straight to Messenger means we control the instructions, and
// the customer knows exactly what happens after they pay.

export const metadata = {
  title: 'Get full access | EasyClient',
  description: 'Pay by GCash, BPI or GoTyme and get full access to EasyClient.',
};

export default async function GetAccessPage() {
  const user = await getSessionUser();
  const methods = paymentMethods();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <div className="max-w-xl mx-auto px-5">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Logo size={28} boxed />
            <span className="font-extrabold text-[17px] text-slate-900">EasyClient</span>
          </Link>
          <Link href={user ? '/dashboard' : '/login'} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>

        <main className="pt-6 pb-16">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-slate-900 text-balance">
            Get full access
          </h1>
          <p className="text-[15px] text-slate-600 mt-2.5">
            All three job sites, 20 searches a day.
          </p>

          <div className="mt-6 bg-white border-2 border-blue-600 rounded-2xl px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="text-[28px] font-extrabold text-slate-900 tabular-nums">
                ₱999<span className="text-sm font-semibold text-slate-400"> / month</span>
              </span>
              <span className="text-xs text-slate-500">No card saved. Cancel by just not paying.</span>
            </div>
            <p className="text-[13px] text-blue-600 font-semibold mt-2.5 pt-2.5 border-t border-slate-100">
              {FOUNDING_NOTE} <span className="text-slate-500 font-normal">Then {REGULAR_PRICE_COPY}.</span>
            </p>
          </div>

          {/* ── Step 1 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 grid place-items-center text-xs font-extrabold">1</span>
              <h2 className="text-base font-bold text-slate-900">Send ₱999</h2>
            </div>

            {methods.length > 0 ? (
              <PaymentPicker methods={methods} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-600">
                  Message us and we&apos;ll send you the payment details.
                </p>
                <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-3.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors">
                  Message us on Facebook
                </a>
              </div>
            )}
          </section>

          {/* ── Step 2 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 grid place-items-center text-xs font-extrabold">2</span>
              <h2 className="text-base font-bold text-slate-900">Tell us you paid</h2>
            </div>

            <PaymentClaimForm
              methods={methods}
              signedIn={Boolean(user)}
              paymentId={user ? paymentIdFor(user.id) : null}
            />

            {/* Messenger stays as a fallback, not the only route. Somebody who
                has already paid should never have to find us to get what they
                paid for. */}
            <p className="text-xs text-slate-500 mt-3 text-center">
              Prefer to message us?{' '}
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium">
                Send the receipt on Facebook
              </a>
            </p>
          </section>

          {/* ── Step 3 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center text-xs font-extrabold">3</span>
              <h2 className="text-base font-bold text-slate-900">You&apos;re in</h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-600">
                We switch your account on by hand, usually within the hour during the day.
                If you already have an account, just sign in again and LinkedIn and Upwork
                will be unlocked. If you&apos;re new, you&apos;ll get an email to set your password.
              </p>
            </div>
          </section>

          <p className="text-xs text-slate-500 mt-9 leading-relaxed">
            Paying for the first month only. There is no card on file and nothing renews
            automatically. When you want another month, you send another payment.
            Questions before you pay? Message us; we&apos;d rather answer than take money
            from someone who isn&apos;t sure.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              ← Back
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
