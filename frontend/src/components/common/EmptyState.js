import React from 'react';
import { FiInbox, FiSearch, FiHome, FiCalendar, FiMessageSquare } from 'react-icons/fi';

const iconMap = {
  default: FiInbox,
  search: FiSearch,
  property: FiHome,
  booking: FiCalendar,
  chat: FiMessageSquare,
};

export default function EmptyState({
  icon = 'default',
  title = 'Nothing here yet',
  description = '',
  actionLabel = '',
  onAction = null,
  secondaryLabel = '',
  onSecondaryAction = null,
  className = '',
}) {
  const IconComponent = iconMap[icon] || iconMap.default;

  return (
    <div
      className={`relative flex flex-col items-center justify-center py-14 px-6 text-center overflow-hidden rounded-2xl border border-dashed border-gray-200/90 bg-gradient-to-b from-white via-gray-50/40 to-white ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(46, 125, 50, 0.08), transparent 55%)',
        }}
      />
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary-50 blur-xl opacity-90" aria-hidden />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-gray-100/80">
          <IconComponent className="h-10 w-10 text-primary-400" aria-hidden />
        </div>
      </div>
      <h3 className="relative font-display text-xl font-semibold tracking-tight text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="relative text-muted max-w-sm mb-8 mx-auto">{description}</p>
      )}
      {(actionLabel && onAction) || (secondaryLabel && onSecondaryAction) ? (
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="btn-primary px-6 py-2.5 text-sm shadow-sm"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-xl border-2 border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
