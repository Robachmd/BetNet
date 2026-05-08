import React from 'react';
import { FiMenu } from 'react-icons/fi';

export default function DashboardMobileHeader({ title, onOpenMenu, right = null }) {
  return (
    <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-100/90 bg-white/90 backdrop-blur-md px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2"
        aria-label="Open navigation menu"
      >
        <FiMenu className="h-5 w-5" />
      </button>
      <span className="font-display flex-1 text-center text-base font-bold tracking-tight text-gray-900 truncate">
        {title}
      </span>
      <div className="flex min-w-[2.5rem] items-center justify-end">{right}</div>
    </div>
  );
}
