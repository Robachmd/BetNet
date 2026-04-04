import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiHeart, FiCalendar, FiClock, FiStar, FiBell,
  FiChevronRight, FiMapPin, FiTrendingUp, FiHome,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import BookingCard from '../../components/booking/BookingCard';
import PropertyCard from '../../components/property/PropertyCard';
import ReviewCard from '../../components/review/ReviewCard';
import SearchBar from '../../components/common/SearchBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { bookingService } from '../../services/bookings';
import { propertyService } from '../../services/properties';
import { reviewService } from '../../services/reviews';
import { notificationService } from '../../services/notifications';
import {
  formatRelativeDate, listFromApi, mapFavoriteRowsToCards, normalizePropertyForCard,
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

export default function RenterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState({ upcoming: [], past: [] });
  const [favorites, setFavorites] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  const [loading, setLoading] = useState({
    bookings: true, favorites: true, recommended: true,
    reviews: true, notifications: true,
  });
  const [errors, setErrors] = useState({});

  const setLoadingKey = (key, val) => setLoading((p) => ({ ...p, [key]: val }));
  const setErrorKey = (key, val) => setErrors((p) => ({ ...p, [key]: val }));

  const loadBookings = useCallback(async () => {
    setLoadingKey('bookings', true);
    setErrorKey('bookings', null);
    try {
      const data = await bookingService.getMyBookings({ limit: 10 });
      const list = listFromApi(data);
      const now = new Date();
      setBookings({
        upcoming: list.filter((b) => new Date(b.date) >= now && b.status !== 'cancelled'),
        past: list.filter((b) => new Date(b.date) < now || b.status === 'completed'),
      });
    } catch {
      setErrorKey('bookings', true);
    } finally {
      setLoadingKey('bookings', false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoadingKey('favorites', true);
    setErrorKey('favorites', null);
    try {
      const data = await propertyService.getFavorites({ page_size: 6 });
      setFavorites(mapFavoriteRowsToCards(listFromApi(data)));
    } catch {
      setErrorKey('favorites', true);
    } finally {
      setLoadingKey('favorites', false);
    }
  }, []);

  const loadRecommended = useCallback(async () => {
    setLoadingKey('recommended', true);
    setErrorKey('recommended', null);
    try {
      const data = await propertyService.getFeaturedProperties();
      setRecommended(listFromApi(data).map(normalizePropertyForCard));
    } catch {
      setErrorKey('recommended', true);
    } finally {
      setLoadingKey('recommended', false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingKey('reviews', true);
    setErrorKey('reviews', null);
    try {
      const data = await reviewService.getMyReviews({ limit: 5 });
      setReviews(data.reviews || data.data || data || []);
    } catch {
      setErrorKey('reviews', true);
    } finally {
      setLoadingKey('reviews', false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingKey('notifications', true);
    setErrorKey('notifications', null);
    try {
      const data = await notificationService.getNotifications({ limit: 8 });
      setNotifications(data.notifications || data.data || data || []);
    } catch {
      setErrorKey('notifications', true);
    } finally {
      setLoadingKey('notifications', false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadFavorites();
    loadRecommended();
    loadReviews();
    loadNotifications();
    try {
      const stored = JSON.parse(localStorage.getItem('betrent_recent_searches') || '[]');
      setRecentSearches(stored.slice(0, 5));
    } catch { /* ignore */ }
  }, [loadBookings, loadFavorites, loadRecommended, loadReviews, loadNotifications]);

  const handleSearch = (query) => {
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('betrent_recent_searches', JSON.stringify(updated));
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/renter',
      favorites: '/favorites',
      messages: '/chat',
      profile: '/profile',
      search: '/search',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="landlord"
        activeKey="dashboard"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {greeting()}, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-gray-500">Here&apos;s what&apos;s happening with your rentals.</p>
          </div>

          {/* Quick Search */}
          <div className="mb-8">
            <SearchBar
              placeholder="Search properties by location, type..."
              recentSearches={recentSearches}
              onSearch={handleSearch}
              className="max-w-2xl"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: FiCalendar, label: 'Upcoming Visits', value: bookings.upcoming.length, color: 'text-blue-600 bg-blue-50' },
              { icon: FiHeart, label: 'Saved Properties', value: favorites.length, color: 'text-red-500 bg-red-50' },
              { icon: FiStar, label: 'My Reviews', value: reviews.length, color: 'text-yellow-600 bg-yellow-50' },
              { icon: FiBell, label: 'Notifications', value: notifications.filter((n) => !n.read).length, color: 'text-green-600 bg-green-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* My Bookings */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Bookings</h2>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
              >
                View All <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {loading.bookings ? (
              <LoadingSpinner text="Loading bookings..." />
            ) : errors.bookings ? (
              <ErrorSection title="bookings" onRetry={loadBookings} />
            ) : bookings.upcoming.length === 0 && bookings.past.length === 0 ? (
              <EmptyState
                icon="booking"
                title="No bookings yet"
                description="Start exploring properties and schedule visits."
                actionLabel="Browse Properties"
                onAction={() => navigate('/search')}
              />
            ) : (
              <div className="space-y-6">
                {bookings.upcoming.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FiClock className="w-4 h-4" /> Upcoming Visits
                    </h3>
                    <div className="space-y-3">
                      {bookings.upcoming.slice(0, 3).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={(id) => bookingService.cancelBooking(id).then(loadBookings)}
                          onContact={() => navigate('/chat')}
                          onViewProperty={(p) => navigate(`/property/${p.slug || p.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {bookings.past.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                      Past Visits
                    </h3>
                    <div className="space-y-3">
                      {bookings.past.slice(0, 2).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          showActions={false}
                          onViewProperty={(p) => navigate(`/property/${p.slug || p.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Favorites */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiHeart className="w-5 h-5 text-red-500" /> My Favorites
                </h2>
                <button
                  onClick={() => navigate('/favorites')}
                  className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
                >
                  View All <FiChevronRight className="w-4 h-4" />
                </button>
              </div>

              {loading.favorites ? (
                <LoadingSpinner />
              ) : errors.favorites ? (
                <ErrorSection title="favorites" onRetry={loadFavorites} />
              ) : favorites.length === 0 ? (
                <EmptyState
                  icon="property"
                  title="No favorites yet"
                  description="Save properties you like to find them easily later."
                  actionLabel="Explore Properties"
                  onAction={() => navigate('/search')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.slice(0, 4).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isFavorited
                      onFavoriteToggle={async ({ id, favoriteId, willBeFavorited }) => {
                        try {
                          if (willBeFavorited) await propertyService.addFavorite(id);
                          else if (favoriteId) await propertyService.removeFavorite(favoriteId);
                          await loadFavorites();
                        } catch {
                          setErrorKey('favorites', true);
                        }
                      }}
                      onClick={(p) => navigate(`/property/${p.slug || p.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notifications & Recent Searches */}
            <div className="space-y-6">
              {/* Notifications */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiBell className="w-5 h-5 text-green-600" /> Notifications
                </h3>
                {loading.notifications ? (
                  <LoadingSpinner size="sm" />
                ) : errors.notifications ? (
                  <ErrorSection title="notifications" onRetry={loadNotifications} />
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          notif.read ? 'bg-white' : 'bg-green-50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read ? 'bg-gray-300' : 'bg-green-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-2">{notif.message || notif.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(notif.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Searches */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiSearch className="w-5 h-5 text-gray-400" /> Recent Searches
                </h3>
                {recentSearches.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No recent searches</p>
                ) : (
                  <div className="space-y-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(term)}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
                      >
                        <FiClock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className="truncate">{term}</span>
                        <FiChevronRight className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Properties */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5 text-green-600" /> Recommended For You
              </h2>
              <button
                onClick={() => navigate('/search')}
                className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
              >
                See More <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {loading.recommended ? (
              <LoadingSpinner />
            ) : errors.recommended ? (
              <ErrorSection title="recommendations" onRetry={loadRecommended} />
            ) : recommended.length === 0 ? (
              <EmptyState icon="property" title="No recommendations yet" description="We'll suggest properties based on your activity." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommended.slice(0, 6).map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onFavoriteToggle={async ({ id, favoriteId, willBeFavorited }) => {
                      try {
                        if (willBeFavorited) await propertyService.addFavorite(id);
                        else if (favoriteId) await propertyService.removeFavorite(favoriteId);
                        await loadFavorites();
                      } catch {
                        setErrorKey('favorites', true);
                      }
                    }}
                    onClick={(p) => navigate(`/property/${p.slug || p.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* My Reviews */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiStar className="w-5 h-5 text-yellow-500" /> My Reviews
              </h2>
            </div>

            {loading.reviews ? (
              <LoadingSpinner />
            ) : errors.reviews ? (
              <ErrorSection title="reviews" onRetry={loadReviews} />
            ) : reviews.length === 0 ? (
              <EmptyState icon="default" title="No reviews yet" description="Share your experience after visiting a property." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.slice(0, 4).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
