'use client';

import { useState, useSyncExternalStore } from 'react';
import type { AnalyzedJob } from '@/types';
import type { CoverLetterQuestion } from '@/app/api/generate-questions/route';
import { getCareerProfileSnapshot } from '@/lib/careerProfile';
import { SOURCE_LABEL, SOURCE_BADGE, jobSource } from '@/lib/sourceLabels';
import {
  subscribeJobStatus,
  getJobStatusSnapshot,
  getServerSnapshot,
  toggleStatus,
  relativeAgo,
} from '@/lib/jobStatus';

interface Props {
  job: AnalyzedJob;
  highlight?: boolean;
  baseMessage?: string;
}

type Phase = 'idle' | 'loading-questions' | 'questions' | 'generating' | 'result';

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-gray-500';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-gray-600';
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffH = (Date.now() - d.getTime()) / 3_600_000;
  if (diffH < 1) return 'Just posted';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const days = Math.floor(diffH / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JobCard({ job, highlight, baseMessage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { analysis } = job;
  const source = jobSource(job);

  const statusMap = useSyncExternalStore(
    subscribeJobStatus,
    getJobStatusSnapshot,
    getServerSnapshot,
  );
  const entry      = job.url ? statusMap[job.url] : undefined;
  const applied    = entry?.state === 'applied';
  const rejected   = entry?.state === 'rejected';
  const marked     = applied || rejected;
  const statusDate = entry?.setAt ?? null;

  // ── Questionnaire + cover letter state ─────────────────────────────────────
  const [phase, setPhase]               = useState<Phase>('idle');
  const [questions, setQuestions]       = useState<CoverLetterQuestion[]>([]);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [personalMsg, setPersonalMsg]   = useState('');
  const [personalSubject, setPersonalSubject] = useState('');
  const [personalError, setPersonalError] = useState('');
  // Which field was copied last, so only that button shows its tick.
  const [personalCopied, setPersonalCopied] = useState<'subject' | 'body' | null>(null);

  async function startQuestionnaire() {
    setPhase('loading-questions');
    setPersonalError('');
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load questions');
      setQuestions(data.questions);
      setPhase('questions');
    } catch (err) {
      setPersonalError((err as Error).message);
      setPhase('idle');
    }
  }

  async function generateCoverLetter() {
    setPhase('generating');
    setPersonalError('');
    try {
      const qaContext = questions.map(q => ({
        question: q.question,
        answer: answers[q.id] ?? '',
      }));
      const res = await fetch('/api/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          baseMessage: baseMessage ?? '',
          qaContext,
          // The user's saved CV, so the letter cites real experience
          careerProfile: getCareerProfileSnapshot(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setPersonalMsg(data.message);
      setPersonalSubject(data.subject ?? '');
      setPhase('result');
    } catch (err) {
      setPersonalError((err as Error).message);
      setPhase('questions');
    }
  }

  function handlePersonalizeButton() {
    if (phase === 'idle') { startQuestionnaire(); return; }
    if (phase === 'result') { setPhase('idle'); return; }
    if (phase === 'questions') { setPhase('idle'); return; }
  }

  async function copyText(text: string, mark: 'subject' | 'body') {
    try {
      await navigator.clipboard.writeText(text);
      setPersonalCopied(mark);
      setTimeout(() => setPersonalCopied(null), 2000);
    } catch {
      // clipboard blocked — the text is on screen to select manually
    }
  }

  const btnLoading = phase === 'loading-questions' || phase === 'generating';
  const btnLabel =
    phase === 'idle'             ? 'Personalize'
    : phase === 'loading-questions' ? 'Analyzing...'
    : phase === 'questions'      ? 'Cancel'
    : phase === 'generating'     ? 'Writing...'
    : 'Hide message';

  const btnActive = phase === 'result';

  return (
    <div
      className={`rounded-xl border transition-all group
        ${highlight
          ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
        }
        ${marked ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <div className="p-4">
        {/* Top row: title + score */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {highlight && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 font-medium">
                  ⭐ Top Match
                </span>
              )}
              <h3 className="text-sm font-semibold text-white truncate leading-tight">
                {job.title ?? 'Untitled Position'}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Which site this came from. First thing people ask of a mixed list. */}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SOURCE_BADGE[source]}`}>
                {SOURCE_LABEL[source]}
              </span>
              <span className="text-xs text-gray-400">{job.companyName ?? 'Unknown Company'}</span>
              {job.employmentType && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">
                  {job.employmentType}
                </span>
              )}
              {job.datePosted && (
                <span className="text-[10px] text-gray-600">{relativeDate(job.datePosted)}</span>
              )}
              {applied && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  ✓ Applied {relativeAgo(statusDate)}
                </span>
              )}
              {rejected && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                  ✗ Rejected {relativeAgo(statusDate)}
                </span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-end shrink-0">
            <span className={`text-base font-bold ${scoreColor(job.score)}`}>
              {job.score}
            </span>
            <span className="text-[9px] text-gray-600 uppercase tracking-wider">score</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full h-1 bg-gray-800 rounded-full mb-3">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(job.score)}`}
            style={{ width: `${job.score}%` }}
          />
        </div>

        {/* Salary + flags row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {job.salary && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-emerald-400">{job.salary}</span>
            </div>
          )}

          {analysis.requires_cv && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
              📄 CV Required
            </span>
          )}

          {analysis.platform_redirect && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
              ↗ {analysis.redirect_platform || 'External'}
            </span>
          )}
        </div>

        {/* Skills pills */}
        {analysis.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {analysis.skills.slice(0, 6).map(s => (
              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">
                {s}
              </span>
            ))}
            {analysis.skills.length > 6 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-600">
                +{analysis.skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {job.description && (
          <p className={`text-xs text-gray-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {job.description}
          </p>
        )}

        {/* Footer: expand + personalize + view link + status toggles */}
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          {job.description && job.description.length > 120 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors shrink-0"
            >
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
          <div className="flex-1" />

          {/* Actions stay grouped so they wrap as one block on narrow screens
              instead of stranding a lone icon on its own row. */}
          <div className="flex items-center gap-2">
          {/* Personalize button */}
          <button
            onClick={handlePersonalizeButton}
            disabled={btnLoading}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors
              ${btnActive
                ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {btnLoading ? (
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
            {btnLabel}
          </button>

          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium shrink-0"
            >
              View Job
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {job.url && (
            <button
              onClick={() => toggleStatus(job.url!, 'applied', job)}
              title={applied ? 'Unmark as applied' : 'Mark as applied'}
              aria-label={applied ? 'Unmark as applied' : 'Mark as applied'}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0
                ${applied
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25'
                  : 'bg-gray-800 text-gray-400 hover:text-emerald-400 hover:bg-gray-700 border border-gray-700'
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={applied
                    ? 'M5 13l4 4L19 7'
                    : 'M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
            </button>
          )}

          {job.url && (
            <button
              onClick={() => toggleStatus(job.url!, 'rejected', job)}
              title={rejected ? 'Unmark as rejected' : 'Reject this job'}
              aria-label={rejected ? 'Unmark as rejected' : 'Reject this job'}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0
                ${rejected
                  ? 'bg-red-600/15 text-red-400 border border-red-600/25 hover:bg-red-600/25'
                  : 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border border-gray-700'
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={rejected
                    ? 'M6 18L18 6M6 6l12 12'
                    : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
            </button>
          )}
          </div>
        </div>

        {/* ── Panel: error ───────────────────────────────────────────────────── */}
        {personalError && (
          <div className="mt-3 border-t border-gray-800 pt-3">
            <p className="text-xs text-red-400">{personalError}</p>
          </div>
        )}

        {/* ── Panel: loading questions ────────────────────────────────────────── */}
        {phase === 'loading-questions' && (
          <div className="mt-3 border-t border-gray-800 pt-3 animate-slide-up">
            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Analyzing job to generate questions...
            </div>
          </div>
        )}

        {/* ── Panel: questionnaire ────────────────────────────────────────────── */}
        {phase === 'questions' && questions.length > 0 && (
          <div className="mt-3 border-t border-gray-800 pt-4 animate-slide-up space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                ✦ Quick questions
              </span>
              <span className="text-[10px] text-gray-600">— optional, gives the letter a personal touch</span>
            </div>

            {questions.map((q, i) => (
              <div key={q.id} className="space-y-1.5">
                <label className="block text-xs text-gray-300 leading-snug">
                  <span className="text-gray-600 mr-1.5">{i + 1}.</span>
                  {q.question}
                </label>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  rows={2}
                  className="w-full resize-none rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300
                    placeholder-gray-700 px-3 py-2 focus:outline-none focus:border-emerald-600/50
                    focus:ring-1 focus:ring-emerald-600/30 transition-colors leading-relaxed"
                />
              </div>
            ))}

            <button
              onClick={generateCoverLetter}
              className="w-full mt-1 py-2 px-4 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-600/30
                text-xs font-semibold hover:bg-emerald-600/30 hover:border-emerald-600/50 transition-colors"
            >
              Generate Cover Letter →
            </button>
          </div>
        )}

        {/* ── Panel: generating ──────────────────────────────────────────────── */}
        {phase === 'generating' && (
          <div className="mt-3 border-t border-gray-800 pt-3 animate-slide-up">
            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Writing your personalized cover letter...
            </div>
          </div>
        )}

        {/* ── Panel: result ──────────────────────────────────────────────────── */}
        {phase === 'result' && personalMsg && (
          <div className="mt-3 border-t border-gray-800 pt-3 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                ✍️ Personalized for this job
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPhase('questions'); setPersonalMsg(''); setPersonalSubject(''); }}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  ← Edit answers
                </button>
                <button
                  onClick={() => copyText(personalMsg, 'body')}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors
                    ${personalCopied === 'body'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                >
                  {personalCopied === 'body' ? '✓ Copied!' : 'Copy body'}
                </button>
              </div>
            </div>
            {/* Subject and body copy separately: they go into two different
                fields, so one combined blob means editing them apart by hand. */}
            {personalSubject && (
              <div className="flex items-center gap-2 mb-2 bg-gray-950 rounded-lg px-3 py-2 border border-gray-800">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 shrink-0">
                  Subject
                </span>
                <p className="text-xs text-gray-300 truncate flex-1">{personalSubject}</p>
                <button
                  onClick={() => copyText(personalSubject, 'subject')}
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors
                    ${personalCopied === 'subject'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  {personalCopied === 'subject' ? '✓' : 'Copy'}
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line bg-gray-950 rounded-lg p-3 border border-gray-800">
              {personalMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
