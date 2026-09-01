'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getCareerProfileSnapshot,
  saveCareerProfile,
  hasUsableProfile,
  type CareerProfile,
} from '@/lib/careerProfile';
import { DEFAULT_LETTER_TEMPLATE } from '@/lib/letterTemplate';

const MIN_CHARS = 80;

export default function ProfileModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [headline, setHeadline] = useState('');
  const [cvText, setCvText] = useState('');
  const [template, setTemplate] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  // Load the current profile each time the modal opens
  useEffect(() => {
    if (!open) return;
    const p = getCareerProfileSnapshot();
    setHeadline(p.headline);
    setCvText(p.cvText);
    setTemplate(p.letterTemplate ?? '');
    setSaved(false);
  }, [open]);

  if (!open) return null;

  const profile: CareerProfile = {
    headline: headline.trim(),
    cvText: cvText.trim(),
    letterTemplate: template.trim(),
  };
  const ready = hasUsableProfile(profile);

  function handleSave() {
    saveCareerProfile(profile);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  // Almost nobody keeps a CV as plain text — it is a PDF or a Word export. The
  // server does the parsing, because shipping a megabyte of PDF parser to every
  // visitor to serve the few who upload one is the wrong trade.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';            // let the same file be picked again after an error
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/cv/parse', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'We could not read that file.');

      setCvText(data.text);
      setUploadedName(file.name);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
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
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors"
          >
            {uploading ? (
              <>
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Reading your CV...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                Upload CV (PDF, Word, or text)
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {uploadError && (
          <p className="text-[11px] text-red-400 -mt-3 mb-4 leading-relaxed">{uploadError}</p>
        )}
        {uploadedName && !uploadError && (
          <p className="text-[11px] text-emerald-400 -mt-3 mb-4">
            Loaded {uploadedName}. Check it below and edit anything that came out wrong.
          </p>
        )}

        {/* The one part of the output a user controls. Someone applying twenty
            times a week has their own voice; before this they could accept the
            model's shape or rewrite every letter by hand. */}
        <div className="border-t border-gray-800 pt-4 mb-5">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              Your letter template
            </label>
            {template.trim() && (
              <button
                onClick={() => setTemplate('')}
                className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
          <textarea
            value={template || DEFAULT_LETTER_TEMPLATE}
            onChange={e => setTemplate(e.target.value)}
            rows={9}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs
                       text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-blue-600"
          />
          <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">
            Every letter follows this shape. Anything in [square brackets] gets replaced
            with real details from the job and your CV, never left as-is.
          </p>
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
