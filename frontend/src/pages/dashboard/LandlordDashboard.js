import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiHome, FiEye, FiCalendar, FiDollarSign, FiTrendingUp,
  FiPlusCircle, FiMessageSquare, FiBarChart2, FiChevronRight,
  FiCheck, FiX, FiClock, FiList, FiStar, FiInbox,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import BookingCard from '../../components/booking/BookingCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { propertyService } from '../../services/properties';
import { bookingService } from '../../services/bookings';
import { paymentService } from '../../services/payments';
import { chatService } from '../../services/chat';
import { getListingSlotSummary } from '../../services/listingPackages';
import {
  formatPrice, formatRelativeDate, getImageUrl, listFromApi, ensureArray, mapChatConversationRow,
} from '../../utils/helpers';

function ErrorSection({ title, onRetry }) {
  return (
    <div className="bg-red-50 rounded-xl p-6 text-center">
      <p className="text-sm text-red-600 mb-2">Failed to load {title}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-red-700 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No revenue data available</p>;
  }
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex items-end gap-2 h-48 px-2">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500 font-medium">
            {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(0)}K` : item.amount}
          </span>
          <div
            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-md transition-all duration-500 min-h-[4px]"
            style={{ height: `${(item.amount / maxVal) * 100}%` }}
          />
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function PropertyOwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    verifiedProperties: 0,
    totalViews: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
    remainingPackageSlots: 0,
  });
  const [pendingBookings, setPendingBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  const [loading, setLoading] = useState({
    stats: true, bookings: true, properties: true, messages: true, revenue: true,
  });
  const [errors, setErrors] = useState({});

  const setL = (k, v) => setLoading((p) => ({ ...p, [k]: v }));
  const setE = (k, v) => setErrors((p) => ({ ...p, [k]: v }));

  const loadStats = useCallback(async () => {
    setL('stats', true);
    setE('stats', null);
    try {
      const [propsData, bookData, earningsData, slotSummary] = await Promise.all([
        propertyService.getMyProperties({ limit: 100 }),
        bookingService.getPropertyOwnerBookings({ status: 'pending', limit: 100 }),
        paymentService.getPropertyOwnerEarnings({ period: 'month' }),
        getListingSlotSummary(),
      ]);
      const propsList = listFromApi(propsData);
      const booksList = listFromApi(bookData);
      const earnings = earningsData.total || earningsData.monthlyRevenue || 0;
      const totalViews = propsList.reduce((sum, p) => sum + (p.views || 0), 0);

      setStats({
        totalProperties: propsList.length,
        availableProperties: propsList.filter((p) => p.status === 'available' || p.status === 'active').length,
        verifiedProperties: propsList.filter((p) => Boolean(p.isVerified ?? p.is_verified)).length,
        totalViews,
        pendingBookings: booksList.length,
        monthlyRevenue: earnings,
        remainingPackageSlots: Number(slotSummary?.package_slots_remaining ?? 0),
      });
      setProperties(propsList);
      setPendingBookings(booksList);
    } catch {
      setE('stats', true);
    } finally {
      setL('stats', false);
      setL('bookings', false);
      setL('properties', false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setL('messages', true);
    setE('messages', null);
    try {
      const data = await chatService.getConversations({ limit: 5 });
      const convs = listFromApi(data).map((c) => mapChatConversationRow(c)).filter(Boolean);
      setRecentMessages(convs);
      const unread = await chatService.getUnreadCount();
      setUnreadMessages(unread.count || unread || 0);
    } catch {
      setE('messages', true);
    } finally {
      setL('messages', false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    setL('revenue', true);
    setE('revenue', null);
    try {
      const data = await paymentService.getPropertyOwnerEarnings({ period: 'year' });
      const monthly = Array.isArray(data?.monthly) ? data.monthly : listFromApi(data);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthly.length > 0) {
        setRevenueData(monthly.map((m, i) => ({
          label: m.month || months[i] || `M${i + 1}`,
          amount: m.amount || m.total || 0,
        })));
      } else {
        const now = new Date();
        setRevenueData(
          Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            return { label: months[d.getMonth()], amount: 0 };
          })
        );
      }
    } catch {
      setE('revenue', true);
    } finally {
      setL('revenue', false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadMessages();
    loadRevenue();
  }, [loadStats, loadMessages, loadRevenue]);

  const handleBookingAction = async (id, status) => {
    try {
      await bookingService.updateBookingStatus(id, status);
      loadStats();
    } catch { /* handled in UI */ }
  };

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/property-owner',
      properties: '/dashboard/property-owner',
      'add-property': '/dashboard/property-owner/add-property',
      bookings: '/dashboard/property-owner',
      messages: '/chat',
      reviews: '/dashboard/property-owner',
      analytics: '/dashboard/property-owner',
      notifications: '/dashboard/property-owner',
      settings: '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const primaryStatCards = [
    { icon: FiHome, label: 'Total Properties', value: stats.totalProperties, color: 'text-blue-600 bg-blue-50' },
    { icon: FiList, label: 'Available', value: stats.availableProperties, color: 'text-green-600 bg-green-50' },
    { icon: FiCheck, label: 'Verified', value: stats.verifiedProperties, color: 'text-teal-600 bg-teal-50' },
    { icon: FiEye, label: 'Total Views', value: stats.totalViews, color: 'text-purple-600 bg-purple-50' },
    { icon: FiStar, label: 'Remaining listing package', value: stats.remainingPackageSlots, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const secondaryStatCards = [
    { icon: FiCalendar, label: 'Pending Bookings', value: stats.pendingBookings, color: 'text-orange-600 bg-orange-50' },
    { icon: FiDollarSign, label: 'Monthly Revenue', value: formatPrice(stats.monthlyRevenue), color: 'text-emerald-600 bg-emerald-50' },
  ];
  const safePendingBookings = ensureArray(pendingBookings);
  const safeRecentMessages = ensureArray(recentMessages);
  const safeProperties = ensureArray(properties);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="property_owner"
        activeKey="dashboard"
        user={user}
        unreadMessages={unreadMessages}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Property Owner Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'Property Owner'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard/property-owner/add-property')}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors"
              >
                <FiPlusCircle className="w-4 h-4" /> Add Property
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {loading.stats ? (
            <LoadingSpinner text="Loading dashboard..." />
          ) : errors.stats ? (
            <ErrorSection title="dashboard stats" onRetry={loadStats} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {primaryStatCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {secondaryStatCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: FiPlusCircle, label: 'Add New Property', desc: 'List a new rental property', onClick: () => navigate('/dashboard/property-owner/add-property'), color: 'bg-green-700 hover:bg-green-800' },
              {
                icon: FiInbox,
                label: 'View Inquiries',
                desc: 'Check pending booking requests',
                onClick: () =>
                  document.getElementById('pending-bookings-section')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  }),
                color: 'bg-blue-600 hover:bg-blue-700',
              },
              {
                icon: FiBarChart2,
                label: 'View Analytics',
                desc: 'See property performance',
                onClick: () =>
                  document.getElementById('owner-performance-section')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  }),
                color: 'bg-purple-600 hover:bg-purple-700',
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`${action.color} text-white rounded-xl p-5 text-left transition-colors`}
              >
                <action.icon className="w-6 h-6 mb-3" />
                <p className="font-semibold">{action.label}</p>
                <p className="text-sm text-white/70 mt-1">{action.desc}</p>
              </button>
            ))}
          </div>

          <div id="dashboard-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Pending Bookings */}
            <div id="pending-bookings-section" className="lg:col-span-2 scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pending Bookings</h2>
                <Badge variant="pending" size="sm">{safePendingBookings.length} pending</Badge>
              </div>

              {loading.bookings ? (
                <LoadingSpinner />
              ) : safePendingBookings.length === 0 ? (
                <EmptyState icon="booking" title="No pending bookings" description="New booking requests will appear here." />
              ) : (
                <div className="space-y-3">
                  {safePendingBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="bg-white rounded-xl shadow-sm p-4">
                      <BookingCard booking={booking} showActions={false} />
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleBookingAction(booking.id, 'confirmed')}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
                        >
                          <FiCheck className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, 'rejected')}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <FiX className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => navigate('/chat')}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
                        >
                          <FiMessageSquare className="w-4 h-4" /> Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages & Subscription */}
            <div className="space-y-6">
              {/* Recent Messages */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Recent Messages</h3>
                  <button
                    onClick={() => navigate('/chat')}
                    className="text-sm text-green-700 hover:text-green-800 font-medium"
                  >
                    View All
                  </button>
                </div>
                {loading.messages ? (
                  <LoadingSpinner size="sm" />
                ) : errors.messages ? (
                  <ErrorSection title="messages" onRetry={loadMessages} />
                ) : safeRecentMessages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {safeRecentMessages.slice(0, 4).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => navigate(`/chat/${conv.id}`)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {conv.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{conv.name || 'User'}</p>
                          <p className="text-xs text-gray-400 truncate">{conv.lastMessage || 'No messages'}</p>
                        </div>
                        {conv.unread > 0 && (
                          <span className="min-w-[20px] h-5 flex items-center justify-center bg-green-600 text-white text-[11px] font-bold rounded-full px-1.5">
                            {conv.unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subscription Status */}
              <div className="bg-gradient-to-br from-green-700 to-green-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <FiStar className="w-5 h-5" />
                  <h3 className="font-semibold">Subscription</h3>
                </div>
                <p className="text-sm text-green-100 mb-4">
                  {user?.subscription?.plan ? `${user.subscription.plan} Plan` : 'Free Plan'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-200">
                    {user?.subscription?.expiresAt
                      ? `Expires ${formatRelativeDate(user.subscription.expiresAt)}`
                      : 'Upgrade for more features'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/property-owner/listing-packages')}
                  className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  {user?.subscription?.plan ? 'Manage Plan' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          </div>

          {/* Revenue Chart & Property Performance */}
          <div id="owner-performance-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 scroll-mt-24">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
                <Badge variant="success" size="sm" icon>This Year</Badge>
              </div>
              {loading.revenue ? (
                <LoadingSpinner />
              ) : errors.revenue ? (
                <ErrorSection title="revenue" onRetry={loadRevenue} />
              ) : (
                <RevenueChart data={revenueData} />
              )}
            </div>

            {/* Property Performance */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Property Performance</h2>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('owner-performance-section')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }
                  className="text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  View All
                </button>
              </div>
              {loading.properties ? (
                <LoadingSpinner />
              ) : safeProperties.length === 0 ? (
                <EmptyState
                  icon="property"
                  title="No properties"
                  description="Add your first property to start tracking."
                  actionLabel="Add Property"
                  onAction={() => navigate('/dashboard/property-owner/add-property')}
                />
              ) : (
                <div className="space-y-3">
                  {safeProperties.slice(0, 5).map((property) => {
                    const lt = String(property.listing_type || property.listingType || 'rent').toLowerCase();
                    const priceTail = lt === 'sale' ? ' Total price' : lt === 'short_term' ? '/month (short-term)' : '/month';
                    return (
                    <div
                      key={property.id}
                      onClick={() => navigate(`/property/${property.slug || property.id}`)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <img
                        src={getImageUrl(property.images?.[0])}
                        alt={property.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{property.title}</p>
                        <p className="text-xs text-gray-400">{formatPrice(property.price)}{priceTail}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <FiEye className="w-3.5 h-3.5" /> {property.views || 0}
                        </div>
                        <p className="text-xs text-gray-400">{property.inquiries || 0} inquiries</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Listing Management Shortcuts */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Listings</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Property</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Views</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {safeProperties.slice(0, 8).map((property) => (
                      <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getImageUrl(property.images?.[0])}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                            <span className="font-medium text-gray-800 truncate max-w-[200px]">{property.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <Badge variant={property.status === 'available' ? 'success' : 'neutral'} size="sm" dot>
                            {property.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{property.views || 0}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => navigate(`/dashboard/property-owner/edit-property/${property.slug || property.id}`)}
                            className="text-green-700 hover:text-green-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
