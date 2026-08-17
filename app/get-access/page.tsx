import Link from 'next/link';
import Logo from '@/components/Logo';
import { getSessionUser } from '@/lib/auth';
import { BUY_URL } from '@/lib/tiers';
import { paymentMethods } from '@/lib/payment';
import PaymentPicker from '@/components/PaymentPicker';

// Where "Get full access" lands. Keeping payment on our own page rather than
// sending people straight to Messenger means we control the instructions, and
// the customer knows exactly what happens after they pay.

export const metadata = {
  title: 'Get full access — EasyClient',
  description: 'Pay by GCash, BPI or GoTyme and get full access to EasyClient.',
};

export default async function GetAccessPage() {
  const user = await getSessionUser();
  const methods = paymentMethods();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-xl mx-auto px-5">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Logo size={26} />
            <span className="font-extrabold text-[17px] text-white">EasyClient</span>
          </Link>
          <Link href={user ? '/dashboard' : '/login'} className="text-sm text-gray-400 hover:text-white transition-colors">
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>

        <main className="pt-6 pb-16">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-white text-balance">
            Get full access
          </h1>
          <p className="text-[15px] text-gray-400 mt-2.5">
            All three job sites, 20 searches a day, and daily alerts.
          </p>

          <div className="mt-6 bg-gray-900 border border-blue-600 rounded-2xl px-5 py-4 flex items-baseline justify-between gap-3 flex-wrap">
            <span className="text-[28px] font-extrabold text-white tabular-nums">
              ₱999<span className="text-sm font-semibold text-gray-500"> / month</span>
            </span>
            <span className="text-xs text-gray-500">No card saved. Cancel by just not paying.</span>
          </div>

          {/* ── Step 1 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-600/15 text-blue-400 grid place-items-center text-xs font-extrabold">1</span>
              <h2 className="text-base font-bold text-white">Send ₱999</h2>
            </div>

            {methods.length > 0 ? (
              <PaymentPicker methods={methods} />
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-sm text-gray-400">
                  Message us and we&apos;ll send you the payment details.
                </p>
                <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-3.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors">
                  Message us on Facebook
                </a>
              </div>
            )}
          </section>

          {/* ── Step 2 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-600/15 text-blue-400 grid place-items-center text-xs font-extrabold">2</span>
              <h2 className="text-base font-bold text-white">Send us the receipt</h2>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400">
                Message us on Facebook with a screenshot of your payment and{' '}
                <strong className="text-white font-semibold">the email address you want to use</strong>.
                That email is how we switch your account on, so double-check the spelling.
              </p>
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                </svg>
                Send the receipt
              </a>
            </div>
          </section>

          {/* ── Step 3 ── */}
          <section className="mt-9">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs font-extrabold">3</span>
              <h2 className="text-base font-bold text-white">You&apos;re in</h2>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400">
                We switch your account on by hand, usually within the hour during the day.
                If you already have an account, just sign in again and LinkedIn and Upwork
                will be unlocked. If you&apos;re new, you&apos;ll get an email to set your password.
              </p>
            </div>
          </section>

          <p className="text-xs text-gray-600 mt-9 leading-relaxed">
            Paying for the first month only. There is no card on file and nothing renews
            automatically — when you want another month, you send another payment.
            Questions before you pay? Message us; we&apos;d rather answer than take money
            from someone who isn&apos;t sure.
          </p>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">
              ← Back
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
