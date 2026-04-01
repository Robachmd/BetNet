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
  className = '',
}) {
  const IconComponent = iconMap[icon] || iconMap.default;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
        <IconComponent className="w-10 h-10 text-green-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs mb-6">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
