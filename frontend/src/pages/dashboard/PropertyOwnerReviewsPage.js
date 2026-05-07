import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ReviewCard from '../../components/review/ReviewCard';
import { reviewService } from '../../services/reviews';
import { ensureArray, getErrorMessage, listFromApi } from '../../utils/helpers';

export default function PropertyOwnerReviewsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reviewService.getReviewsForUser(user?.id, { page_size: 50 });
      setReviews(listFromApi(data));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const safe = useMemo(() => ensureArray(reviews), [reviews]);

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
        activeKey="reviews"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0 w-full min-h-screen">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-800">Reviews</span>
          <button type="button" onClick={() => navigate('/dashboard/property-owner')} className="text-sm text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiStar className="w-6 h-6 text-yellow-500" /> Reviews
              </h1>
              <p className="text-sm text-gray-500 mt-1">Feedback about you as a property owner.</p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading reviews..." />
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          ) : safe.length === 0 ? (
            <EmptyState icon="default" title="No reviews yet" description="Reviews will appear after renters leave feedback." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safe.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

