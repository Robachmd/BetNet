import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { notificationService } from '../../services/notifications';
import { ensureArray, formatRelativeDate, getErrorMessage, listFromApi } from '../../utils/helpers';
import { getNotificationVisualMeta, isNotificationRead, notificationTimestamp } from '../../utils/notificationUi';

export default function PropertyOwnerNotificationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationService.getNotifications({ page_size: 50 });
      setNotifications(listFromApi(data));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const safe = useMemo(() => ensureArray(notifications), [notifications]);

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/property-owner',
      properties: '/dashboard/property-owner',
      'add-property': '/dashboard/property-owner/add-property',
      'listing-packages': '/dashboard/property-owner/listing-packages',
      bookings: '/dashboard/property-owner/bookings',
      reviews: '/dashboard/property-owner/reviews',
      analytics: '/dashboard/property-owner/analytics',
      notifications: '/dashboard/property-owner/notifications',
      messages: '/chat',
      settings: '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const markAllRead = async () => {
    setSaving(true);
    try {
      await notificationService.markAllAsRead();
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const markOneRead = async (id) => {
    setSaving(true);
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => ensureArray(prev).map((n) => (n.id === id ? { ...n, is_read: true, isRead: true } : n)));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="property_owner"
        activeKey="notifications"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0 w-full min-h-screen">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-800">Notifications</span>
          <button type="button" onClick={() => navigate('/dashboard/property-owner')} className="text-sm text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiBell className="w-6 h-6 text-green-700" /> Notifications
              </h1>
              <p className="text-sm text-gray-500 mt-1">Updates about bookings, listings, and messages.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200"
              >
                <FiRefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                <FiCheck className="w-4 h-4" /> Mark all read
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}

          {loading ? (
            <LoadingSpinner text="Loading notifications..." />
          ) : safe.length === 0 ? (
            <EmptyState icon="default" title="No notifications" description="You’re all caught up." />
          ) : (
            <div className="space-y-3">
              {safe.map((notif) => {
                const read = isNotificationRead(notif);
                const { Icon, shortLabel, iconWrapClass } = getNotificationVisualMeta(notif);
                const ts = notificationTimestamp(notif);
                return (
                  <div
                    key={notif.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 ${
                      read ? 'border-gray-100' : 'border-green-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrapClass}`} aria-hidden>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {shortLabel && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            {shortLabel}
                          </span>
                        )}
                        {!read && (
                          <span className="text-[10px] font-medium text-green-700">New</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 mt-1">{notif.message || notif.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {ts ? formatRelativeDate(ts) : ''}
                      </p>
                    </div>
                    {!read && (
                      <button
                        type="button"
                        onClick={() => markOneRead(notif.id)}
                        disabled={saving}
                        className="px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

