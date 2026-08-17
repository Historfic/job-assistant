'use client';

import Link from 'next/link';

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
    <Link
      href="/get-access"
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-white transition-colors ${sizing} ${className}`}
    >
      <svg className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5M21 7.5h-5a2.5 2.5 0 0 0 0 5h5v-5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Get full access — ₱999/mo
    </Link>
  );
}
