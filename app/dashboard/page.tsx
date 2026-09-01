'use client';

import { useEffect, useState, useCallback, useSyncExternalStore, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, ScrapeOptions, ProcessResult, AppTab, AnalyzedJob, MeResponse, JobSource } from '@/types';
import SearchForm from '@/components/SearchForm';
import Logo from '@/components/Logo';
import JobCard from '@/components/JobCard';
import LiveResults from '@/components/LiveResults';
import PasteJobPanel from '@/components/PasteJobPanel';
import { SOURCE_LABEL, SOURCE_BADGE, jobSource, countBySource } from '@/lib/sourceLabels';
import { decodeChunk, insertRanked } from '@/lib/searchStream';
import AIInsights from '@/components/AIInsights';
import ApplicationMessage from '@/components/ApplicationMessage';
import EmailPreview from '@/components/EmailPreview';
import AccountMenu from '@/components/dashboard/AccountMenu';
import OjConnectModal from '@/components/dashboard/OjConnectModal';
import MarkedJobsList from '@/components/dashboard/MarkedJobsList';
import UpgradeButton from '@/components/dashboard/UpgradeButton';
import ProfileModal from '@/components/dashboard/ProfileModal';
import {
  subscribeJobStatus,
  getJobStatusSnapshot,
  getServerSnapshot,
  refreshJobStatuses,
} from '@/lib/jobStatus';
import { refreshCareerProfile, getCareerProfileSnapshot } from '@/lib/careerProfile';

// ─── Progress steps shown during the scrape + analysis pipeline ───────────────
const STEPS = [
  { pct: 8,  msg: 'Getting started...' },
  { pct: 25, msg: (kw: string) => `Searching for "${kw}" jobs...` },
  { pct: 45, msg: 'Reading each job post...' },
  { pct: 65, msg: 'Filtering out the time-wasters...' },
  { pct: 80, msg: 'Ranking your best matches...' },
  { pct: 92, msg: 'Writing your application message...' },
  { pct: 100, msg: 'Done!' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ojModalOpen, setOjModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);   // desktop inline sidebar
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false); // mobile overlay drawer

  // Pipeline state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [paywalled, setPaywalled] = useState(false); // error is a limit, not a fault

  // Result state
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('jobs');
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastOptions, setLastOptions] = useState<ScrapeOptions | null>(null);

  // Status filter (session-only — resets on reload by design)
  const [hideMarked, setHideMarked] = useState(false);
  // Source filter — null means "all". Also session-only: a filter that outlived
  // the search would silently hide results from the next one.
  const [onlySource, setOnlySource] = useState<JobSource | null>(null);
  // Jobs that have streamed in but whose search has not finished yet.
  const [streamedJobs, setStreamedJobs] = useState<AnalyzedJob[]>([]);
  const [pendingSources, setPendingSources] = useState<Set<JobSource>>(new Set());
  const [locked, setLocked] = useState<{ count: number; reason: 'tier' | 'limit' } | null>(null);
  const statusMap = useSyncExternalStore(
    subscribeJobStatus,
    getJobStatusSnapshot,
    getServerSnapshot,
  );

  const filterMarked = useCallback(
    (jobs: AnalyzedJob[]) => {
      const byStatus = hideMarked
        ? jobs.filter(j => !(j.url && statusMap[j.url]))
        : jobs;
      return onlySource ? byStatus.filter(j => jobSource(j) === onlySource) : byStatus;
    },
    [hideMarked, statusMap, onlySource],
  );

  // Counts come from the unfiltered set, so a chip keeps showing its real total
  // while another source is selected — otherwise every chip but the active one
  // would read zero.
  const sourceCounts = useMemo(
    () => countBySource(result?.validJobs ?? []),
    [result],
  );

  useEffect(() => { setOnlySource(null); }, [result]);

  const visibleValidJobs   = useMemo(() => filterMarked(result?.validJobs ?? []),   [result, filterMarked]);
  const visibleBestMatches = useMemo(() => filterMarked(result?.bestMatches ?? []), [result, filterMarked]);
  // Other jobs = all valid jobs MINUS the ones already shown in Top Matches,
  // so the list below the gold cards doesn't duplicate them.
  const otherValidJobs = useMemo(() => {
    const bestUrls = new Set(visibleBestMatches.map(j => j.url).filter(Boolean));
    return visibleValidJobs.filter(j => !j.url || !bestUrls.has(j.url));
  }, [visibleValidJobs, visibleBestMatches]);
  const markedInBatch = useMemo(
    () => (result?.validJobs ?? []).filter(j => j.url && statusMap[j.url]).length,
    [result, statusMap],
  );

  // ── All marked jobs across history (for the Applied / Rejected tabs) ────────
  // Sorted newest-first by setAt timestamp.
  const sortedEntries = useMemo(
    () => Object.entries(statusMap)
      .map(([url, entry]) => ({ url, entry }))
      .sort((a, b) => (b.entry.setAt > a.entry.setAt ? 1 : -1)),
    [statusMap],
  );
  const appliedEntries  = useMemo(() => sortedEntries.filter(e => e.entry.state === 'applied'),  [sortedEntries]);
  const rejectedEntries = useMemo(() => sortedEntries.filter(e => e.entry.state === 'rejected'), [sortedEntries]);

  // Pull cross-device applied/rejected history from the account
  useEffect(() => { void refreshJobStatuses(); }, []);

  // Pull the saved CV / experience so cover letters can use it
  useEffect(() => { void refreshCareerProfile(); }, []);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  const refreshMe = useCallback(() => {
    fetch('/api/me')
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null; }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setMe(data);
        const email: string = data.user.email;
        const name = email.split('@')[0].replace(/[._-]/g, ' ')
          .split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        setUser({
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`,
        });
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  // ── Progress ticker ──────────────────────────────────────────────────────────
  function animateProgress(targetPct: number, msg: string) {
    setStatusMsg(msg);
    setProgress(prev => Math.max(prev, targetPct));
  }

  // ── Main search pipeline ─────────────────────────────────────────────────────
  const handleSearch = useCallback(async (options: ScrapeOptions) => {
    setMobileSearchOpen(false); // reveal results immediately on phones
    setLoading(true);
    setError('');
    setPaywalled(false);
    setResult(null);
    setEmailSent(false);
    setProgress(0);
    setStreamedJobs([]);
    setPendingSources(new Set());
    setLocked(null);
    setLastOptions(options);

    try {
      animateProgress(STEPS[0].pct, STEPS[0].msg as string);
      await tick();

      const kwMsg = typeof STEPS[1].msg === 'function'
        ? STEPS[1].msg(options.keyword)
        : STEPS[1].msg;
      animateProgress(STEPS[1].pct, kwMsg);

      // Skip jobs the user has already marked applied or rejected. Read from
      // the store at call time (not closure) so we don't depend on statusMap.
      const excludeUrls = Object.keys(getJobStatusSnapshot());

      // ── Single API call handles the full pipeline ─────────────────────────
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...options, excludeUrls }),
      });

      if (!res.ok) {
        // Read as text first so we can surface non-JSON responses (e.g. Vercel
        // HTML error pages from a 504 timeout) instead of swallowing them.
        const text = await res.text();
        let msg: string;
        try {
          const body = JSON.parse(text) as { error?: string; code?: string };
          msg = body.error ?? `HTTP ${res.status}`;
          // Paywall and tier limits get a buy button, not just red text.
          setPaywalled(body.code === 'TIER_SOURCES' || body.code === 'RATE_LIMIT');
        } catch {
          const snippet = text.slice(0, 200).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          msg = `HTTP ${res.status} (non-JSON response): ${snippet || '<empty body>'}`;
        }
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(msg);
      }

      // ── Read the NDJSON stream ────────────────────────────────────────────
      // Jobs land one at a time over 30–60 seconds. Showing each as it arrives
      // is the whole point, so nothing here waits for the response to finish.
      const reader = res.body?.getReader();
      if (!reader) throw new Error('This browser cannot stream results.');

      const decoder = new TextDecoder();
      let buffer = '';
      let live: AnalyzedJob[] = [];
      const pending = new Set<JobSource>();
      let streamError: string | null = null;

      setActiveTab('jobs');

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { events, rest } = decodeChunk(buffer);
        buffer = rest;

        for (const event of events) {
          switch (event.type) {
            case 'meta':
              event.sources.forEach(src => pending.add(src));
              setPendingSources(new Set(pending));
              animateProgress(STEPS[2].pct, STEPS[2].msg as string);
              break;

            case 'job':
              // Re-rank live: a late arrival with a better score belongs above
              // the ones already on screen.
              live = insertRanked(live, event.job);
              setStreamedJobs(live);
              animateProgress(
                Math.min(90, 45 + live.length * 3),
                pending.size > 0
                  ? `Still checking ${[...pending].map(s => SOURCE_LABEL[s]).join(', ')}...`
                  : 'Ranking your matches...',
              );
              break;

            case 'source-done':
              pending.delete(event.source);
              setPendingSources(new Set(pending));
              break;

            case 'source-error':
              // The source is finished either way — drop its shimmer so the UI
              // does not look like it is still waiting on something dead.
              pending.delete(event.error.source);
              setPendingSources(new Set(pending));
              // Say so while it happens. Finding out at the end that a whole
              // site returned nothing reads as results having gone missing.
              setStatusMsg(`${SOURCE_LABEL[event.error.source]} did not respond. Carrying on with the others...`);
              break;

            case 'locked':
              setLocked({ count: event.count, reason: event.reason });
              break;

            case 'complete':
              animateProgress(STEPS[6].pct, STEPS[6].msg as string);
              setResult(event.result);
              if (event.result.limits) {
                setMe(prev => (prev ? { ...prev, limits: event.result.limits! } : prev));
              }
              break;

            case 'error':
              streamError = event.message;
              break;
          }
        }
      }

      // A stream that ends without `complete` means the connection dropped
      // mid-search. Say so rather than presenting a partial list as the answer.
      if (streamError) throw new Error(streamError);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Email send ───────────────────────────────────────────────────────────────
  async function handleSendEmail(toEmail: string) {
    if (!result || sendingEmail) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, options: lastOptions, toEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Email send failed' }));
        throw new Error(data.error ?? 'Email send failed');
      }
      setEmailSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingEmail(false);
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  async function handleLogout() {
    const { isSupabaseConfigured } = await import('@/lib/supabase/config');
    if (isSupabaseConfigured()) {
      const { createSupabaseBrowser } = await import('@/lib/supabase/client');
      await createSupabaseBrowser().auth.signOut();
    }
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabCounts: Record<AppTab, number | undefined> = {
    jobs: result?.validJobs.length,
    insights: undefined,
    application: undefined,
    email: undefined,
    applied: appliedEntries.length || undefined,
    rejected: rejectedEntries.length || undefined,
  };

  return (
    // 100dvh (not 100vh) so mobile browser chrome doesn't clip the layout
    <div className="h-[100dvh] bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Top Header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-950 z-10">
        <div className="flex items-center gap-3">
          {/* Search drawer toggle (mobile) — the sidebar is an overlay below lg */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Sidebar collapse (desktop only) */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
            className="hidden lg:block p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-sm font-semibold">EasyClient</span>
          </div>

          {/* Tells the truth about where the results came from. Nothing to show
              before the first search. */}
          {result && (
            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
              ${result.isLiveData
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              {result.isLiveData ? 'Live jobs' : 'Sample jobs'}
            </span>
          )}
        </div>

        {/* Right: stats + user */}
        <div className="flex items-center gap-4">
          {result && (
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
              <span><span className="text-white font-medium">{result.validJobs.length}</span> jobs for you</span>
              {result.removedJobs.length > 0 && (
                <span><span className="text-gray-400 font-medium">{result.removedJobs.length}</span> filtered out</span>
              )}
            </div>
          )}

          {/* User avatar */}
          {me && user && (
            <AccountMenu
              me={me}
              avatar={user.avatar}
              onLogout={handleLogout}
              onConnectClick={() => setOjModalOpen(true)}
              onDisconnect={async () => {
                await fetch('/api/oj/disconnect', { method: 'POST' });
                refreshMe();
              }}
              onProfileClick={() => setProfileOpen(true)}
            />
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar (desktop, inline & collapsible) ──────────────────────── */}
        <aside
          className={`${sidebarOpen ? 'lg:w-72' : 'lg:w-0 overflow-hidden'} hidden lg:flex w-0 shrink-0 border-r border-gray-800 flex-col transition-all duration-200 bg-gray-950`}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <SearchForm onSearch={handleSearch} loading={loading} tier={me?.user.tier ?? 'free'} />
          </div>
        </aside>

        {/* ── Search drawer (mobile) ───────────────────────────────────────── */}
        {mobileSearchOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSearchOpen(false)} />
            <div className="relative w-[86%] max-w-xs bg-gray-950 border-r border-gray-800 flex flex-col animate-slide-in-left">
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <span className="text-sm font-semibold">Search jobs</span>
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  aria-label="Close search"
                  className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <SearchForm onSearch={handleSearch} loading={loading} tier={me?.user.tier ?? 'free'} />
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Loading / progress bar */}
          {loading && (
            <div className="shrink-0 border-b border-gray-800 bg-gray-950 px-5 py-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">{statusMsg}</span>
                </div>
                <span className="text-xs text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results as they arrive — the search is not finished, but these are */}
          {loading && (
            <div className="flex-1 overflow-y-auto">
              <LiveResults jobs={streamedJobs} pendingSources={[...pendingSources]} locked={locked} />
            </div>
          )}

          {/* Paywall — a limit reached is an offer, not a failure */}
          {error && paywalled && (
            <div className="shrink-0 mx-4 sm:mx-5 mt-4 px-4 py-4 bg-blue-500/10 border border-blue-500/25 rounded-xl animate-fade-in">
              <p className="text-sm text-blue-100 font-medium mb-1">{error}</p>
              <p className="text-xs text-blue-300/70 mb-3">
                One payment. No subscription. Yours for good.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <UpgradeButton />
                <button onClick={() => { setError(''); setPaywalled(false); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && !paywalled && (
            <div className="shrink-0 mx-4 sm:mx-5 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-2 animate-fade-in">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                {error}
                <button onClick={() => setError('')} className="ml-2 underline text-xs hover:no-underline">dismiss</button>
              </div>
            </div>
          )}

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {!loading && !result && (
            <div className="flex-1 overflow-y-auto animate-fade-in">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-300 mb-2">Ready to find jobs</h2>
              <p className="text-sm text-gray-600 max-w-xs">
                <span className="lg:hidden">Tap <strong className="text-gray-500">Search jobs</strong> to pick your keyword and filters.</span>
                <span className="hidden lg:inline">
                  Fill in the search form on the left and click <strong className="text-gray-500">Find Jobs</strong> to start the AI-powered search.
                </span>
              </p>
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="lg:hidden mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search jobs
              </button>

              {/* Feature cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl w-full">
                {[
                  { icon: '🔎', title: 'Three sites, one search', desc: 'OnlineJobs.ph, LinkedIn and Upwork — searched together, with salary and job-type filters' },
                  { icon: '🤖', title: 'Ranked by AI', desc: 'Every listing is scored for fit, and time-wasters are filtered out before you see them' },
                  { icon: '✍️', title: 'Application written for you', desc: 'A ready-to-send message, plus a personalised cover letter for any job' },
                ].map(f => (
                  <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left">
                    <div className="text-xl mb-2">{f.icon}</div>
                    <p className="text-xs font-semibold text-gray-300 mb-1">{f.title}</p>
                    <p className="text-xs text-gray-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-md w-full mx-auto border-t border-gray-800">
              <PasteJobPanel />
            </div>
            </div>
          )}

          {/* ── Results ─────────────────────────────────────────────────────── */}
          {result && !loading && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-fade-in">

              {result.sourceErrors && result.sourceErrors.length > 0 && (
                <div className="shrink-0 mx-4 mt-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-300 flex items-center justify-between">
                  <span>
                    {result.sourceErrors.map(e => e.source).join(', ')} failed to load — showing results from the other sources.
                  </span>
                  <button
                    onClick={() => setResult(r => (r ? { ...r, sourceErrors: [] } : r))}
                    className="underline hover:no-underline ml-3"
                  >
                    dismiss
                  </button>
                </div>
              )}

              {/* Tab bar */}
              <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-800 overflow-x-auto">
                {(['jobs', 'insights', 'application', 'email', 'applied', 'rejected'] as AppTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors capitalize whitespace-nowrap
                      ${activeTab === tab
                        ? 'text-white bg-gray-800 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                  >
                    {tab === 'jobs' && '📋'}
                    {tab === 'insights' && '🧠'}
                    {tab === 'application' && '✍️'}
                    {tab === 'email' && '📧'}
                    {tab === 'applied' && <span className="text-emerald-400">✓</span>}
                    {tab === 'rejected' && <span className="text-red-400">✗</span>}
                    {tab}
                    {tabCounts[tab] !== undefined && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] rounded-full
                        ${tab === 'applied' ? 'bg-emerald-600' : tab === 'rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                        {tabCounts[tab]}
                      </span>
                    )}
                  </button>
                ))}

                {/* Best matches badge */}
                {result.bestMatches.length > 0 && activeTab === 'jobs' && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-yellow-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{result.bestMatches.length} best match{result.bestMatches.length > 1 ? 'es' : ''}</span>
                  </div>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5">

                {/* Jobs tab */}
                {activeTab === 'jobs' && (
                  <div className="space-y-3 animate-slide-up">
                    {/* Shortfall banner — surfaced when we couldn't fully fill the quota */}
                    {result.validJobs.length < result.stats.targetRequested && (
                      <div className="mb-3 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2">
                        <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs text-yellow-200 leading-relaxed">
                          We found <strong>{result.validJobs.length}</strong> good matches out of the {result.stats.targetRequested} you asked for.
                          {result.stats.excludedAsMarked > 0 && (
                            <> We skipped <strong>{result.stats.excludedAsMarked}</strong> you&apos;ve already applied to or rejected.</>
                          )}
                          {' '}Try a different keyword, or loosen your salary and job-type filters to see more.
                        </p>
                      </div>
                    )}

                    {/* Source filter — only worth showing when more than one
                        site actually returned something. */}
                    {sourceCounts.length > 1 && (
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <button
                          onClick={() => setOnlySource(null)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors
                            ${onlySource === null
                              ? 'bg-white text-gray-900 border-white'
                              : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'}`}
                        >
                          All {result.validJobs.length}
                        </button>
                        {sourceCounts.map(({ source, count }) => (
                          <button
                            key={source}
                            onClick={() => setOnlySource(s => (s === source ? null : source))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors
                              ${onlySource === source
                                ? SOURCE_BADGE[source]
                                : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'}`}
                          >
                            {SOURCE_LABEL[source]} {count}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Filter chip — only meaningful once at least one job is marked */}
                    {markedInBatch > 0 && (
                      <div className="flex items-center justify-end mb-1">
                        <button
                          onClick={() => setHideMarked(v => !v)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors
                            ${hideMarked
                              ? 'bg-emerald-600/15 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/25'
                              : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                            }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d={hideMarked
                                ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                                : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
                          </svg>
                          {hideMarked ? `Hidden (${markedInBatch} marked)` : `Hide marked (${markedInBatch})`}
                        </button>
                      </div>
                    )}

                    {/* Best matches highlight */}
                    {visibleBestMatches.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                            🏆 Top Matches
                          </span>
                          <div className="flex-1 border-t border-yellow-500/20" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {visibleBestMatches.map(job => (
                            <JobCard key={job.id} job={job} highlight baseMessage={result.applicationMessage} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other valid jobs (excluding the Top Matches above to avoid duplicates) */}
                    {otherValidJobs.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Other Jobs ({otherValidJobs.length})
                          </span>
                          <div className="flex-1 border-t border-gray-800" />
                        </div>
                        <div className="space-y-3">
                          {otherValidJobs.map(job => (
                            <JobCard key={job.id} job={job} baseMessage={result.applicationMessage} />
                          ))}
                        </div>
                      </>
                    )}

                    {locked && (
                      <div className="mt-4">
                        <LiveResults jobs={[]} pendingSources={[]} locked={locked} />
                      </div>
                    )}

                    {/* Empty state — only when BOTH Top Matches and Other Jobs render nothing */}
                    {visibleBestMatches.length === 0 && otherValidJobs.length === 0 && (
                      <div className="text-center py-12 text-gray-600">
                        <p className="text-sm">
                          {hideMarked && result.validJobs.length > 0
                            ? 'All jobs in this batch are already applied or rejected.'
                            : 'No valid jobs found after filtering.'}
                        </p>
                        <p className="text-xs mt-1">
                          {hideMarked && result.validJobs.length > 0
                            ? 'Toggle "Hide marked" off to see them.'
                            : 'Try different keywords or filters.'}
                        </p>
                      </div>
                    )}

                    {/* Filtering is a feature, not debug output — show the user
                        what we saved them from opening, and why. */}
                    {result.removedJobs.length > 0 && (
                      <details className="mt-6 group">
                        <summary className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors list-none">
                          <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          We filtered out {result.removedJobs.length} listing{result.removedJobs.length === 1 ? '' : 's'} — see why
                        </summary>
                        <div className="mt-2 space-y-2 pl-4 border-l border-gray-800">
                          {result.removedJobs.map((r, i) => (
                            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-400">{r.job.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{r.reason}</p>
                              {r.job.companyName && <p className="text-xs text-gray-700">{r.job.companyName}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Insights tab */}
                {activeTab === 'insights' && (
                  <AIInsights result={result} />
                )}

                {/* Application tab */}
                {activeTab === 'application' && (
                  <ApplicationMessage message={result.applicationMessage} jobs={result.validJobs} />
                )}

                {/* Email tab */}
                {activeTab === 'email' && (
                  <EmailPreview
                    result={result}
                    options={lastOptions!}
                    userEmail={user?.email}
                    onSend={handleSendEmail}
                    sending={sendingEmail}
                    sent={emailSent}
                  />
                )}

                {/* Applied tab */}
                {activeTab === 'applied' && (
                  <MarkedJobsList
                    entries={appliedEntries}
                    state="applied"
                    baseMessage={result.applicationMessage}
                  />
                )}

                {/* Rejected tab */}
                {activeTab === 'rejected' && (
                  <MarkedJobsList
                    entries={rejectedEntries}
                    state="rejected"
                    baseMessage={result.applicationMessage}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating new-search button (mobile) — the header icon is easy to miss
          once results fill the screen. Hidden while the drawer is already open. */}
      {result && !loading && !mobileSearchOpen && (
        <button
          onClick={() => setMobileSearchOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-black/40 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          New search
        </button>
      )}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <OjConnectModal open={ojModalOpen} onClose={() => setOjModalOpen(false)} onConnected={refreshMe} />
    </div>
  );
}

// ─── Utility: single animation frame tick ────────────────────────────────────
function tick() {
  return new Promise<void>(r => setTimeout(r, 300));
}
