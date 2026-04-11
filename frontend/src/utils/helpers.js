import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { UPLOADS_URL, DEFAULT_CURRENCY } from './constants';

export function formatPrice(amount, currency = DEFAULT_CURRENCY) {
  if (amount === null || amount === undefined) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';

  const formatted = new Intl.NumberFormat('en-ET', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return `${formatted} ${currency}`;
}

export function formatPriceShort(amount) {
  if (amount === null || amount === undefined) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M ETB`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K ETB`;
  }
  return `${num} ETB`;
}

export function formatDate(dateStr, pattern = 'MMM dd, yyyy') {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isValid(date) ? format(date, pattern) : '';
  } catch {
    return '';
  }
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '';
  } catch {
    return '';
  }
}

function mediaOrigin() {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  return base.replace(/\/?api\/?$/i, '') || 'http://localhost:8000';
}

export function listFromApi(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.properties && Array.isArray(data.properties)) return data.properties;
  if (data.bookings && Array.isArray(data.bookings)) return data.bookings;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

/** Favorite list API returns { results: [{ id, property, property_detail }] } */
export function mapFavoriteRowsToCards(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const detail = row.property_detail;
      if (!detail || typeof detail !== 'object') return null;
      return normalizePropertyForCard({
        ...detail,
        favorite_id: row.id,
        is_favorited: true,
      });
    })
    .filter(Boolean);
}

const BEDROOM_LABEL = {
  STUDIO: 'Studio',
  ONE: '1 bed',
  TWO: '2 beds',
  THREE_PLUS: '3+ beds',
};

const API_PROPERTY_TYPE_TO_FORM = {
  APARTMENT: 'apartment',
  SERVICE_HOUSE: 'house',
  VILLA: 'villa',
  CONDOMINIUM: 'condominium',
  BUSINESS_SHOP: 'shop',
  HALL_RENTAL: 'hall',
  REAL_ESTATE: 'office',
};

/** Map DRF `property_type` enum to Add/Edit Property form `<select>` values. */
export function propertyTypeFormFromApi(apiType) {
  if (apiType == null || apiType === '') return '';
  const key = String(apiType).toUpperCase();
  if (API_PROPERTY_TYPE_TO_FORM[key]) return API_PROPERTY_TYPE_TO_FORM[key];
  return String(apiType).toLowerCase();
}

/** True for hall / event space — hide bedrooms and bathrooms in forms. */
export function isHallPropertyType(propertyType) {
  if (propertyType == null || propertyType === '') return false;
  const u = String(propertyType).toUpperCase().replace(/[\s-]+/g, '_');
  if (u === 'HALL_RENTAL' || u === 'HALL') return true;
  return String(propertyType).toLowerCase() === 'hall';
}

export function normalizePropertyForCard(raw) {
  if (!raw) return {};
  const loc = raw.location || {};
  const ptRaw = (raw.property_type || raw.propertyType || '').toString();
  const ptLabel = ptRaw.replace(/_/g, ' ').toLowerCase();
  const listingType = String(raw.listing_type || raw.listingType || 'rent').toLowerCase();
  let priceUnit = '/month';
  if (listingType === 'sale') priceUnit = 'Total price';
  else if (listingType === 'short_term') priceUnit = '/month (short-term)';
  const img =
    raw.primary_image ||
    (raw.images && raw.images[0] && (raw.images[0].image || raw.images[0])) ||
    '';

  return {
    ...raw,
    id: raw.id,
    slug: raw.slug,
    favorite_id: raw.favorite_id,
    title: raw.title,
    images: Array.isArray(raw.images) && raw.images.length
      ? raw.images.map((x) => (typeof x === 'string' ? x : x.image || x.url)).filter(Boolean)
      : img
        ? [img]
        : [],
    price: Number(raw.price_monthly ?? raw.price ?? 0),
    listingType,
    priceUnit,
    location: {
      city: raw.city || loc.city,
      subCity: raw.sub_city || loc.sub_city,
    },
    bedrooms:
      raw.bedrooms in BEDROOM_LABEL ? BEDROOM_LABEL[raw.bedrooms] : Number(raw.bedrooms) || 0,
    bedroomsIsEnumLabel: !!BEDROOM_LABEL[raw.bedrooms],
    bathrooms: raw.bathrooms ?? 0,
    propertyType: ptLabel || 'property',
    isVerified: raw.is_verified ?? raw.isVerified,
    isFeatured: raw.is_featured ?? raw.isFeatured,
    isFavorited: raw.is_favorited ?? raw.isFavorited,
  };
}

export function getImageUrl(path) {
  if (!path) return '/placeholder-property.jpg';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${mediaOrigin()}${path}`;
  return `${UPLOADS_URL}/${path}`.replace(/([^:]\/)\/+/g, '$1');
}

export function getAvatarUrl(path) {
  if (!path) return '/default-avatar.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${mediaOrigin()}${path}`;
  return `${UPLOADS_URL}/${path}`.replace(/([^:]\/)\/+/g, '$1');
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('251') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('251') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+251${cleaned}`;
  }
  return phone;
}

export function validateEthiopianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const pattern = /^(?:251|0)?9\d{8}$/;
  return pattern.test(cleaned);
}

export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function buildQueryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, v));
      } else {
        query.append(key, String(value));
      }
    }
  });
  return query.toString();
}

export function parseQueryString(search) {
  const params = new URLSearchParams(search);
  const result = {};
  params.forEach((value, key) => {
    if (result[key]) {
      result[key] = Array.isArray(result[key])
        ? [...result[key], value]
        : [result[key], value];
    } else {
      result[key] = value;
    }
  });
  return result;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
}

export function generatePropertyTitle(property) {
  if (!property) return '';
  const { bedrooms, propertyType, subCity, city } = property;
  const parts = [];
  if (bedrooms) parts.push(`${bedrooms} Bedroom`);
  if (propertyType) parts.push(propertyType.charAt(0).toUpperCase() + propertyType.slice(1));
  if (subCity) parts.push(`in ${subCity}`);
  else if (city) parts.push(`in ${city}`);
  return parts.join(' ');
}

export function getPropertyStatusColor(status) {
  const colors = {
    available: 'bg-green-100 text-green-800',
    rented: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getBookingStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5 MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }
  return { valid: true, error: null };
}
