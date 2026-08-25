import Link from 'next/link';
import Logo from '@/components/Logo';

// Shared chrome for /privacy and /terms. These pages exist because Google's
// OAuth consent screen and Meta's advertiser rules both require the URLs, and
// because the Data Privacy Act (RA 10173) requires a privacy notice from
// anyone processing Filipinos' personal data — which is everyone we sell to.

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'rafael@mcgendigital.com';

export const LAST_UPDATED = 'August 2026';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <div className="max-w-2xl mx-auto px-5">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Logo size={28} boxed />
            <span className="font-extrabold text-[17px] text-slate-900">EasyClient</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            Back
          </Link>
        </nav>

        <main className="pt-6 pb-16">
          <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-xs text-slate-400 mt-2">Last updated {LAST_UPDATED}</p>

          <div className="mt-8 space-y-7 text-[15px] leading-relaxed">{children}</div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex gap-5 text-sm">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-bold text-slate-900 mb-2.5">{heading}</h2>
      <div className="space-y-3 text-slate-600">{children}</div>
    </section>
  );
}
