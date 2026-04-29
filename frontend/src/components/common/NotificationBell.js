import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiCheck } from 'react-icons/fi';
import {
  getNotificationVisualMeta,
  isNotificationRead,
  notificationTimestamp,
} from '../../utils/notificationUi';

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onNotificationClick = () => {},
  onMarkAllRead = () => {},
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
              >
                <FiCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <FiBell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const read = isNotificationRead(notif);
                const { Icon, shortLabel, iconWrapClass } = getNotificationVisualMeta(notif);
                return (
                  <button
                    key={notif.id}
                    onClick={() => { onNotificationClick(notif); setIsOpen(false); }}
                    className={`flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !read ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        read ? 'bg-gray-100 text-gray-400' : `${iconWrapClass}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {shortLabel && (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                          {shortLabel}
                        </p>
                      )}
                      <p className={`text-sm ${!read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.message}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">{formatTime(notificationTimestamp(notif))}</p>
                    </div>
                    {!read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-center">
              <button className="text-sm font-medium text-green-600 hover:text-green-700">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
