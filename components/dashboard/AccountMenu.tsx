'use client';

import { useState } from 'react';
import type { MeResponse } from '@/types';
import UpgradeButton from '@/components/dashboard/UpgradeButton';

export default function AccountMenu({ me, avatar, onLogout, onConnectClick, onDisconnect, onProfileClick, onReplayTour }: {
  me: MeResponse;
  avatar: string;
  onLogout: () => void;
  onConnectClick: () => void;
  onDisconnect: () => void;
  onProfileClick: () => void;
  onReplayTour?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { user, ojConnection, limits } = me;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2">
        <img src={avatar} alt={user.email} className="w-7 h-7 rounded-full" />
        <span className={`hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap
          ${user.tier === 'pro' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
          {user.tier === 'pro' ? 'Full access' : 'Free preview'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-3 z-50 space-y-3">
          <div>
            <p className="text-xs font-medium text-white truncate">{user.email}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {limits.remainingToday >= 999
                ? 'Unlimited searches (demo)'
                : user.tier === 'pro'
                  ? `${limits.remainingToday} of ${limits.perDay} searches left today`
                  : `${limits.remainingToday} of ${limits.perDay} free preview searches left`}
            </p>
          </div>

          {user.tier === 'free' && (
            <div className="px-2.5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-[10px] text-yellow-200 mb-2">
                Unlock LinkedIn, Upwork and 20 searches a day.
              </p>
              <UpgradeButton size="sm" className="w-full" />
            </div>
          )}

          <div className="border-t border-gray-800 pt-2.5">
            <button
              onClick={() => { setOpen(false); onProfileClick(); }}
              className="w-full text-left text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Your experience — used to write your cover letters
            </button>

            <button
              onClick={() => { setOpen(false); onReplayTour?.(); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Show me around again
            </button>
          </div>

          <div className="border-t border-gray-800 pt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">OnlineJobs.ph</p>
            {ojConnection ? (
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${ojConnection.status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {ojConnection.status === 'active' ? '● Connected' : '● Session expired'}
                </span>
                {ojConnection.status === 'active' ? (
                  <button onClick={onDisconnect} className="text-[11px] text-gray-500 hover:text-red-400">Disconnect</button>
                ) : (
                  <button onClick={onConnectClick} className="text-[11px] text-blue-400 hover:text-blue-300">Reconnect</button>
                )}
              </div>
            ) : (
              <button onClick={onConnectClick} className="text-left text-[11px] text-blue-400 hover:text-blue-300">
                Connect account (optional) — unlocks personalized cover letters
              </button>
            )}
          </div>

          <div className="border-t border-gray-800 pt-2.5 flex items-center justify-between">
            <button onClick={onLogout} className="text-[11px] text-gray-500 hover:text-white">Sign out</button>
            {me.isAdmin && (
              <a href="/admin" className="text-[11px] text-blue-400 hover:text-blue-300">Customers</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
