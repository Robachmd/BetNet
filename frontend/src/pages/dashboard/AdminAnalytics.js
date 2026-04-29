import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiHome, FiDollarSign, FiTrendingUp, FiSearch,
  FiDownload, FiCalendar, FiArrowLeft, FiMapPin, FiBarChart2,
  FiEye,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatPrice, ensureArray } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

function CSSBarChart({ data, color = 'green', height = 'h-44' }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data available</p>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const colorMap = {
    green: 'from-green-500 to-green-400',
    blue: 'from-blue-500 to-blue-400',
    purple: 'from-purple-500 to-purple-400',
    orange: 'from-orange-500 to-orange-400',
  };
  return (
    <div className={`flex items-end gap-1.5 ${height}`}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center">{item.value}</span>
          <div
            className={`w-full bg-gradient-to-t ${colorMap[color] || colorMap.green} rounded-t transition-all duration-700 min-h-[2px]`}
            style={{ height: `${(item.value / maxVal) * 100}%` }}
          />
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ data, color = 'green' }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data available</p>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const colorMap = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 truncate mr-2">{item.label}</span>
            <span className="text-gray-800 font-medium flex-shrink-0">{item.value}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`${colorMap[color] || colorMap.green} h-2.5 rounded-full transition-all duration-700`}
              style={{ width: `${(item.value / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalProperties: 0, totalRevenue: 0, totalViews: 0 });
  const [usersOverTime, setUsersOverTime] = useState([]);
  const [listingsByCity, setListingsByCity] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [mostViewedAreas, setMostViewedAreas] = useState([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      let data;
      try {
        const resp = await api.get('/admin/analytics', { params });
        data = resp.data;
      } catch {
        data = {};
      }

      setStats({
        totalUsers: data.totalUsers || 0,
        totalProperties: data.totalProperties || 0,
        totalRevenue: data.totalRevenue || 0,
        totalViews: data.totalViews || 0,
      });
      setUsersOverTime(ensureArray(data.usersOverTime));
      setListingsByCity(ensureArray(data.listingsByCity));
      setRevenueBreakdown(ensureArray(data.revenueBreakdown));
      setPopularSearches(ensureArray(data.popularSearches));
      setMostViewedAreas(ensureArray(data.mostViewedAreas));
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadAnalytics();
  }, [isAdmin, navigate, loadAnalytics]);

  const handleExport = () => {
    toast.success('Export feature coming soon');
  };

  const handleNavigation = (key) => {
    const routes = {
      'admin-dashboard': '/dashboard/admin',
      'admin-users': '/dashboard/admin/users',
      'admin-properties': '/dashboard/admin/listings',
      'admin-reports': '/dashboard/admin/analytics',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const overviewCards = [
    { icon: FiUsers, label: 'Total Users', value: stats.totalUsers, color: 'text-blue-600 bg-blue-50', trend: '+12%' },
    { icon: FiHome, label: 'Total Properties', value: stats.totalProperties, color: 'text-green-600 bg-green-50', trend: '+8%' },
    { icon: FiDollarSign, label: 'Total Revenue', value: formatPrice(stats.totalRevenue), color: 'text-purple-600 bg-purple-50', trend: '+23%' },
    { icon: FiEye, label: 'Total Views', value: stats.totalViews, color: 'text-orange-600 bg-orange-50', trend: '+15%' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" activeKey="admin-reports" user={user} onNavigate={handleNavigation} onLogout={logout} />

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button onClick={() => navigate('/dashboard/admin')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Platform performance and insights</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              <FiDownload className="w-4 h-4" /> Export Data
            </button>
          </div>

          {/* Date Range Picker */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiCalendar className="w-4 h-4" /> Date Range:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div className="flex gap-2 sm:ml-auto">
                {['7d', '30d', '90d', '1y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
                      start.setDate(start.getDate() - days);
                      setDateRange({
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0],
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading analytics..." />
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {overviewCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {card.trend}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Users Over Time</h3>
                    <Badge variant="info" size="sm">Last 30 days</Badge>
                  </div>
                  <CSSBarChart data={usersOverTime} color="blue" />
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Revenue Breakdown</h3>
                    <Badge variant="success" size="sm">Monthly</Badge>
                  </div>
                  <CSSBarChart data={revenueBreakdown} color="green" />
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-green-500" /> Listings by City
                    </h3>
                  </div>
                  <HorizontalBarChart data={listingsByCity} color="green" />
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FiEye className="w-4 h-4 text-purple-500" /> Most Viewed Areas
                    </h3>
                  </div>
                  <HorizontalBarChart data={mostViewedAreas} color="purple" />
                </div>
              </div>

              {/* Popular Searches */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FiSearch className="w-4 h-4 text-orange-500" /> Popular Search Terms
                  </h3>
                </div>
                {popularSearches.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No search data available</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {popularSearches.map((term, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{term.label || term.term}</p>
                          <p className="text-xs text-gray-400">{term.value || term.count} searches</p>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{ width: `${((term.value || term.count) / (popularSearches[0]?.value || popularSearches[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
