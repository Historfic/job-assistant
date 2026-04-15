'use client';

import { useState } from 'react';
import type { ScrapeOptions } from '@/types';

interface Props {
  onSearch: (opts: ScrapeOptions) => void;
  loading: boolean;
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

export default function SearchForm({ onSearch, loading }: Props) {
  // Required fields
  const [keyword, setKeyword] = useState('AI automation');
  const [minSalary, setMinSalary] = useState('10');
  const [maxSalary, setMaxSalary] = useState('');
  const [jobType, setJobType] = useState<ScrapeOptions['jobType']>('any');
  const [limit, setLimit] = useState('10');

  // Optional smart filters
  const [showFilters, setShowFilters] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [techStack, setTechStack] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [datePosted, setDatePosted] = useState('');
  const [sessionCookie, setSessionCookie] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || loading) return;

    onSearch({
      keyword: keyword.trim(),
      minSalary: minSalary ? Number(minSalary) : undefined,
      maxSalary: maxSalary ? Number(maxSalary) : undefined,
      jobType,
      limit: Math.min(Math.max(Number(limit) || 10, 1), 30),
      experienceLevel: experienceLevel || undefined,
      techStack: techStack || undefined,
      remoteOnly: remoteOnly || undefined,
      datePosted: datePosted || undefined,
      sessionCookie: sessionCookie || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-300 mb-1">Search Jobs</p>
        <p className="text-[11px] text-gray-600">Configure your search and click Find Jobs.</p>
      </div>

      {/* ── Required Fields ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <Label>Keyword *</Label>
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="e.g. AI, React, VA"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Min $/hr</Label>
            <Input
              type="number"
              value={minSalary}
              onChange={e => setMinSalary(e.target.value)}
              placeholder="10"
              min="0"
            />
          </div>
          <div>
            <Label>Max $/hr</Label>
            <Input
              type="number"
              value={maxSalary}
              onChange={e => setMaxSalary(e.target.value)}
              placeholder="Any"
              min="0"
            />
          </div>
        </div>

        <div>
          <Label>Job Type *</Label>
          <Select value={jobType} onChange={e => setJobType(e.target.value as ScrapeOptions['jobType'])}>
            <option value="any">Any</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="freelance">Freelance / Gig</option>
          </Select>
        </div>

        <div>
          <Label>Number of Jobs *</Label>
          <Input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min="1"
            max="30"
            placeholder="10"
          />
          <p className="text-[10px] text-gray-700 mt-1">Max 30. Scraper will loop until quota is met.</p>
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
          <span className="font-semibold uppercase tracking-widest text-[10px]">Smart Filters</span>
          <span className="text-gray-700 text-[10px]">(optional)</span>
        </button>

        {showFilters && (
          <div className="mt-4 space-y-4 animate-slide-up">
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
              <Label>Tech Stack Filter</Label>
              <Input
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
                placeholder="e.g. React, Python, n8n"
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

            <div>
              <Label>Session Cookie (optional)</Label>
              <Input
                type="password"
                value={sessionCookie}
                onChange={e => setSessionCookie(e.target.value)}
                placeholder="ci_session value from browser"
              />
              <p className="text-[10px] text-gray-700 mt-1">Required for live scraping. Leave empty for demo mode.</p>
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

      <p className="text-[10px] text-gray-700 text-center leading-relaxed">
        Demo mode active. Real scraping requires a session cookie from onlinejobs.ph.
      </p>
    </form>
  );
}
