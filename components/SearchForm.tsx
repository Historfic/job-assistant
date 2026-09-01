'use client';

import { useEffect, useState } from 'react';
import type { JobSource, ScrapeOptions } from '@/types';
import SourceSelector from '@/components/dashboard/SourceSelector';

interface Props {
  onSearch: (opts: ScrapeOptions) => void;
  loading: boolean;
  tier: 'free' | 'pro';
}

// ─── Input primitives ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
      {children}
    </p>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
    >
      {children}
    </select>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

// What this audience actually types. Deliberately roles, not skills: someone
// looking for VA work does not think of themselves as "React".
const EXAMPLES = ['virtual assistant', 'social media manager', 'bookkeeper', 'customer support'];

export default function SearchForm({ onSearch, loading, tier }: Props) {
  // A paying customer's first search should use everything they paid for —
  // LinkedIn and Upwork are the whole reason for the upgrade, and most people
  // won't think to switch them on. Their own choice always wins after that.
  const [sources, setSources] = useState<JobSource[]>(['onlinejobs']);
  const [sourcesChosen, setSourcesChosen] = useState(false);

  useEffect(() => {
    if (!sourcesChosen && tier === 'pro') {
      setSources(['onlinejobs', 'linkedin', 'upwork']);
    }
  }, [tier, sourcesChosen]);

  function chooseSources(next: JobSource[]) {
    setSourcesChosen(true);
    setSources(next);
  }

  // Both of these used to be pre-filled, which mattered more than it looked.
  //
  // minSalary defaulted to 10 and was submitted on every search even while
  // hidden inside collapsed filters. Once peso salaries stopped being read as
  // dollars, $10/hr meant roughly P93,000/month -- so a default free-tier
  // search, where OnlineJobs.ph is the only source, returned nothing at all.
  //
  // keyword was pre-filled, which is not what this audience searches for and
  // also suppressed the example chips: they only appear when the box is empty,
  // and the box was never empty. It is a faint placeholder now, so the field
  // reads as a question rather than an answer somebody else already gave.
  const [keyword, setKeyword] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [jobType, setJobType] = useState<ScrapeOptions['jobType']>('any');
  const [limit, setLimit] = useState('10');

  // Optional smart filters
  const [showFilters, setShowFilters] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [techStack, setTechStack] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [datePosted, setDatePosted] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || loading) return;

    onSearch({
      sources,
      keyword: keyword.trim(),
      minSalary: minSalary ? Number(minSalary) : undefined,
      maxSalary: maxSalary ? Number(maxSalary) : undefined,
      jobType,
      limit: Math.min(Math.max(Number(limit) || 10, 1), 30),
      experienceLevel: experienceLevel || undefined,
      techStack: techStack || undefined,
      remoteOnly: remoteOnly || undefined,
      datePosted: datePosted || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-300 mb-1">Search Jobs</p>
        <p className="text-[11px] text-gray-600">Configure your search and click Find Jobs.</p>
      </div>

      {/* ── The only thing anyone has to fill in ─────────────────────────────
          A beta tester called this form "way too complex", and they were
          right: five fields stood between someone and their first result,
          three of them marked required. Everything except the keyword is a
          refinement, so everything except the keyword now waits behind
          Filters. Nothing was removed. It just stopped being in the way. */}
      <div className="space-y-4">
        <div data-tour="search">
          <Label>What work do you do?</Label>
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="virtual assistant"
            required
          />

          {/* Instruction without a tutorial: the first search becomes one tap.
              A blank box tells a first-time user nothing about what belongs
              in it. */}
          {!keyword && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setKeyword(example)}
                  className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>

        <div data-tour="sources">
          <SourceSelector selected={sources} tier={tier} onChange={chooseSources} />
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* ── Smart Filters (collapsible) ──────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold uppercase tracking-widest text-[10px]">Filters</span>
          <span className="text-gray-700 text-[10px]">(optional)</span>
        </button>

        {showFilters && (
          <div className="mt-4 space-y-4 animate-slide-up">
            <div>
              <Label>Job type</Label>
              <Select value={jobType} onChange={e => setJobType(e.target.value as ScrapeOptions['jobType'])}>
                <option value="any">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="freelance">Freelance / Gig</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min $/hr</Label>
                <Input type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)}
                  placeholder="Any" min="0" />
              </div>
              <div>
                <Label>Max $/hr</Label>
                <Input type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)}
                  placeholder="Any" min="0" />
              </div>
            </div>

            <div>
              <Label>Results per search</Label>
              <Input type="number" value={limit} onChange={e => setLimit(e.target.value)}
                min="1" max="30" placeholder="10" />
            </div>

            <div>
              <Label>Experience Level</Label>
              <Select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                <option value="">Any level</option>
                <option value="entry">Entry Level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </Select>
            </div>

            <div>
              <Label>Tools you know</Label>
              <Input
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
                placeholder="Canva, Shopify, QuickBooks"
              />
            </div>

            <div>
              <Label>Date Posted</Label>
              <Select value={datePosted} onChange={e => setDatePosted(e.target.value)}>
                <option value="">Any time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </Select>
            </div>

            {/* Remote toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-300">Remote Only</p>
                <p className="text-[10px] text-gray-600">Filter for work-from-home listings</p>
              </div>
              <button
                type="button"
                onClick={() => setRemoteOnly(r => !r)}
                className={`relative w-10 h-5 rounded-full transition-colors ${remoteOnly ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${remoteOnly ? 'translate-x-5' : ''}`} />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || !keyword.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Jobs
          </>
        )}
      </button>

    </form>
  );
}
