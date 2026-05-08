import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiUsers, FiMusic, FiSliders, FiChevronDown, FiX,
  FiCalendar, FiGrid, FiMap, FiSearch,
} from 'react-icons/fi';
import PropertyCard from '../components/property/PropertyCard';
import PropertyMap from '../components/property/PropertyMap';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { SkeletonCardGrid } from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import BookingCalendar from '../components/booking/BookingCalendar';
import Modal from '../components/common/Modal';
import propertyService from '../services/properties';
import bookingService from '../services/bookings';
import { HALL_AMENITIES, PAGINATION_DEFAULT } from '../utils/constants';
import { getErrorMessage, listFromApi } from '../utils/helpers';

const CAPACITY_RANGES = [
  { value: '', label: 'Any Capacity' },
  { value: '0-100', label: 'Up to 100 guests', min: 0, max: 100 },
  { value: '100-300', label: '100 - 300 guests', min: 100, max: 300 },
  { value: '300-500', label: '300 - 500 guests', min: 300, max: 500 },
  { value: '500-1000', label: '500 - 1,000 guests', min: 500, max: 1000 },
  { value: '1000+', label: '1,000+ guests', min: 1000, max: null },
];

const HALL_TYPES = [
  { value: '', label: 'All Hall Types' },
  { value: 'wedding', label: 'Wedding Hall' },
  { value: 'conference', label: 'Conference Hall' },
  { value: 'banquet', label: 'Banquet Hall' },
  { value: 'multipurpose', label: 'Multipurpose Hall' },
  { value: 'outdoor', label: 'Outdoor Venue' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'capacity_desc', label: 'Largest Capacity' },
  { value: 'popular', label: 'Most Popular' },
];

export default function HallRentalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  const [capacity, setCapacity] = useState(searchParams.get('capacity') || '');
  const [hallType, setHallType] = useState(searchParams.get('hallType') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarHallId, setCalendarHallId] = useState(null);
  const [calendarDates, setCalendarDates] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        propertyType: 'hall',
        sort: sortBy,
        page: currentPage,
        limit: PAGINATION_DEFAULT.limit,
      };
      if (capacity) {
        const range = CAPACITY_RANGES.find((r) => r.value === capacity);
        if (range) {
          if (range.min != null) filters.minCapacity = range.min;
          if (range.max != null) filters.maxCapacity = range.max;
        }
      }
      if (hallType) filters.hallType = hallType;
      if (minPrice) filters.minPrice = minPrice;
      if (maxPrice) filters.maxPrice = maxPrice;
      if (selectedAmenities.length > 0) filters.amenities = selectedAmenities;

      const data = await propertyService.getHallRentals(filters);
      setHalls(listFromApi(data));
      setTotalCount(data.count ?? data.total ?? data.totalCount ?? 0);
      setTotalPages(
        (data.total_pages ?? data.totalPages
          ?? Math.ceil((data.count || 0) / PAGINATION_DEFAULT.limit)) || 1,
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setHalls([]);
    } finally {
      setLoading(false);
    }
  }, [capacity, hallType, minPrice, maxPrice, selectedAmenities, sortBy, currentPage]);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  useEffect(() => {
    const params = {};
    if (capacity) params.capacity = capacity;
    if (hallType) params.hallType = hallType;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sortBy !== 'newest') params.sort = sortBy;
    if (currentPage > 1) params.page = String(currentPage);
    setSearchParams(params, { replace: true });
  }, [capacity, hallType, minPrice, maxPrice, sortBy, currentPage, setSearchParams]);

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setCapacity('');
    setHallType('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedAmenities([]);
    setCurrentPage(1);
  };

  const handleCheckAvailability = async (hallId) => {
    setCalendarHallId(hallId);
    setShowCalendar(true);
    setCalendarLoading(true);
    try {
      const data = await bookingService.getBookingAvailability(hallId);
      setCalendarDates(data.bookedDates || []);
    } catch {
      setCalendarDates([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  const activeFilterCount = [capacity, hallType, minPrice, maxPrice].filter(Boolean).length + selectedAmenities.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Event Halls & Venues
          </h1>
          <p className="text-purple-200 max-w-lg mx-auto mb-8">
            Find the perfect venue for weddings, conferences, birthdays, and more across Ethiopia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Wedding', 'Conference', 'Birthday', 'Corporate'].map((tag) => (
              <button
                key={tag}
                onClick={() => { setHallType(tag.toLowerCase()); setCurrentPage(1); }}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/20 transition-colors border border-white/10"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {totalCount} {totalCount === 1 ? 'Venue' : 'Venues'} Available
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-purple-300 transition-colors"
            >
              <FiSliders className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-purple-600 text-white text-xs font-bold rounded-full px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-purple-300 transition-colors"
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
                        onClick={() => { setSortBy(option.value); setShowSort(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === option.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
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
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2.5 transition-colors ${viewMode === 'map' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiMap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Filter Venues</h3>
              {activeFilterCount > 0 && (
                <button onClick={handleClearFilters} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                  <FiX className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Capacity</label>
                <select
                  value={capacity}
                  onChange={(e) => { setCapacity(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  {CAPACITY_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Hall Type</label>
                <select
                  value={hallType}
                  onChange={(e) => { setHallType(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  {HALL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Price (ETB)</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Price (ETB)</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {HALL_AMENITIES.map((amenity) => (
                  <button
                    key={amenity.value}
                    onClick={() => handleAmenityToggle(amenity.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedAmenities.includes(amenity.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {amenity.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm">
            {error}
            <button onClick={fetchHalls} className="ml-2 underline font-medium">Try again</button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <SkeletonCardGrid count={6} />
        ) : halls.length === 0 ? (
          <EmptyState
            icon="search"
            title="No venues found"
            description="Try adjusting your filters to find event halls."
            actionLabel="Clear Filters"
            onAction={handleClearFilters}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {halls.map((hall) => (
              <div key={hall.id} className="group relative">
                <PropertyCard
                  property={hall}
                  onClick={() => navigate(`/property/${hall.slug || hall.id}`)}
                />
                {/* Hall-specific overlay info */}
                <div className="absolute bottom-[140px] left-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hall.hallCapacity && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 rounded-lg">
                      <FiUsers className="w-3 h-3" /> {hall.hallCapacity}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCheckAvailability(hall.id); }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/90 backdrop-blur-sm text-xs font-medium text-white rounded-lg hover:bg-purple-700"
                  >
                    <FiCalendar className="w-3 h-3" /> Check Dates
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <PropertyMap
              properties={halls}
              onPropertyClick={(p) => navigate(`/property/${p.slug || p.id}`)}
              height="500px"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {halls.map((hall) => (
                <PropertyCard
                  key={hall.id}
                  property={hall}
                  onClick={() => navigate(`/property/${hall.slug || hall.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-10">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        )}
      </div>

      {/* Availability Calendar Modal */}
      <Modal
        isOpen={showCalendar}
        onClose={() => { setShowCalendar(false); setCalendarHallId(null); }}
        title="Check Availability"
        size="md"
      >
        {calendarLoading ? (
          <LoadingSpinner text="Loading availability..." />
        ) : (
          <div>
            <BookingCalendar bookedDates={calendarDates} />
            <div className="mt-4 text-center">
              <button
                onClick={() => { setShowCalendar(false); navigate(`/property/${calendarHallId}`); }}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
              >
                View Full Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
