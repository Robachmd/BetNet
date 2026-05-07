import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiFilter, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import BookingCard from '../../components/booking/BookingCard';
import { bookingService } from '../../services/bookings';
import { ensureArray, getErrorMessage, listFromApi } from '../../utils/helpers';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'completed', label: 'Completed' },
];

export default function PropertyOwnerBookingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [bookings, setBookings] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingService.getPropertyOwnerBookings({ page_size: 200 });
      setBookings(listFromApi(data));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = ensureArray(bookings);
    if (status === 'all') return list;
    return list.filter((b) => String(b.status || '').toLowerCase() === status);
  }, [bookings, status]);

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="property_owner"
        activeKey="bookings"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0 w-full min-h-screen">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-800">Bookings</span>
          <button type="button" onClick={() => navigate('/dashboard/property-owner')} className="text-sm text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiCalendar className="w-6 h-6 text-green-700" /> Booking history
              </h1>
              <p className="text-sm text-gray-500 mt-1">All booking requests on your properties.</p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200"
              >
                <FiRefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading bookings..." />
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="booking"
              title="No bookings found"
              description="Bookings on your properties will appear here."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm p-4">
                  <BookingCard booking={booking} showActions={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

