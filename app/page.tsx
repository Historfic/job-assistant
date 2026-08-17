import Link from 'next/link';
import Logo from '@/components/Logo';
import { getSessionUser } from '@/lib/auth';

// Marketing landing page — the Meta-ads destination. Read on a phone, mid-scroll,
// by someone who has not decided to care yet: the product's own output does the
// arguing, and prose is kept to what a caption needs.

const SAMPLE_RESULTS = [
  { score: 99, top: true,  title: 'Executive Virtual Assistant', src: 'Upwork',
    meta: '$8–12/hr · client spent $47k' },
  { score: 94, top: true,  title: 'Real Estate Virtual Assistant', src: 'LinkedIn',
    meta: 'Full-time · Remote' },
  { score: 88, top: false, title: 'Social Media VA — Shopify', src: 'OnlineJobs.ph',
    meta: '₱30,000/mo · today' },
  { score: 81, top: false, title: 'Customer Support VA', src: 'OnlineJobs.ph',
    meta: '₱25,000/mo · today' },
];

const STATS = [
  ['3', 'job sites'],
  ['1 min', 'per search'],
  ['20', 'searches a day'],
];

const FEATURES: Array<[string, string]> = [
  ['search',  'All 3 sites at once'],
  ['rank',    'Ranked by fit'],
  ['filter',  'Time-wasters removed'],
  ['pen',     'Cover letter written'],
  ['bell',    'Daily email alerts'],
  ['shield',  'See who actually pays'],
];

const FAQ: Array<[string, string]> = [
  ['Is this a scam?',
   '3 free searches before money is mentioned. Every job links to the real post — check it yourself.'],
  ['Can you charge me without asking?',
   'No card on file. You send GCash each month. Nothing to cancel.'],
  ['Do you need my OnlineJobs password?',
   'No. Connecting it is optional and we never store passwords.'],
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    rank:   'M4 6h16M4 12h10M4 18h6',
    filter: 'M6 18L18 6M6 6l12 12',
    pen:    'M15.2 5.2l3.6 3.6M16.7 3.7a2.5 2.5 0 013.6 3.6L6.5 21H3v-3.5z',
    bell:   'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1',
    shield: 'M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z',
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default async function LandingPage() {
  const user = await getSessionUser();
  const cta = user ? '/dashboard' : '/signup';
  const ctaLabel = user ? 'Open dashboard' : 'Try 3 searches free';

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

        {/* ── Hero ── */}
        <section className="pt-10 pb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-400">
            Para sa Filipino freelancers
          </p>
          <h1 className="text-[38px] sm:text-[56px] font-extrabold leading-[1.02] tracking-tight text-white mt-3.5">
            3 job sites.<br />
            <span className="text-blue-400">1 search.</span>
          </h1>
          <p className="text-[17px] text-gray-400 mt-4 max-w-sm mx-auto">
            Your shortlist, ranked and ready to apply — in about a minute.
          </p>
          <Link href={cta} className="inline-block mt-7 px-9 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
            {ctaLabel}
          </Link>
          <p className="text-xs text-gray-600 mt-3">Free to start. No card.</p>
        </section>

        {/* ── The product itself, as the proof ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950/60">
            <span className="text-[11.5px] font-semibold text-gray-600">&ldquo;virtual assistant&rdquo;</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
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
                <p className="text-sm font-semibold text-white leading-snug truncate">{r.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                    {r.src}
                  </span>{' '}{r.meta}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {STATS.map(([n, label]) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl py-4 text-center">
              <p className="text-2xl font-extrabold text-white tabular-nums leading-none">{n}</p>
              <p className="text-[11px] text-gray-500 mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Before / after ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-red-400/80">Your morning now</p>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-500">
                <li>3 sites, one by one</li>
                <li>Same posts as yesterday</li>
                <li>Rewrite the same letter</li>
                <li>Apply to jobs already filled</li>
              </ul>
              <p className="mt-5 text-2xl font-extrabold text-gray-600 tabular-nums">45 min</p>
            </div>
            <div className="bg-gray-900 border border-blue-600/50 rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">With EasyClient</p>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-300">
                <li>One search, all 3 sites</li>
                <li>New posts only</li>
                <li>Letter written for you</li>
                <li>Dead listings filtered out</li>
              </ul>
              <p className="mt-5 text-2xl font-extrabold text-white tabular-nums">1 min</p>
            </div>
          </div>
        </section>
      </div>

      {/* ── What you get ── */}
      <div className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-2xl mx-auto px-5">
          <section className="py-14">
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(([icon, label]) => (
                <div key={label} className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                  <span className="text-blue-400 block"><Icon name={icon} /></span>
                  <p className="text-[13.5px] font-semibold text-white mt-2.5 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Price ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-14">
          <div className="relative bg-gray-900 border border-blue-600 rounded-[18px] p-7 text-center">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10.5px] font-extrabold uppercase tracking-[0.09em] px-3.5 py-1 rounded-full whitespace-nowrap">
              Full access
            </span>
            <p className="text-[52px] font-extrabold tracking-tight text-white leading-none tabular-nums">
              ₱999<span className="text-[15px] font-semibold text-gray-600 tracking-normal"> / month</span>
            </p>
            <p className="text-sm text-gray-400 mt-3">GCash · BPI · GoTyme</p>
            <p className="text-[13px] text-emerald-400 font-semibold mt-1.5">No card. Nothing to cancel.</p>
            <Link href="/get-access"
              className="block mt-6 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
              Get full access
            </Link>
            <p className="text-xs text-gray-600 mt-3">Or try 3 searches free first.</p>
          </div>
        </section>
      </div>

      {/* ── FAQ ── */}
      <div className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-2xl mx-auto px-5">
          <section className="py-12">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group mt-2.5 first:mt-0 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 open:border-gray-700">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-[14.5px] text-white">
                  {q}
                  <span className="text-blue-400 font-extrabold text-lg shrink-0 group-open:hidden">+</span>
                  <span className="text-blue-400 font-extrabold text-lg shrink-0 hidden group-open:inline">–</span>
                </summary>
                <p className="text-[14px] text-gray-400 mt-2.5 leading-relaxed">{a}</p>
              </details>
            ))}
          </section>
        </div>
      </div>

      {/* ── Close ── */}
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16 text-center">
          <h2 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-white text-balance leading-tight">
            Your next client is already posted.
          </h2>
          <Link href={cta} className="inline-block mt-7 px-9 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors">
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
