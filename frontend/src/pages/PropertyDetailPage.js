import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiMapPin, FiShare2, FiFlag, FiPhone, FiMessageSquare, FiCalendar,
  FiChevronRight, FiCheck, FiClock, FiUsers, FiMusic, FiMaximize,
  FiHeart, FiArrowLeft, FiStar, FiHome,
} from 'react-icons/fi';
import PropertyImageGallery from '../components/property/PropertyImageGallery';
import AmenitiesList from '../components/property/AmenitiesList';
import PriceInsight from '../components/property/PriceInsight';
import BookingForm from '../components/booking/BookingForm';
import BookingCalendar from '../components/booking/BookingCalendar';
import RatingSummary from '../components/review/RatingSummary';
import ReviewCard from '../components/review/ReviewCard';
import PropertyCard from '../components/property/PropertyCard';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import useAuth from '../hooks/useAuth';
import propertyService from '../services/properties';
import reviewService from '../services/reviews';
import bookingService from '../services/bookings';
import { REPORT_REASONS } from '../utils/constants';
import {
  formatPrice, formatRelativeDate, getImageUrl, getAvatarUrl, getErrorMessage,
  getInitials, listFromApi,
} from '../utils/helpers';

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [priceInsight, setPriceInsight] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const isHall =
    property?.property_type === 'HALL_RENTAL' || property?.propertyType === 'hall';

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPropertyBySlug(slug);
      setProperty(data);
      setIsFavorited(data.is_favorited || data.isFavorited || false);
      setFavoriteId(data.favorite_id ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  useEffect(() => {
    if (!property) return;

    const propPk = property.id;
    const listingTypeEff = String(
      property.listing_type || property.listingType || 'rent',
    ).toLowerCase();

    reviewService.getPropertyReviews(propPk, { limit: 5 })
      .then((data) => setReviews(listFromApi(data)))
      .catch(() => {});

    reviewService.getReviewStats(propPk)
      .then((data) => setReviewStats(data))
      .catch(() => {});

    const sub = property.location?.sub_city || property.location?.subCity;
    const city = property.location?.city;
    const ptype = property.property_type || property.propertyType;
    if (sub && ptype && listingTypeEff !== 'sale') {
      propertyService.getPriceInsight(sub, city || 'Addis Ababa', ptype)
        .then((data) => setPriceInsight(data))
        .catch(() => {});
    }

    propertyService.getProperties({
      propertyType: (ptype || '').toLowerCase().replace('hall_rental', 'hall'),
      listingType: listingTypeEff || 'rent',
      city: city ? city.toLowerCase().replace(/\s+/g, '-') : '',
      limit: 8,
    })
      .then((data) => {
        const raw = data.results || data.properties || data || [];
        const list = raw.filter((p) => p.slug !== slug && p.id !== propPk);
        setSimilarProperties(list.slice(0, 4));
      })
      .catch(() => {});

    if (isHall) {
      bookingService.getBookingAvailability(propPk)
        .then((data) => setBookedDates(data.bookedDates || data.unavailable || []))
        .catch(() => {});
    }
  }, [property, slug, isHall]);

  const handleFavorite = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!property) return;
    try {
      if (isFavorited && favoriteId) {
        await propertyService.removeFavorite(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        await propertyService.addFavorite(property.id);
        setIsFavorited(true);
        const refreshed = await propertyService.getPropertyBySlug(slug);
        setFavoriteId(refreshed.favorite_id ?? null);
      }
    } catch {}
  };

  const handleBookingSubmit = async (formData) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!property) return;
    setBookingSubmitting(true);
    try {
      if (isHall) {
        await bookingService.createBooking({ propertyId: property.id, ...formData });
      } else {
        await bookingService.scheduleViewing({ propertyId: property.id, ...formData });
      }
      navigate(`/booking/confirmation?propertyId=${property.id}`);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    setReportSubmitting(true);
    try {
      await propertyService.reportProperty(property.id, {
        reason: reportReason,
        details: reportDetails,
      });
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.title, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text="Loading property details..." />;

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <FiHome className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Property Not Found</h1>
        <p className="text-gray-500 mb-6">{error || 'The property you are looking for does not exist.'}</p>
        <Link to="/search" className="px-6 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors">
          Browse Properties
        </Link>
      </div>
    );
  }

  const listingType = String(property.listing_type || property.listingType || 'rent').toLowerCase();
  const {
    title, description, images = [],
    location = {}, bedrooms, bathrooms, area, propertyType,
    isVerified, isFeatured, status, amenities = [],
    landlord = {}, createdAt,
    hallCapacity, soundSystem, hasStage, hasProjector, hasCatering,
  } = property;

  const price = Number(property.price ?? property.price_monthly ?? 0);
  const priceUnit = listingType === 'sale'
    ? 'Total price'
    : listingType === 'short_term'
      ? '/month (short-term)'
      : '/month';

  const locationStr = [location.subCity, location.city].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <FiArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <nav className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-green-700">Home</Link>
            <FiChevronRight className="w-3 h-3" />
            <Link to="/search" className="hover:text-green-700">Search</Link>
            <FiChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Share">
              <FiShare2 className="w-5 h-5" />
            </button>
            <button onClick={handleFavorite} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Favorite">
              <FiHeart className={`w-5 h-5 ${isFavorited ? 'fill-red-600 text-red-600' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Image Gallery */}
        <PropertyImageGallery
          images={images.map((img) => (typeof img === 'string' ? getImageUrl(img) : getImageUrl(img.url)))}
          alt={title}
          className="mb-6"
        />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Title & Price */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isFeatured && <Badge variant="featured" icon size="sm">Featured</Badge>}
                {isVerified && <Badge variant="verified" icon size="sm">Verified</Badge>}
                {listingType === 'sale' && (
                  <Badge variant="pending" size="sm" className="bg-amber-50 text-amber-900 border-amber-200">
                    For sale
                  </Badge>
                )}
                {listingType === 'short_term' && (
                  <Badge variant="neutral" size="sm" className="bg-sky-50 text-sky-800 border-sky-200">
                    Short-term
                  </Badge>
                )}
                {status && (
                  <Badge variant={status === 'available' ? 'success' : 'warning'} dot size="sm">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                )}
                <Badge variant="neutral" size="sm">
                  {propertyType?.charAt(0).toUpperCase() + propertyType?.slice(1)}
                </Badge>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>

              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <FiMapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{locationStr || 'Location not specified'}</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <span className="text-2xl md:text-3xl font-bold text-green-800">{formatPrice(price)}</span>
                  <span className="text-gray-400 text-sm ml-1">{priceUnit}</span>
                </div>
                {bedrooms != null && (
                  <span className="text-sm text-gray-500">{bedrooms} {bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</span>
                )}
                {bathrooms != null && (
                  <span className="text-sm text-gray-500">{bathrooms} {bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</span>
                )}
                {area && <span className="text-sm text-gray-500">{area} m²</span>}
              </div>

              {createdAt && (
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                  <FiClock className="w-3 h-3" /> Listed {formatRelativeDate(createdAt)}
                </p>
              )}
            </div>

            {/* Hall-Specific Details */}
            {isHall && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Hall Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {hallCapacity && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      <FiUsers className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="text-sm font-semibold text-gray-800">{hallCapacity} guests</p>
                      </div>
                    </div>
                  )}
                  {soundSystem && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <FiMusic className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Sound System</p>
                        <p className="text-sm font-semibold text-gray-800">Available</p>
                      </div>
                    </div>
                  )}
                  {hasStage && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                      <FiMaximize className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Stage</p>
                        <p className="text-sm font-semibold text-gray-800">Available</p>
                      </div>
                    </div>
                  )}
                  {hasProjector && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <FiMaximize className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Projector</p>
                        <p className="text-sm font-semibold text-gray-800">Available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Description</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Amenities</h2>
              <AmenitiesList
                available={amenities}
                columns={3}
              />
            </div>

            {/* Price Insight */}
            {priceInsight && (
              <PriceInsight
                price={price}
                averagePrice={priceInsight.averagePrice}
                minPrice={priceInsight.minPrice}
                maxPrice={priceInsight.maxPrice}
                areaName={location.subCity || locationStr}
              />
            )}

            {/* Hall Availability Calendar */}
            {isHall && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Availability Calendar</h2>
                <BookingCalendar bookedDates={bookedDates} />
              </div>
            )}

            {/* Reviews */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Reviews & Ratings</h2>
              {reviewStats && (
                <RatingSummary
                  averageRating={reviewStats.averageRating || 0}
                  totalReviews={reviewStats.totalReviews || 0}
                  distribution={reviewStats.distribution}
                />
              )}
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id || review._id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-400">
                  No reviews yet. Be the first to leave a review!
                </div>
              )}
            </div>

            {/* Report */}
            <div className="text-center">
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                <FiFlag className="w-4 h-4" />
                Report this listing
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-96 flex-shrink-0 space-y-6">
            <div className="lg:sticky lg:top-20">
              {/* Landlord Info */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Listed by</h3>
                <div className="flex items-center gap-4 mb-4">
                  {landlord.avatar ? (
                    <img src={getAvatarUrl(landlord.avatar)} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-lg font-bold">
                      {getInitials(landlord.name || 'L')}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{landlord.name || 'Landlord'}</p>
                    {landlord.rating > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <FiStar className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">{landlord.rating?.toFixed(1)}</span>
                        {landlord.reviewCount > 0 && (
                          <span className="text-xs text-gray-400">({landlord.reviewCount})</span>
                        )}
                      </div>
                    )}
                    {landlord.responseTime && (
                      <p className="text-xs text-gray-400 mt-0.5">Usually responds in {landlord.responseTime}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => isAuthenticated ? navigate(`/chat/${landlord.id || landlord._id}`) : navigate('/login')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors"
                  >
                    <FiMessageSquare className="w-4 h-4" />
                    Chat
                  </button>
                  {landlord.phone && (
                    <a
                      href={`tel:${landlord.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <FiPhone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                </div>
              </div>

              {/* Booking Form */}
              <BookingForm
                propertyType={isHall ? 'hall' : 'residential'}
                onSubmit={handleBookingSubmit}
                isSubmitting={bookingSubmitting}
              />
            </div>
          </aside>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Similar Properties</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similarProperties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onClick={(prop) => navigate(`/property/${prop.slug}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-lg font-bold text-green-800">{formatPrice(price)}</p>
          <p className="text-xs text-gray-400">{priceUnit}</p>
        </div>
        <button
          onClick={() => isAuthenticated ? navigate(`/chat/${landlord.id || landlord._id}`) : navigate('/login')}
          className="px-5 py-2.5 border border-green-700 text-green-700 text-sm font-medium rounded-xl hover:bg-green-50 transition-colors"
        >
          Contact
        </button>
        <button
          onClick={() => {
            const formSection = document.querySelector('form');
            formSection?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-5 py-2.5 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors"
        >
          {isHall ? 'Book Hall' : 'Book Visit'}
        </button>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Listing"
        footer={
          <>
            <button
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={!reportReason || reportSubmitting}
              className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {reportSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Why are you reporting this listing?</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason.value}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  reportReason === reason.value ? 'bg-red-50 border border-red-200' : 'border border-gray-100 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.value}
                  checked={reportReason === reason.value}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{reason.label}</span>
              </label>
            ))}
          </div>
          <textarea
            placeholder="Additional details (optional)..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          />
        </div>
      </Modal>
    </div>
  );
}
