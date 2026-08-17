import Link from 'next/link';
import Logo from '@/components/Logo';
import { getSessionUser } from '@/lib/auth';

// Marketing landing page — the Meta-ads destination. Mobile-first, because
// Facebook traffic is overwhelmingly on phones, and dark to match the app so
// the two read as one product.

const SAMPLE_RESULTS = [
  { score: 99, top: true,  title: 'Executive Virtual Assistant (Long-term)', src: 'Upwork',
    meta: '$8–12/hr · client spent $47k · payment verified' },
  { score: 94, top: true,  title: 'Real Estate Virtual Assistant', src: 'LinkedIn',
    meta: 'Full-time · Remote · posted 2 days ago' },
  { score: 88, top: false, title: 'Social Media VA — Shopify store', src: 'OnlineJobs.ph',
    meta: '₱30,000/mo · posted today' },
  { score: 81, top: false, title: 'Customer Support VA (AU hours)', src: 'OnlineJobs.ph',
    meta: '₱25,000/mo · posted today' },
];

const PAINS = [
  <><strong className="text-gray-200 font-semibold">Opening the same three sites every morning</strong>, scrolling past the same posts you already saw yesterday.</>,
  <><strong className="text-gray-200 font-semibold">Rewriting your cover letter for the tenth time</strong>, changing the company name and hoping it reads like you meant it.</>,
  <><strong className="text-gray-200 font-semibold">Applying to posts that were never real</strong> — unpaid &ldquo;tests&rdquo;, clients who vanish, jobs already filled a week ago.</>,
];

const STEPS = [
  { n: '1', title: 'Tell it what you do',
    desc: 'Your skill, your rate, and paste your CV once. That’s the whole setup.' },
  { n: '2', title: 'It searches all three sites',
    desc: 'OnlineJobs.ph, LinkedIn and Upwork together. AI reads every listing, scores the fit, and filters out the time-wasters before you see them.' },
  { n: '3', title: 'Apply with a letter that’s actually yours',
    desc: 'It writes each application from your real experience — never invented skills. Copy, send, move on to the next.' },
];

const INCLUDED: Array<[string, string]> = [
  ['20 searches a day', 'across all three sites'],
  ['Daily email alerts', '— new matching jobs land in your inbox each morning'],
  ['AI scoring', 'so the best fits come first, not the newest'],
  ['Cover letters from your own CV', '— it won’t claim skills you don’t have'],
  ['Client history on Upwork jobs', '— see who actually pays before you apply'],
  ['Applied & rejected tracking', 'that follows you across devices'],
  ['Every new feature', 'as it ships, at no extra cost'],
];

const FAQ: Array<[string, string]> = [
  ['How do I know this isn’t a scam?',
   'Fair question — ask it of everything online. You don’t pay anything to sign up, and you get 3 free searches with real listings before money is mentioned. Try it first, decide after. Every job we show links straight to the original post on OnlineJobs.ph, LinkedIn or Upwork, so you can always check it yourself.'],
  ['Can you charge me without asking?',
   'No. We never hold your card — you pay by GCash each month, so there is literally nothing for us to charge. If you stop paying, access simply ends. No emails chasing you, no cancellation form to find.'],
  ['Do you need my OnlineJobs.ph password?',
   'No. EasyClient has its own account and works fine without it. Connecting your OnlineJobs.ph account is optional and only makes cover letters more detailed. If you do connect it, we store an encrypted access token and never your password, and it’s deleted the moment you disconnect — in line with the Data Privacy Act (RA 10173).'],
  ['How long does a search take?',
   'About a minute. It really is reading three websites and analysing every listing, so give it that time — it isn’t stuck.'],
  ['Will this get me a job?',
   'No tool can promise that, and be careful with any that does. What it removes is the hour a day you spend searching and rewriting, so the time you do spend goes into applications worth sending.'],
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const cta = user ? '/dashboard' : '/signup';
  const ctaLabel = user ? 'Open your dashboard' : 'Try 3 searches free';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-2xl mx-auto px-5">
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-extrabold text-[17px] text-white">EasyClient</span>
          </div>
          <Link href={user ? '/dashboard' : '/login'} className="text-sm text-gray-400 hover:text-white transition-colors">
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </div>

      {/* ── Hero ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="pt-8 pb-11 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400">
            Para sa Filipino freelancers
          </p>
          <h1 className="text-[30px] sm:text-[46px] font-extrabold leading-[1.1] tracking-tight text-white mt-3 mb-3.5 text-balance">
            Three job sites. One search.{' '}
            <span className="text-blue-400">Your shortlist in a minute.</span>
          </h1>
          <p className="text-base text-gray-400 max-w-lg mx-auto">
            EasyClient searches OnlineJobs.ph, LinkedIn and Upwork at the same time, scores every
            listing against your experience, and writes your application for you. Every single day.
          </p>
          <Link href={cta} className="inline-block mt-6 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
            {ctaLabel}
          </Link>
          <p className="text-xs text-gray-600 mt-3">No credit card needed to start.</p>

          {/* What the product actually hands you — shown, not described */}
          <div className="mt-9 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950/60">
              <span className="text-[11.5px] font-semibold text-gray-600">
                &ldquo;virtual assistant&rdquo; · 3 sites searched
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 whitespace-nowrap">
                9 matches
              </span>
            </div>
            {SAMPLE_RESULTS.map(r => (
              <div key={r.title} className="flex gap-3 px-4 py-3.5 border-b border-gray-800 last:border-b-0">
                <div className={`shrink-0 w-9 h-9 rounded-[10px] grid place-items-center font-extrabold text-sm tabular-nums
                  ${r.top ? 'bg-blue-600 text-white' : 'bg-blue-600/15 text-blue-400'}`}>
                  {r.score}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug">{r.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                      {r.src}
                    </span>
                    {' '}{r.meta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Problem ── */}
      <div className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-2xl mx-auto px-5">
          <section className="py-14">
            <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white text-balance">
              The hours nobody pays you for
            </h2>
            <p className="text-[15.5px] text-gray-400 mt-2.5">Every freelancer knows this routine.</p>
            <div className="flex flex-col gap-3.5 mt-6">
              {PAINS.map((pain, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-[21px] h-[21px] rounded-full bg-red-400/10 text-red-400 grid place-items-center text-xs font-bold mt-0.5">×</span>
                  <p className="text-[15px] text-gray-400">{pain}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-14">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white">How it works</h2>
          <div className="flex flex-col gap-4 mt-7">
            {STEPS.map(s => (
              <div key={s.n} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex gap-4 items-start">
                <span className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-blue-600/15 text-blue-400 grid place-items-center font-extrabold text-sm">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{s.title}</h3>
                  <p className="text-[14.5px] text-gray-400 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Why it's worth paying every month ── */}
      <div className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-2xl mx-auto px-5">
          <section className="py-14">
            <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white text-balance">
              Every day, not just once
            </h2>
            <p className="text-[15.5px] text-gray-400 mt-2.5">
              New jobs get posted daily. EasyClient works daily too.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {INCLUDED.map(([bold, rest]) => (
                <div key={bold} className="flex gap-3 items-start text-[15px]">
                  <span className="shrink-0 w-[21px] h-[21px] rounded-full bg-emerald-500/10 text-emerald-400 grid place-items-center text-xs font-extrabold mt-0.5">✓</span>
                  <span className="text-gray-400">
                    <strong className="text-white font-semibold">{bold}</strong> {rest}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-14" id="price">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white">Simple monthly access</h2>
          <p className="text-[15.5px] text-gray-400 mt-2.5">
            No card on file. Nothing to cancel — just stop paying.
          </p>

          <div className="relative mt-8 bg-gray-900 border border-blue-600 rounded-[18px] p-6 sm:p-8 text-center">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10.5px] font-extrabold uppercase tracking-[0.09em] px-3.5 py-1 rounded-full whitespace-nowrap">
              Full access
            </span>
            <p className="text-[46px] font-extrabold tracking-tight text-white leading-none tabular-nums">
              ₱999<span className="text-[15px] font-semibold text-gray-600 tracking-normal"> / month</span>
            </p>
            <p className="inline-block mt-3.5 text-[13px] text-gray-400 bg-blue-600/10 rounded-[10px] px-3.5 py-2.5">
              Pay by <strong className="text-white font-semibold">GCash</strong>, Maya or bank transfer
            </p>
            <div className="flex flex-col gap-3 mt-5 text-left">
              {['Everything listed above',
                'Activated within the hour, by a real person',
                'No lock-in, no contract, no auto-charge'].map(t => (
                <div key={t} className="flex gap-3 items-start text-[15px]">
                  <span className="shrink-0 w-[21px] h-[21px] rounded-full bg-emerald-500/10 text-emerald-400 grid place-items-center text-xs font-extrabold mt-0.5">✓</span>
                  <span className="text-gray-400">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] font-semibold text-emerald-400 mt-4.5">
              Land one client and it pays for months.
            </p>
            <Link href="/get-access"
              className="inline-block mt-5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
              Get full access
            </Link>
            <p className="text-xs text-gray-600 mt-3">
              Not sure? Sign up free and take 3 searches first.
            </p>
          </div>
        </section>
      </div>

      {/* ── FAQ ── */}
      <div className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-2xl mx-auto px-5">
          <section className="py-14">
            <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white">Questions people ask</h2>
            {FAQ.map(([q, a]) => (
              <details key={q} className="group mt-3 bg-gray-950 border border-gray-800 rounded-xl px-4 py-4 open:border-gray-700">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-[15px] text-white">
                  {q}
                  <span className="text-blue-400 font-extrabold text-lg shrink-0 group-open:hidden">+</span>
                  <span className="text-blue-400 font-extrabold text-lg shrink-0 hidden group-open:inline">–</span>
                </summary>
                <p className="text-[14.5px] text-gray-400 mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </section>
        </div>
      </div>

      {/* ── Close ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-14 text-center">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white text-balance">
            Your next client is already posted somewhere.
          </h2>
          <p className="text-[15px] text-gray-400 mt-2.5">Let&apos;s find them before someone else does.</p>
          <Link href={cta} className="inline-block mt-6 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
            {ctaLabel}
          </Link>
        </section>
        <footer className="border-t border-gray-800 pt-6 pb-11 text-center text-xs text-gray-600">
          EasyClient · Made in the Philippines, for Filipino freelancers
        </footer>
      </div>
    </div>
  );
}
