import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' });
}

export default function ChatList({
  conversations = [],
  activeId = null,
  onSelect = () => {},
  isLoading = false,
  className = '',
}) {
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  if (isLoading) {
    return (
      <div className={`divide-y divide-gray-100 ${className}`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-40" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (safeConversations.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <FiMessageSquare className="w-8 h-8 text-green-300" />
        </div>
        <h3 className="font-semibold text-gray-700 mb-1">No conversations</h3>
        <p className="text-sm text-gray-400 text-center">
          Start a conversation by contacting a property owner on a property listing.
        </p>
      </div>
    );
  }

  return (
    <div className={`divide-y divide-gray-50 ${className}`}>
      {safeConversations.map((conv) => {
        const isActive = conv.id === activeId;
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`flex items-center gap-3 w-full px-4 py-3.5 text-left transition-colors ${
              isActive ? 'bg-green-50' : 'hover:bg-gray-50'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {conv.avatar ? (
                <img src={conv.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-lg font-semibold">
                  {conv.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              {conv.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={`text-sm truncate ${conv.unread ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
                  {conv.name || 'Unknown'}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>

              {conv.propertyTitle && (
                <p className="text-xs text-green-600 truncate mb-0.5">
                  {conv.propertyTitle}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${conv.unread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {conv.lastMessage || 'No messages yet'}
                </p>
                {conv.unread > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center bg-green-600 text-white text-[11px] font-bold rounded-full px-1.5 flex-shrink-0">
                    {conv.unread > 99 ? '99+' : conv.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
