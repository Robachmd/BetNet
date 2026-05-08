import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBarChart2, FiEye, FiHome, FiCalendar, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookings';
import { paymentService } from '../../services/payments';
import { propertyService } from '../../services/properties';
import { formatPrice, getErrorMessage, listFromApi } from '../../utils/helpers';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function PropertyOwnerAnalyticsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalProperties: 0,
    liveProperties: 0,
    totalViews: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [propsData, bookData, earningsData] = await Promise.all([
        propertyService.getMyProperties({ limit: 200 }),
        bookingService.getPropertyOwnerBookings({ page_size: 200 }),
        paymentService.getPropertyOwnerEarnings({ period: 'month' }),
      ]);
      const propsList = listFromApi(propsData);
      const booksList = listFromApi(bookData);
      const monthlyRevenue = earningsData.total || earningsData.monthlyRevenue || 0;
      const totalViews = propsList.reduce((sum, p) => sum + (p.views || 0), 0);
      setStats({
        totalProperties: propsList.length,
        liveProperties: propsList.filter((p) => p.status === 'available' || p.status === 'active' || p.is_available === true).length,
        totalViews,
        pendingBookings: booksList.filter((b) => String(b.status || '').toLowerCase() === 'pending').length,
        monthlyRevenue,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(
    () => [
      { icon: FiHome, label: 'Total properties', value: stats.totalProperties, color: 'text-blue-600 bg-blue-50' },
      { icon: FiEye, label: 'Total views', value: stats.totalViews, color: 'text-purple-600 bg-purple-50' },
      { icon: FiCalendar, label: 'Pending bookings', value: stats.pendingBookings, color: 'text-orange-600 bg-orange-50' },
      { icon: FiDollarSign, label: 'Monthly revenue', value: formatPrice(stats.monthlyRevenue), color: 'text-emerald-600 bg-emerald-50' },
    ],
    [stats]
  );

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/property-owner',
      properties: '/dashboard/property-owner',
      'add-property': '/dashboard/property-owner/add-property',
      'listing-packages': '/dashboard/property-owner/listing-packages',
      bookings: '/dashboard/property-owner/bookings',
      availability: '/dashboard/property-owner/availability',
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
        activeKey="analytics"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0 w-full min-h-screen">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-800">Analytics</span>
          <button type="button" onClick={() => navigate('/dashboard/property-owner')} className="text-sm text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiBarChart2 className="w-6 h-6 text-green-700" /> Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-1">A quick look at how your listings are doing.</p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}

          {loading ? (
            <LoadingSpinner text="Loading analytics..." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cards.map((c) => (
                <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

