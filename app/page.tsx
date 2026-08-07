import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';

// Marketing landing page — the Meta-ads destination. Mobile-first: Facebook
// ad traffic is overwhelmingly mobile.
export default async function LandingPage() {
  const user = await getSessionUser();
  const cta = user ? '/dashboard' : '/signup';
  const ctaLabel = user ? 'Open your dashboard' : 'Get started free';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">J</div>
          <span className="font-semibold">JobIQ</span>
        </div>
        <Link href={user ? '/dashboard' : '/login'} className="text-sm text-gray-400 hover:text-white transition-colors">
          {user ? 'Dashboard' : 'Sign in'}
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="px-5 pt-12 pb-16 text-center max-w-2xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">
          Para sa Filipino freelancers
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
          Find your next online job — <span className="text-blue-400">without the endless scrolling</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-lg mx-auto">
          JobIQ searches OnlineJobs.ph, LinkedIn, and Upwork in one click, scores every listing with AI,
          and writes your application message for you.
        </p>
        <Link href={cta}
          className="inline-block px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors">
          {ctaLabel}
        </Link>
        <p className="text-[11px] text-gray-600 mt-3">Try it free — 3 searches on us. No credit card needed.</p>
      </section>

      {/* ── How it works ── */}
      <section className="px-5 py-12 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-xl font-semibold mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Search once', desc: 'Type your skill — JobIQ pulls matching jobs from OnlineJobs.ph, LinkedIn, and Upwork.' },
              { n: '2', title: 'AI ranks them', desc: 'Every listing is analyzed and scored so the best fits rise to the top. Time-waster posts are filtered out.' },
              { n: '3', title: 'Apply faster', desc: 'Get a ready-to-send application message, plus personalized cover letters per job.' },
            ].map(s => (
              <div key={s.n} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="w-8 h-8 rounded-full bg-blue-600/15 text-blue-400 font-bold flex items-center justify-center mb-3">{s.n}</div>
                <p className="text-sm font-semibold mb-1">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">
            Sources: OnlineJobs.ph · LinkedIn · Upwork
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-5 py-14 max-w-md mx-auto">
        <h2 className="text-center text-xl font-semibold mb-2">One price. Yours forever.</h2>
        <p className="text-center text-xs text-gray-500 mb-8">No subscription. No monthly fees. Pay once, keep it for good.</p>
        <div className="bg-gray-900 border border-blue-600/40 rounded-2xl p-6 relative">
          <span className="absolute -top-2.5 left-5 px-2 py-0.5 bg-blue-600 rounded-full text-[10px] font-bold uppercase">Full access</span>
          <p className="text-3xl font-bold mb-1">₱999<span className="text-sm text-gray-500 font-normal"> one-time</span></p>
          <p className="text-[11px] text-blue-300 mb-4">Pay via our Facebook page — GCash or bank transfer</p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li>✓ OnlineJobs.ph + LinkedIn + Upwork in one search</li>
            <li>✓ 20 searches every day, forever</li>
            <li>✓ AI analysis &amp; job scoring</li>
            <li>✓ Ready-to-send application messages</li>
            <li>✓ Personalized cover letters per job</li>
            <li>✓ Applied-jobs tracking across devices</li>
          </ul>
          <p className="text-[11px] text-gray-600 mt-4 pt-3 border-t border-gray-800">
            Not sure yet? Sign up free and get <strong className="text-gray-400">3 preview searches</strong> before you decide.
          </p>
        </div>
      </section>

      {/* ── Privacy FAQ ── */}
      <section className="px-5 py-12 bg-gray-900/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-xl font-semibold mb-8">Your data, protected</h2>
          <div className="space-y-3">
            {[
              { q: 'Do I need my OnlineJobs.ph account to use JobIQ?',
                a: 'No. JobIQ has its own account. Connecting your OnlineJobs.ph account is optional — it only unlocks personalized cover letters for OnlineJobs.ph listings.' },
              { q: 'What happens if I connect my OnlineJobs.ph account?',
                a: 'We store an encrypted session token — never your password. You can disconnect anytime and the token is deleted immediately, in line with the Data Privacy Act of 2012 (RA 10173).' },
              { q: 'Is my job-hunting history private?',
                a: 'Yes. Your searches and applied/rejected lists are visible only to you, protected by row-level security in our database.' },
            ].map(f => (
              <details key={f.q} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <summary className="text-sm font-medium cursor-pointer">{f.q}</summary>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA + footer ── */}
      <section className="px-5 py-14 text-center">
        <h2 className="text-xl font-semibold mb-4">Ready to land your next client?</h2>
        <Link href={cta}
          className="inline-block px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors">
          {ctaLabel}
        </Link>
      </section>
      <footer className="px-5 py-6 border-t border-gray-800 text-center text-[11px] text-gray-600">
        JobIQ · Made for Filipino freelancers · Find us on Facebook: Easy Freelancing
      </footer>
    </div>
  );
}
