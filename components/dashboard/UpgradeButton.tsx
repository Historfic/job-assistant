'use client';

import { BUY_URL } from '@/lib/tiers';

// The one route from "I want this" to "I paid". Without it, a customer who
// runs out of preview searches has to go hunt for the Facebook page themselves.
export default function UpgradeButton({ size = 'md', className = '' }: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sizing = size === 'sm'
    ? 'px-3 py-1.5 text-[11px] gap-1.5'
    : 'px-5 py-2.5 text-sm gap-2';

  return (
    <a
      href={BUY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-white transition-colors ${sizing} ${className}`}
    >
      <svg className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
      </svg>
      Get full access — ₱999
    </a>
  );
}
