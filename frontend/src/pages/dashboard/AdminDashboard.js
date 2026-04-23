import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiHome, FiCheck, FiDollarSign, FiCalendar,
  FiTrendingUp, FiShield, FiBarChart2, FiChevronRight,
  FiAlertCircle, FiFileText, FiClock,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { propertyService } from '../../services/properties';
import { bookingService } from '../../services/bookings';
import { paymentService } from '../../services/payments';
import { formatPrice, formatRelativeDate } from '../../utils/helpers';
import api from '../../services/api';

function ErrorSection({ title, onRetry }) {
  return (
    <div className="bg-red-50 rounded-xl p-6 text-center">
      <p className="text-sm text-red-600 mb-2">Failed to load {title}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-red-700 hover:underline">Try again</button>
      )}
    </div>
  );
}

function CSSBarChart({ data, color = 'green' }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data</p>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const colors = { green: 'from-green-500 to-green-400', blue: 'from-blue-500 to-blue-400', purple: 'from-purple-500 to-purple-400' };
  return (
    <div className="flex items-end gap-1.5 h-40">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-medium truncate">{item.value}</span>
          <div
            className={`w-full bg-gradient-to-t ${colors[color] || colors.green} rounded-t transition-all duration-500 min-h-[2px]`}
            style={{ height: `${(item.value / maxVal) * 100}%` }}
          />
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function CSSDonutChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data</p>;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];

  let offset = 0;
  const segments = data.map((item, i) => {
    const pct = (item.value / total) * 100;
    const seg = { ...item, pct, offset, color: colors[i % colors.length] };
    offset += pct;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 flex-shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(${segments.map((s) => {
              const bgColor = s.color.replace('bg-', '').replace('-500', '');
              const colorMap = { green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', yellow: '#eab308', red: '#ef4444', indigo: '#6366f1', pink: '#ec4899', teal: '#14b8a6' };
              return `${colorMap[bgColor] || '#6b7280'} ${s.offset}% ${s.offset + s.pct}%`;
            }).join(', ')})`,
          }}
        />
        <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{total}</span>
        </div>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${seg.color} flex-shrink-0`} />
            <span className="text-gray-600 truncate flex-1">{seg.label}</span>
            <span className="text-gray-800 font-medium flex-shrink-0">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalUsers: 0, totalProperties: 0, verifiedProperties: 0,
    revenue: 0, activeBookings: 0,
  });
  const [usersTrend, setUsersTrend] = useState([]);
  const [listingsByType, setListingsByType] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let adminStats;
      try {
        const { data } = await api.get('/admin/dashboard');
        adminStats = data;
      } catch {
        adminStats = null;
      }

      if (adminStats) {
        setMetrics({
          totalUsers: adminStats.totalUsers || 0,
          totalProperties: adminStats.totalProperties || 0,
          verifiedProperties: adminStats.verifiedProperties || 0,
          revenue: adminStats.revenue || 0,
          activeBookings: adminStats.activeBookings || 0,
        });
        setUsersTrend(adminStats.usersTrend || []);
        setListingsByType(adminStats.listingsByType || []);
        setRevenueByMonth(adminStats.revenueByMonth || []);
        setRecentActivity(adminStats.recentActivity || []);
      } else {
        const [propsData, bookingsData] = await Promise.all([
          propertyService.getProperties({ limit: 1000 }),
          bookingService.getLandlordBookings({ limit: 100 }),
        ]);
        const props = propsData.properties || propsData.data || [];
        const books = bookingsData.bookings || bookingsData.data || [];

        setMetrics({
          totalUsers: 0,
          totalProperties: props.length,
          verifiedProperties: props.filter((p) => p.isVerified).length,
          revenue: 0,
          activeBookings: books.filter((b) => b.status === 'confirmed' || b.status === 'pending').length,
        });

        const typeMap = {};
        props.forEach((p) => {
          const t = p.propertyType || 'other';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        setListingsByType(Object.entries(typeMap).map(([label, value]) => ({ label, value })));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
  }, [isAdmin, navigate, loadDashboard]);

  const handleNavigation = (key) => {
    const routes = {
      'admin-dashboard': '/dashboard/admin',
      'admin-users': '/dashboard/admin/users',
      'admin-properties': '/dashboard/admin/listings',
      'admin-bookings': '/dashboard/admin',
      'admin-reviews': '/dashboard/admin',
      'admin-reports': '/dashboard/admin/analytics',
      'admin-moderation': '/dashboard/admin',
      'admin-settings': '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const metricCards = [
    { icon: FiUsers, label: 'Total Users', value: metrics.totalUsers, color: 'text-blue-600 bg-blue-50' },
    { icon: FiHome, label: 'Total Properties', value: metrics.totalProperties, color: 'text-green-600 bg-green-50' },
    { icon: FiCheck, label: 'Verified', value: metrics.verifiedProperties, color: 'text-emerald-600 bg-emerald-50' },
    { icon: FiDollarSign, label: 'Revenue', value: formatPrice(metrics.revenue), color: 'text-purple-600 bg-purple-50' },
    { icon: FiCalendar, label: 'Active Bookings', value: metrics.activeBookings, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="admin"
        activeKey="admin-dashboard"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 mt-1">Overview of the BetNet platform</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="verified" size="sm" icon>Admin</Badge>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          ) : error ? (
            <ErrorSection title="dashboard" onRetry={loadDashboard} />
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {metricCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">New Users (30 days)</h3>
                  <CSSBarChart data={usersTrend} color="blue" />
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Listings by Type</h3>
                  <CSSDonutChart data={listingsByType} />
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue by Month</h3>
                  <CSSBarChart data={revenueByMonth} color="green" />
                </div>
              </div>

              {/* Quick Actions & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { icon: FiShield, label: 'Verify Listings', desc: 'Review pending listings', onClick: () => navigate('/dashboard/admin/listings'), color: 'text-green-600 bg-green-50' },
                      { icon: FiUsers, label: 'Manage Users', desc: 'View and manage users', onClick: () => navigate('/dashboard/admin/users'), color: 'text-blue-600 bg-blue-50' },
                      { icon: FiBarChart2, label: 'View Reports', desc: 'Analytics and insights', onClick: () => navigate('/dashboard/admin/analytics'), color: 'text-purple-600 bg-purple-50' },
                      { icon: FiFileText, label: 'Content Moderation', desc: 'Review flagged content', onClick: () => {}, color: 'text-orange-600 bg-orange-50' },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{action.label}</p>
                          <p className="text-xs text-gray-400">{action.desc}</p>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No recent activity to display</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.slice(0, 10).map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'user' ? 'bg-blue-50 text-blue-500'
                            : activity.type === 'property' ? 'bg-green-50 text-green-500'
                            : activity.type === 'booking' ? 'bg-orange-50 text-orange-500'
                            : 'bg-gray-50 text-gray-500'
                          }`}>
                            {activity.type === 'user' ? <FiUsers className="w-4 h-4" />
                              : activity.type === 'property' ? <FiHome className="w-4 h-4" />
                              : activity.type === 'booking' ? <FiCalendar className="w-4 h-4" />
                              : <FiAlertCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{activity.message || activity.description}</p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {formatRelativeDate(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
