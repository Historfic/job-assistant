'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Brings a block in the first time it scrolls into view.
//
// The server HTML is always VISIBLE; a block is hidden only after hydration,
// and only while it is still below the fold. Hiding it in the server HTML
// would make the testimonials depend on a script loading, and someone landing
// on /#who with the section already on screen would watch it blink out and
// back in. Reduced-motion users get the content with no movement at all.
//
// The distances are large on purpose. The first version moved things 24px
// over 0.7s, and on a 1920px screen nobody noticed it was animated at all.

type From = 'up' | 'left' | 'right' | 'wipe';

// Sideways slides only from sm up. On a phone the block is full width, and
// pushing it off the side would open a horizontal scrollbar until it lands.
const HIDDEN: Record<From, string> = {
  up: 'opacity-0 translate-y-12',
  left: 'opacity-0 translate-y-12 sm:translate-y-0 sm:-translate-x-24',
  right: 'opacity-0 translate-y-12 sm:translate-y-0 sm:translate-x-24',
  // Uncovered from the left edge. clip-path moves nothing, so it cannot open
  // a scrollbar however wide the block is. The end value is spelled out as
  // inset(0 0% 0 0) rather than none, because a browser only animates between
  // two clip-paths of the same shape.
  wipe: '[clip-path:inset(0_100%_0_0)]',
};
const SHOWN: Record<From, string> = {
  up: '',
  left: '',
  right: '',
  wipe: '[clip-path:inset(0_0%_0_0)]',
};

export default function Reveal({
  children,
  from = 'up',
  delay = 0,
  duration = 900,
  className = '',
}: {
  children: ReactNode;
  from?: From;
  /** ms, so blocks revealed together can arrive one after another */
  delay?: number;
  /** ms */
  duration?: number;
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
    state === 'hidden' ? HIDDEN[from] :
    state === 'shown'
      ? `${SHOWN[from]} transition-[opacity,transform,clip-path] ease-[cubic-bezier(0.22,1,0.36,1)]`
      : '';

  return (
    <div
      ref={ref}
      className={`${motion} ${className}`}
      style={state === 'shown' ? { transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
