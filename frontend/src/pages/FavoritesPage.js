import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiTrash2, FiGrid, FiList } from 'react-icons/fi';
import PropertyGrid from '../components/property/PropertyGrid';
import PropertyCard from '../components/property/PropertyCard';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import useAuth from '../hooks/useAuth';
import propertyService from '../services/properties';
import { formatPrice, getErrorMessage } from '../utils/helpers';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/favorites' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const data = await propertyService.getFavorites({ page: currentPage, limit: 12 });
      setFavorites(data.properties || data.results || data || []);
      setTotalCount(data.total || data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (propertyId) => {
    setRemovingId(propertyId);
    try {
      await propertyService.toggleFavorite(propertyId);
      setFavorites((prev) => prev.filter((p) => p.id !== propertyId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  const handlePropertyClick = (property) => {
    navigate(`/property/${property.id}`);
  };

  if (authLoading) return <LoadingSpinner fullScreen text="Loading..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FiHeart className="w-6 h-6 text-red-500" />
                Saved Properties
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {loading ? 'Loading...' : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} saved`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm">
            {error}
            <button onClick={fetchFavorites} className="ml-2 underline font-medium">Try again</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon="property"
            title="No saved properties"
            description="Start browsing and save properties you like by tapping the heart icon."
            actionLabel="Browse Properties"
            onAction={() => navigate('/search')}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {favorites.map((property) => (
                <div key={property.id} className="relative group">
                  <PropertyCard
                    property={property}
                    onClick={handlePropertyClick}
                    isFavorited
                    onFavoriteToggle={(id) => handleRemoveFavorite(id)}
                  />
                  {/* Remove overlay */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(property.id); }}
                    disabled={removingId === property.id}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg disabled:opacity-50"
                    aria-label="Remove from favorites"
                  >
                    {removingId === property.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiTrash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
