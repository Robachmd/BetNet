import React from 'react';
import { FiCalendar, FiClock, FiMapPin, FiMessageSquare, FiX, FiExternalLink } from 'react-icons/fi';
import Badge from '../common/Badge';

const statusConfig = {
  pending: { variant: 'pending', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  completed: { variant: 'info', label: 'Completed' },
};

const formatETB = (price) =>
  new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(price);

export default function BookingCard({
  booking = {},
  onCancel = () => {},
  onContact = () => {},
  onViewProperty = () => {},
  showActions = true,
  className = '',
}) {
  const {
    id,
    property: propFromBooking = {},
    property_detail: propertyDetailRaw,
    date: dateField = '',
    visit_date: visitDateField = '',
    endDate = '',
    timeSlot = '',
    visit_time: visitTimeField = '',
    status = 'pending',
    createdAt = '',
    guestCount = 0,
    eventType = '',
  } = booking;

  const detail = propertyDetailRaw || booking.propertyDetail || {};
  const mergedFromDetail = Object.keys(detail).length
    ? {
      title: detail.title,
      image: detail.primary_image,
      price: detail.price_monthly,
      city: detail.city,
      subCity: detail.sub_city,
      slug: detail.slug,
      id: detail.id,
      listing_type: detail.listing_type,
    }
    : {};
  const property = { ...propFromBooking, ...mergedFromDetail };

  const date = dateField || visitDateField || '';
  const timeSlotEff = timeSlot || visitTimeField || '';

  const statusInfo = statusConfig[status] || statusConfig.pending;

  const lt = String(property.listing_type || property.listingType || 'rent').toLowerCase();
  const priceSuffix = lt === 'sale' ? 'Total price' : lt === 'short_term' ? '/month (short-term)' : '/month';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ET', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Property image */}
        {property.image && (
          <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-800 truncate mb-1">
                {property.title || 'Property'}
              </h3>
              {(property.subCity || property.city) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <FiMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {[property.subCity, property.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <Badge variant={statusInfo.variant} size="sm" dot>
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1.5">
              <FiCalendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(date)}</span>
              {endDate && endDate !== date && (
                <span> — {formatDate(endDate)}</span>
              )}
            </div>
            {timeSlotEff && (
              <div className="flex items-center gap-1.5">
                <FiClock className="w-4 h-4 text-gray-400" />
                <span>{timeSlotEff}</span>
              </div>
            )}
            {guestCount > 0 && (
              <span className="text-gray-500">{guestCount} guests</span>
            )}
            {eventType && (
              <Badge variant="neutral" size="sm">{eventType}</Badge>
            )}
          </div>

          {(property.price != null && property.price !== '') && (
            <p className="text-sm font-semibold text-green-700 mb-3">
              {formatETB(property.price)} ETB {property.priceUnit || priceSuffix}
            </p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-wrap">
              {(status === 'pending' || status === 'confirmed') && (
                <button
                  onClick={() => onCancel(id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </button>
              )}
              <button
                onClick={() => onContact(booking)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FiMessageSquare className="w-4 h-4" />
                Contact
              </button>
              <button
                onClick={() => onViewProperty(property)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                View Property
              </button>
            </div>
          )}
        </div>
      </div>

      {createdAt && (
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          Booked on {formatDate(createdAt.split('T')[0])}
        </div>
      )}
    </div>
  );
}
