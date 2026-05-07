import { API_BASE_URL, UPLOADS_BASE_URL } from '../config/runtime';

export const APP_NAME = 'BetNet';
export const APP_TAGLINE = 'Your Home Away From Home';
export const DEFAULT_CURRENCY = 'ETB';
export const DEFAULT_LOCALE = 'en';

export const API_URL = API_BASE_URL;
export const UPLOADS_URL = UPLOADS_BASE_URL;

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment', labelAm: 'አፓርትመንት' },
  { value: 'house', label: 'House', labelAm: 'ቤት' },
  { value: 'villa', label: 'Villa', labelAm: 'ቪላ' },
  { value: 'studio', label: 'Studio', labelAm: 'ስቱዲዮ' },
  { value: 'condominium', label: 'Condominium', labelAm: 'ኮንዶሚኒየም' },
  { value: 'commercial', label: 'Commercial Space', labelAm: 'የንግድ ቦታ' },
  { value: 'office', label: 'Office', labelAm: 'ቢሮ' },
  { value: 'warehouse', label: 'Warehouse', labelAm: 'መጋዘን' },
  { value: 'hall', label: 'Hall Rental', labelAm: 'አዳራሽ ኪራይ' },
  { value: 'shop', label: 'Shop', labelAm: 'ሱቅ' },
];

export const LISTING_TYPES = [
  { value: 'rent', label: 'For Rent', labelAm: 'ለኪራይ' },
  { value: 'sale', label: 'For Sale', labelAm: 'ለሽያጭ' },
  { value: 'short_term', label: 'Short-term Rental', labelAm: 'ለአጭር ጊዜ ኪራይ' },
];

/** Mirrors backend `properties/ethiopian_cities.py` (ETHIOPIAN_CITIES_SEED), same order. */
const ETHIOPIAN_CITY_LABELS = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa', 'Bahir Dar', 'Jimma', 'Dessie',
  'Jijiga', 'Shashamane', 'Arba Minch', 'Hosaena', 'Harar', 'Kombolcha', 'Debre Berhan',
  'Asella', 'Adama', 'Nekemte', 'Debre Markos', 'Wolaita Sodo', 'Sodo', 'Mizan Teferi',
  'Gambela', 'Assosa', 'Semera', 'Bule Hora', 'Boditi', 'Woldiya', 'Debre Tabor', 'Aksum',
  'Adigrat', 'Bishoftu', 'Sebeta', 'Burayu', 'Holeta', 'Lalibela', 'Robe', 'Dilla',
  'Yirgalem', 'Welkite', 'Butajira', 'Ambo', 'Negele Borana', 'Moyale', 'Mega', 'Konso',
  'Turmi', 'Gode', 'Kelafo', 'Dembi Dollo', 'Bedele', 'Chiro', 'Fiche', 'Gimbi', 'Humera',
  'Injibara', 'Jinka', 'Kebri Dehar', 'Korem',
];

const CITY_LABEL_AM_OVERRIDES = {
  'Addis Ababa': 'አዲስ አበባ',
  'Dire Dawa': 'ድሬ ዳዋ',
  'Hawassa': 'ሀዋሳ',
  'Bahir Dar': 'ባህር ዳር',
  'Adama': 'አዳማ',
  'Mekelle': 'መቀሌ',
  'Gondar': 'ጎንደር',
  'Jimma': 'ጅማ',
  'Dessie': 'ደሴ',
  'Bishoftu': 'ቢሾፍቱ',
};

/**
 * Stable form/URL token for a canonical city display name (matches historical underscored slugs).
 * @param {string} name
 * @returns {string}
 */
export function cityNameToFormValue(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_|_$/g, '');
}

export const CITIES = ETHIOPIAN_CITY_LABELS.map((label) => ({
  value: cityNameToFormValue(label),
  label,
  labelAm: CITY_LABEL_AM_OVERRIDES[label] || label,
}));

export const ADDIS_ABABA_SUB_CITIES = [
  { value: 'bole', label: 'Bole', labelAm: 'ቦሌ' },
  { value: 'kirkos', label: 'Kirkos', labelAm: 'ቂርቆስ' },
  { value: 'arada', label: 'Arada', labelAm: 'አራዳ' },
  { value: 'yeka', label: 'Yeka', labelAm: 'የካ' },
  { value: 'gulele', label: 'Gulele', labelAm: 'ጉለሌ' },
  { value: 'addis_ketema', label: 'Addis Ketema', labelAm: 'አዲስ ከተማ' },
  { value: 'lideta', label: 'Lideta', labelAm: 'ልደታ' },
  { value: 'kolfe_keranio', label: 'Kolfe Keranio', labelAm: 'ኮልፌ ቀራንዮ' },
  { value: 'nifas_silk_lafto', label: 'Nifas Silk-Lafto', labelAm: 'ንፋስ ስልክ ላፍቶ' },
  { value: 'akaky_kaliti', label: 'Akaky Kaliti', labelAm: 'አቃቂ ቃሊቲ' },
  { value: 'lemi_kura', label: 'Lemi Kura', labelAm: 'ለሚ ኩራ' },
];

/** Resolve form select value (underscore slug) to API/store city name. */
export function cityApiLabelFromFormValue(formValue) {
  if (!formValue) return '';
  const c = CITIES.find((x) => x.value === formValue);
  return c ? c.label : formValue;
}

/** Map stored/API city name back to form `value` for controlled selects. */
export function cityFormValueFromApiLabel(apiCity) {
  if (!apiCity) return '';
  const s = String(apiCity).trim();
  const c = CITIES.find((x) => x.label === s || x.value === s);
  if (c) return c.value;
  return cityNameToFormValue(s);
}

/** Sub-city slug (underscore) to display string for Location.sub_city. */
export function addisSubCityApiLabelFromFormValue(formValue) {
  if (!formValue) return '';
  const sc = ADDIS_ABABA_SUB_CITIES.find((x) => x.value === formValue);
  return sc ? sc.label : formValue;
}

/** Stored sub_city string → form value for Addis. */
export function addisSubCityFormValueFromApiLabel(raw) {
  if (!raw) return '';
  const t = String(raw).trim();
  const sc = ADDIS_ABABA_SUB_CITIES.find((x) => x.label === t || x.value === t);
  return sc ? sc.value : t;
}

/** Search/UI filter tokens often use hyphens; CITIES uses underscores. */
export function cityFormValueToFilterKey(formValue) {
  if (!formValue) return '';
  return String(formValue).replace(/_/g, '-');
}

export function cityFilterKeyToFormValue(filterKey) {
  if (!filterKey) return '';
  return String(filterKey).replace(/-/g, '_');
}

export const AMENITIES = [
  { value: 'wifi', label: 'WiFi', icon: 'FiWifi' },
  { value: 'parking', label: 'Parking', icon: 'FiTruck' },
  { value: 'generator', label: 'Generator/Backup Power', icon: 'FiZap' },
  { value: 'water_tank', label: 'Water Tank', icon: 'FiDroplet' },
  { value: 'security', label: '24/7 Security', icon: 'FiShield' },
  { value: 'cctv', label: 'CCTV', icon: 'FiVideo' },
  { value: 'elevator', label: 'Elevator', icon: 'FiArrowUp' },
  { value: 'furnished', label: 'Furnished', icon: 'FiHome' },
  { value: 'balcony', label: 'Balcony', icon: 'FiSun' },
  { value: 'garden', label: 'Garden', icon: 'FiFeather' },
  { value: 'gym', label: 'Gym', icon: 'FiActivity' },
  { value: 'pool', label: 'Swimming Pool', icon: 'FiDroplet' },
  { value: 'laundry', label: 'Laundry', icon: 'FiWind' },
  { value: 'kitchen', label: 'Kitchen', icon: 'FiCoffee' },
  { value: 'hot_water', label: 'Hot Water', icon: 'FiThermometer' },
  { value: 'air_conditioning', label: 'Air Conditioning', icon: 'FiWind' },
  { value: 'satellite_tv', label: 'Satellite TV', icon: 'FiTv' },
  { value: 'playground', label: 'Playground', icon: 'FiSmile' },
  { value: 'pet_friendly', label: 'Pet Friendly', icon: 'FiHeart' },
];

export const HALL_AMENITIES = [
  { value: 'sound_system', label: 'Sound System' },
  { value: 'projector', label: 'Projector' },
  { value: 'stage', label: 'Stage' },
  { value: 'catering', label: 'Catering Available' },
  { value: 'decoration', label: 'Decoration Service' },
  { value: 'valet_parking', label: 'Valet Parking' },
  { value: 'bridal_suite', label: 'Bridal Suite' },
  { value: 'outdoor_space', label: 'Outdoor Space' },
  { value: 'dance_floor', label: 'Dance Floor' },
  { value: 'kitchen_facility', label: 'Kitchen Facility' },
];

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};

export const PAYMENT_METHODS = [
  { value: 'chapa', label: 'Chapa', icon: 'chapa' },
  { value: 'telebirr', label: 'Telebirr', icon: 'telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr', icon: 'cbe' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'bank' },
  { value: 'cash', label: 'Cash on Visit', icon: 'cash' },
];

export const USER_ROLES = {
  RENTER: 'renter',
  LANDLORD: 'landlord',
  ADMIN: 'admin',
};

export const REPORT_REASONS = [
  { value: 'fake_listing', label: 'Fake Listing' },
  { value: 'misleading_info', label: 'Misleading Information' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'scam', label: 'Suspected Scam' },
  { value: 'duplicate', label: 'Duplicate Listing' },
  { value: 'other', label: 'Other' },
];

export const PRICE_RANGES = [
  { value: '0-5000', label: 'Under 5,000 ETB', min: 0, max: 5000 },
  { value: '5000-10000', label: '5,000 - 10,000 ETB', min: 5000, max: 10000 },
  { value: '10000-20000', label: '10,000 - 20,000 ETB', min: 10000, max: 20000 },
  { value: '20000-50000', label: '20,000 - 50,000 ETB', min: 20000, max: 50000 },
  { value: '50000-100000', label: '50,000 - 100,000 ETB', min: 50000, max: 100000 },
  { value: '100000+', label: 'Above 100,000 ETB', min: 100000, max: Infinity },
];

export const BEDROOM_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedrooms' },
  { value: '3', label: '3 Bedrooms' },
  { value: '4', label: '4 Bedrooms' },
  { value: '5+', label: '5+ Bedrooms' },
];

export const ADDIS_ABABA_CENTER = { lat: 9.0192, lng: 38.7525 };

export const MAX_IMAGES_PER_PROPERTY = 10;
export const MAX_IMAGE_SIZE_MB = 5;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PAGINATION_DEFAULT = {
  page: 1,
  limit: 12,
};

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo', nativeLabel: 'Afaan Oromoo' },
];
