'use client';

import { useEffect, useState } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';

// A first-run walkthrough, after a beta tester called the app "way too complex".
//
// Runs on the EMPTY dashboard, before any search. That is what a new user
// actually sees, and it means the tour never depends on a job card existing —
// steps 4 and 5 describe what will appear rather than pointing at something
// that is not there yet. A tour whose target is missing renders in the corner
// with no highlight, which is worse than no tour.
//
// The CV step points at the button that opens the profile, not into the modal.
// Driving a tour through a dialog means every step after it depends on that
// dialog still being open, and one stray click breaks the rest.

const SEEN_KEY = 'easyclient.tour.seen';

const STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to EasyClient',
    content: "Thirty seconds and you'll know how this works. You can skip any time.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="search"]',
    title: 'Start here',
    content: 'Type the work you do, like "virtual assistant" or "bookkeeper". One search checks all three job sites and ranks what it finds.',
  },
  {
    target: '[data-tour="sources"]',
    title: 'Where we look',
    content: 'OnlineJobs.ph, LinkedIn and Upwork at the same time. Free accounts search OnlineJobs.ph.',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Add your CV',
    content: 'Upload your resume here as a PDF or Word file. Your cover letters then mention your real experience instead of generic praise.',
  },
  {
    target: '[data-tour="paste"]',
    title: 'Found a job somewhere else?',
    content: 'Paste any job post here, from a Facebook group or a friend, and get a cover letter written for that one too.',
  },
  {
    // No anchor: results, the cover-letter button and the applied/rejected
    // tabs only exist after a search, and a step pointing at a missing element
    // renders in the corner with no highlight -- worse than not showing it.
    target: 'body',
    placement: 'center',
    title: "What happens after you search",
    content: 'Jobs appear as they are found, best matches first. Each one gets a "Generate Cover Letter" button, and you can mark a job "I applied" or "Not for me" so it stops coming back.',
  },
];

export function markTourSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
}

export function hasSeenTour(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}

export default function Tour({ run, onFinish }: { run: boolean; onFinish: () => void }) {
  // Joyride measures the DOM on mount, so it must not render during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  function handle({ status }: CallBackProps) {
    // Skipping counts as seeing it. Somebody who dismissed a tour has said no,
    // and asking again next login is how a helpful thing becomes an annoying one.
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markTourSeen();
      onFinish();
    }
  }

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      callback={handle}
      locale={{ back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' }}
      floaterProps={{ disableAnimation: true }}
      styles={{
        options: {
          // Matches the app rather than the library's default light popup on a
          // dark dashboard, which reads as something else's UI.
          arrowColor: '#0d1117',
          backgroundColor: '#0d1117',
          overlayColor: 'rgba(0, 0, 0, 0.72)',
          primaryColor: '#2563eb',
          textColor: '#d1d5db',
          width: 320,
          zIndex: 60,
        },
        tooltip: { borderRadius: 16, padding: 18 },
        tooltipTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 },
        tooltipContent: { fontSize: 12.5, lineHeight: 1.6, padding: 0 },
        buttonNext: { borderRadius: 10, fontSize: 12, fontWeight: 500, padding: '8px 16px' },
        buttonBack: { color: '#9ca3af', fontSize: 12, marginRight: 8 },
        buttonSkip: { color: '#6b7280', fontSize: 12 },
        spotlight: { borderRadius: 12 },
      }}
    />
  );
}
