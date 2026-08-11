'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getCareerProfileSnapshot,
  saveCareerProfile,
  hasUsableProfile,
  type CareerProfile,
} from '@/lib/careerProfile';

const MIN_CHARS = 80;

export default function ProfileModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [headline, setHeadline] = useState('');
  const [cvText, setCvText] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the current profile each time the modal opens
  useEffect(() => {
    if (!open) return;
    const p = getCareerProfileSnapshot();
    setHeadline(p.headline);
    setCvText(p.cvText);
    setSaved(false);
  }, [open]);

  if (!open) return null;

  const profile: CareerProfile = { headline: headline.trim(), cvText: cvText.trim() };
  const ready = hasUsableProfile(profile);

  function handleSave() {
    saveCareerProfile(profile);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  // Plain-text CVs can be dropped straight in. PDFs and Word files need to be
  // opened and copied — the browser can't read them without a heavy parser.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCvText(text.slice(0, 20_000));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-sm font-semibold text-white">Your experience</h2>
          <button onClick={onClose} aria-label="Close"
            className="p-1 -mr-1 -mt-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Add this once and every cover letter will use your real skills and experience
          instead of generic filler. Only you can see it.
        </p>

        <label className="block mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            What do you do?
          </span>
          <input
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder="e.g. Virtual Assistant · 3 years · e-commerce"
            className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Your CV or a summary of your experience
          </span>
          <textarea
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            rows={10}
            placeholder={'Open your CV, select all, copy, and paste it here.\n\nNo CV yet? Just write your skills, the tools you use, and the kind of work you’ve done.'}
            className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-y"
          />
        </label>

        <div className="flex items-center justify-between gap-3 mt-2 mb-5 flex-wrap">
          <p className={`text-[11px] ${ready ? 'text-emerald-400' : 'text-gray-600'}`}>
            {ready
              ? '✓ Enough detail to personalise your letters'
              : `${Math.max(0, MIN_CHARS - cvText.trim().length)} more characters for best results`}
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            Load a .txt file
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md,text/plain" onChange={handleFile} className="hidden" />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saved}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-emerald-600 text-xs font-medium text-white transition-colors">
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
