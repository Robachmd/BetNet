import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiGrid, FiMap, FiSliders, FiChevronDown } from 'react-icons/fi';
import PropertyFilters from '../components/property/PropertyFilters';
import PropertyGrid from '../components/property/PropertyGrid';
import PropertyMap from '../components/property/PropertyMap';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import propertyService from '../services/properties';
import { ADDIS_ABABA_SUB_CITIES, PAGINATION_DEFAULT } from '../utils/constants';
import {
  parseQueryString, buildQueryString, getErrorMessage, listFromApi,
} from '../utils/helpers';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
];

const LOCATION_SUGGESTIONS = ADDIS_ABABA_SUB_CITIES.map((sc) => ({
  label: sc.label,
  subtitle: 'Addis Ababa',
  value: sc.value,
}));

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialFilters = useMemo(() => {
    const parsed = parseQueryString(searchParams.toString());
    return {
      propertyType: parsed.propertyType || '',
      listingType: parsed.listingType || '',
      minPrice: parsed.minPrice || '',
      maxPrice: parsed.maxPrice || '',
      bedrooms: parsed.bedrooms || '',
      city: parsed.city || '',
      subCity: parsed.subCity || '',
      amenities: parsed.amenities ? (Array.isArray(parsed.amenities) ? parsed.amenities : [parsed.amenities]) : [],
      verifiedOnly: parsed.verifiedOnly === 'true',
    };
  }, [searchParams]);

  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [showSort, setShowSort] = useState(false);

  const syncUrlParams = useCallback((newFilters, newQuery, newSort, newPage) => {
    const params = { ...newFilters };
    if (newQuery) params.q = newQuery;
    if (newSort && newSort !== 'newest') params.sort = newSort;
    if (newPage > 1) params.page = String(newPage);
    if (params.amenities?.length === 0) delete params.amenities;
    if (!params.verifiedOnly) delete params.verifiedOnly;
    else params.verifiedOnly = 'true';

    Object.keys(params).forEach((key) => {
      if (!params[key] || params[key] === '') delete params[key];
    });

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiFilters = { ...filters, sort: sortBy, page: currentPage, limit: PAGINATION_DEFAULT.limit };
      if (query) apiFilters.q = query;

      const data = query
        ? await propertyService.searchProperties(query, apiFilters)
        : await propertyService.getProperties(apiFilters);

      setProperties(listFromApi(data));
      setTotalCount(data.count ?? data.total ?? data.totalCount ?? 0);
      setTotalPages(
        (data.total_pages ?? data.totalPages
          ?? Math.ceil((data.count || 0) / PAGINATION_DEFAULT.limit)) || 1,
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters, query, sortBy, currentPage]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    syncUrlParams(filters, query, sortBy, currentPage);
  }, [filters, query, sortBy, currentPage, syncUrlParams]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      propertyType: '', listingType: '', minPrice: '', maxPrice: '', bedrooms: '',
      city: '', subCity: '', amenities: [], verifiedOnly: false,
    });
    setQuery('');
    setCurrentPage(1);
  };

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setShowSort(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePropertyClick = (property) => {
    navigate(`/property/${property.slug || property.id}`);
  };

  const handleFavoriteToggle = async ({ id, favoriteId, willBeFavorited }) => {
    try {
      if (willBeFavorited) await propertyService.addFavorite(id);
      else if (favoriteId) await propertyService.removeFavorite(favoriteId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (willBeFavorited) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <SearchBar
              placeholder="Search location, property type..."
              suggestions={LOCATION_SUGGESTIONS}
              onSearch={handleSearch}
              onSuggestionSelect={(item) => handleSearch(item.label)}
              compact
              className="flex-1"
            />
            <PropertyFilters
              filters={filters}
              onChange={handleFiltersChange}
              onClear={handleClearFilters}
              className="lg:hidden"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <PropertyFilters
                filters={filters}
                onChange={handleFiltersChange}
                onClear={handleClearFilters}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {query ? `Results for "${query}"` : 'All Properties'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading ? 'Searching...' : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} found`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSort(!showSort)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-green-300 transition-colors"
                  >
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort'}
                    <FiChevronDown className={`w-4 h-4 transition-transform ${showSort ? 'rotate-180' : ''}`} />
                  </button>
                  {showSort && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleSortChange(option.value)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              sortBy === option.value
                                ? 'bg-green-50 text-green-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* View Toggle */}
                <div className="hidden md:flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 transition-colors ${
                      viewMode === 'grid' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    aria-label="Grid view"
                  >
                    <FiGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2.5 transition-colors ${
                      viewMode === 'map' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    aria-label="Map view"
                  >
                    <FiMap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm">
                {error}
                <button onClick={fetchProperties} className="ml-2 underline font-medium">
                  Try again
                </button>
              </div>
            )}

            {/* Results */}
            {viewMode === 'grid' ? (
              <PropertyGrid
                properties={properties}
                isLoading={loading}
                onPropertyClick={handlePropertyClick}
                onFavoriteToggle={handleFavoriteToggle}
                favoriteIds={favoriteIds}
                emptyTitle="No properties match your search"
                emptyDescription="Try adjusting your filters or searching a different area."
                emptyAction="Clear Filters"
                onEmptyAction={handleClearFilters}
              />
            ) : (
              <div className="space-y-6">
                <PropertyMap
                  properties={properties}
                  onPropertyClick={handlePropertyClick}
                  height="500px"
                  className="rounded-2xl shadow-sm"
                />
                <PropertyGrid
                  properties={properties}
                  isLoading={loading}
                  onPropertyClick={handlePropertyClick}
                  onFavoriteToggle={handleFavoriteToggle}
                  favoriteIds={favoriteIds}
                />
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
