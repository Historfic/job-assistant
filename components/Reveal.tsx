'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Fades and slides a block in the first time it scrolls into view.
//
// The server HTML is always VISIBLE; a block is hidden only after hydration,
// and only while it is still below the fold. Hiding it in the server HTML
// would make the testimonials depend on a script loading, and someone landing
// on /#who with the section already on screen would watch it blink out and
// back in. Reduced-motion users get the content with no movement at all.

type From = 'up' | 'left' | 'right';

// Sideways slides only from sm up. On a phone the block is full width, and
// pushing it off the side would open a horizontal scrollbar until it lands.
const OFFSET: Record<From, string> = {
  up: 'translate-y-6',
  left: 'translate-y-6 sm:translate-y-0 sm:-translate-x-10',
  right: 'translate-y-6 sm:translate-y-0 sm:translate-x-10',
};

export default function Reveal({
  children,
  from = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  from?: From;
  /** ms, so blocks revealed together can arrive one after another */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen

    setState('hidden');
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setState('shown');
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -15% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The transition is only attached on the way in, so hiding after hydration
  // is instant rather than a fade-out nobody asked for.
  const motion =
    state === 'hidden' ? `opacity-0 ${OFFSET[from]}` :
    state === 'shown' ? 'transition duration-700 ease-out' : '';

  return (
    <div
      ref={ref}
      className={`${motion} ${className}`}
      style={state === 'shown' && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
