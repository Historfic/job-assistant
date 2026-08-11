'use client';

import type { JobSource } from '@/types';
import UpgradeButton from '@/components/dashboard/UpgradeButton';

const SOURCES: Array<{ id: JobSource; label: string }> = [
  { id: 'onlinejobs', label: 'OnlineJobs.ph' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'upwork', label: 'Upwork' },
];

export default function SourceSelector({ selected, tier, onChange }: {
  selected: JobSource[];
  tier: 'free' | 'pro';
  onChange: (next: JobSource[]) => void;
}) {
  function toggle(id: JobSource, locked: boolean) {
    if (locked) return;
    const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
    if (next.length > 0) onChange(next); // at least one source stays selected
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map(({ id, label }) => {
          const locked = tier === 'free' && id !== 'onlinejobs';
          const active = selected.includes(id);
          return (
            <button
              key={id} type="button" onClick={() => toggle(id, locked)}
              title={locked ? 'Unlocks with full access' : undefined}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                ${locked
                  ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                  : active
                    ? 'bg-blue-600/15 text-blue-400 border-blue-600/40'
                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'}`}
            >
              {label}{locked && ' 🔒'}
            </button>
          );
        })}
      </div>
      {tier === 'free' && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-600 mb-1.5">
            LinkedIn and Upwork unlock with full access.
          </p>
          <UpgradeButton size="sm" className="w-full" />
        </div>
      )}
    </div>
  );
}
