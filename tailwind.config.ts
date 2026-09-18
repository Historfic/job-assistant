import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom gray scale matching AI Cloner dark theme
        gray: {
          925: '#0d1117',
          950: '#0a0a0f',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Sweeps across a placeholder card while its source is still
        // answering. Slow enough to read as waiting, not as a glitch.
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        // The landing page's remote-work photo. Slow enough that it reads as
        // a living photo rather than as something moving; a faster zoom pulls
        // the eye away from the quotes beside it.
        'slow-zoom': 'slowZoom 20s ease-in-out infinite',
        // Uncover the hero's side photos on page load, each from its own
        // screen edge; the right one a beat later so they do not move as one.
        'wipe-in': 'wipeIn 1.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'wipe-in-right': 'wipeInRight 1.3s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
        // The photo cards down the sides of the page. A small lift over a long
        // cycle: enough to feel alive in the corner of the eye, not enough to
        // pull attention off the column being read.
        float: 'float 7s ease-in-out infinite',
        // The same photos passing through a band, on the screens too narrow to
        // have margins for them. Linear, because any easing in a loop reads as
        // the strip stalling once per cycle.
        marquee: 'marquee 48s linear infinite',
        // Background glows. Three different lengths, so the three never fall
        // back into step and the movement never shows an obvious loop.
        'drift-a': 'driftA 19s ease-in-out infinite',
        'drift-b': 'driftB 23s ease-in-out infinite',
        'drift-c': 'driftC 29s ease-in-out infinite',
      },
      keyframes: {
        // inset(... 0%) rather than none at the end: a browser only animates
        // between two clip-paths of the same shape.
        wipeIn: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0% 0 0)' },
        },
        wipeInRight: {
          '0%': { clipPath: 'inset(0 0 0 100%)' },
          '100%': { clipPath: 'inset(0 0 0 0%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        // Exactly half, because the row is rendered twice: at -50% the copy
        // sits where the original began, so the loop has no seam.
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        driftA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(6rem, 3rem) scale(1.1)' },
          '66%': { transform: 'translate(-4rem, 4rem) scale(0.95)' },
        },
        driftB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-8rem, 3rem) scale(1.15)' },
        },
        driftC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(5rem, -4rem) scale(1.1)' },
        },
        slowZoom: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
