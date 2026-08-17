'use client';

import { useEffect, useRef, useState } from 'react';

// Four cross-fading slots for social proof — customer quotes, result
// screenshots, whatever you have. Placeholder content for now; swap the SLIDES
// array as real material arrives.
//
// One at a time rather than a grid: four quotes side by side on a phone means
// four unreadable columns, and a rotator keeps the eye on one claim at a time.

interface Slide {
  quote: string;
  name: string;
  role: string;
  placeholder?: boolean;
}

const SLIDES: Slide[] = [
  { quote: 'Replace with a real customer quote — what changed for them, in their own words.',
    name: 'Customer name', role: 'Virtual Assistant · Cebu', placeholder: true },
  { quote: 'A second quote. The most useful ones name a number: hours saved, replies received, a client landed.',
    name: 'Customer name', role: 'Social Media Manager · Davao', placeholder: true },
  { quote: 'A third. Quotes that mention a doubt they had before paying work hardest.',
    name: 'Customer name', role: 'Bookkeeper · Manila', placeholder: true },
  { quote: 'A fourth. Short beats long — two sentences is plenty.',
    name: 'Customer name', role: 'Customer Support · Iloilo', placeholder: true },
];

const INTERVAL_MS = 5000;

export default function ProofRotator() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Don't auto-advance for people who asked the OS to reduce motion, or
    // while they're interacting with the dots.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || paused) return;

    timer.current = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fixed height so the page doesn't jump as slides of different
          lengths swap in. */}
      <div className="relative h-[188px] sm:h-[168px]">
        {SLIDES.map((s, i) => (
          <figure
            key={i}
            aria-hidden={i !== index}
            className={`absolute inset-0 bg-white border rounded-2xl p-6 flex flex-col justify-between
              transition-opacity duration-700 ease-in-out
              motion-reduce:transition-none
              ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}
              ${s.placeholder ? 'border-dashed border-slate-300' : 'border-slate-200'}`}
          >
            {s.placeholder && (
              <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                Placeholder
              </span>
            )}
            <blockquote className="text-[15px] leading-relaxed text-slate-700">
              &ldquo;{s.quote}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-4">
              {/* Swap for a real photo — a face lifts trust more than any copy */}
              <span className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900 truncate">{s.name}</span>
                <span className="block text-[11.5px] text-slate-500 truncate">{s.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setPaused(true); }}
            aria-label={`Show quote ${i + 1}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all duration-300
              ${i === index ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
          />
        ))}
      </div>
    </div>
  );
}
