'use client';

import { useState } from 'react';
import { getCareerProfileSnapshot } from '@/lib/careerProfile';
import type { AnalyzedJob } from '@/types';

// Paste a job from anywhere, get a cover letter.
//
// A beta tester found jobs in Facebook groups, from referrals, and on sites we
// do not cover — and had no way to use the one feature they actually wanted.
// Search is how we find jobs; it should not be the only way in.
//
// Deliberately two calls to two existing endpoints rather than a third that
// does both: letters are written in exactly one place, so a pasted job and a
// searched job can never start producing different quality.

type Phase = 'idle' | 'working' | 'done';

export default function PasteJobPanel() {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [letter, setLetter] = useState('');
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);

  async function write() {
    setError('');
    setPhase('working');
    try {
      const shaped = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });
      const shapedData = await shaped.json();
      if (!shaped.ok) throw new Error(shapedData.error ?? 'Could not read that job post.');

      const job = shapedData.job as AnalyzedJob;
      const res = await fetch('/api/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          baseMessage: '',
          qaContext: [],
          careerProfile: getCareerProfileSnapshot(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not write the letter.');

      setSubject(data.subject ?? '');
      setLetter(data.message);
      setPhase('done');
    } catch (err) {
      setError((err as Error).message);
      setPhase('idle');
    }
  }

  async function copy(value: string, mark: 'subject' | 'body') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(mark);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* blocked — it is on screen to select */ }
  }

  return (
    <div className="px-4 sm:px-5 py-5">
      <h2 className="text-sm font-semibold text-white">Found a job somewhere else?</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
        Paste it here from a Facebook group, an email, anywhere. We&apos;ll write the
        cover letter using your saved experience.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={7}
        placeholder="Paste the whole job post here..."
        className="w-full px-3.5 py-3 rounded-xl bg-gray-950 border border-gray-800 text-xs
                   text-gray-200 placeholder:text-gray-600 leading-relaxed resize-y
                   focus:outline-none focus:border-blue-600"
      />

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      <button
        onClick={write}
        disabled={phase === 'working' || text.trim().length < 80}
        className="w-full mt-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800
                   disabled:text-gray-600 text-sm font-medium text-white transition-colors"
      >
        {phase === 'working' ? 'Writing...' : 'Write my cover letter'}
      </button>
      {text.trim().length > 0 && text.trim().length < 80 && (
        <p className="text-[11px] text-gray-600 mt-2 text-center">
          Paste a bit more of the post so we have something to work from.
        </p>
      )}

      {phase === 'done' && (
        <div className="mt-5 border-t border-gray-800 pt-4 animate-slide-up">
          {subject && (
            <div className="flex items-center gap-2 mb-2 bg-gray-950 rounded-lg px-3 py-2 border border-gray-800">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 shrink-0">
                Subject
              </span>
              <p className="text-xs text-gray-300 truncate flex-1">{subject}</p>
              <button
                onClick={() => copy(subject, 'subject')}
                className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors
                  ${copied === 'subject' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {copied === 'subject' ? '✓' : 'Copy'}
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line bg-gray-950 rounded-lg p-3 border border-gray-800">
            {letter}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setPhase('idle'); setText(''); setLetter(''); setSubject(''); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Another job
            </button>
            <button
              onClick={() => copy(letter, 'body')}
              className={`flex-[2] py-2.5 rounded-xl text-xs font-medium transition-colors
                ${copied === 'body' ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {copied === 'body' ? 'Copied' : 'Copy letter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
