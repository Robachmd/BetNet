import api from './api';
import {
  CITIES,
  ADDIS_ABABA_SUB_CITIES,
  cityFilterKeyToFormValue,
  cityFormValueToFilterKey,
} from '../utils/constants';

const BASE = '/properties';

function slugToTitle(s) {
  if (!s) return '';
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function resolveCityForApiQuery(cityParam) {
  if (!cityParam) return '';
  const s = String(cityParam).trim();
  const byLabel = CITIES.find(
    (c) => c.label.toLowerCase() === s.toLowerCase()
  );
  if (byLabel) return byLabel.label;
  const asUnderscore = cityFilterKeyToFormValue(s);
  const byValue = CITIES.find((c) => c.value === asUnderscore);
  if (byValue) return byValue.label;
  return slugToTitle(s.replace(/_/g, '-'));
}

function resolveSubCityForApiQuery(subParam) {
  if (!subParam) return '';
  const s = String(subParam).trim();
  const asUnderscore = cityFilterKeyToFormValue(s);
  const sc = ADDIS_ABABA_SUB_CITIES.find(
    (x) => x.value === asUnderscore
      || cityFormValueToFilterKey(x.value) === s
      || x.value === s
  );
  if (sc) return sc.label;
  return slugToTitle(s.replace(/_/g, '-'));
}

function mapFrontendFilters(f = {}) {
  const q = {};
  const pageSize = f.page_size || f.limit || 48;
  q.page_size = pageSize;

  if (f.q || f.search) q.search = f.q || f.search;

  const pt = (f.propertyType || '').toLowerCase();
  if (pt === 'studio') {
    q.bedrooms = 'STUDIO';
  } else {
    const typeMap = {
      apartment: 'APARTMENT',
      villa: 'VILLA',
      house: 'SERVICE_HOUSE',
      condominium: 'CONDOMINIUM',
      commercial: 'BUSINESS_SHOP',
      hall: 'HALL_RENTAL',
    };
    if (pt && typeMap[pt]) q.property_type = typeMap[pt];
  }

  if (f.minPrice) q.price_min = f.minPrice;
  if (f.maxPrice) q.price_max = f.maxPrice;

  if (f.city) q.city = resolveCityForApiQuery(f.city);
  if (f.subCity) q.sub_city = resolveSubCityForApiQuery(f.subCity);

  if (f.bedrooms && pt !== 'studio') {
    const bMap = {
      1: 'ONE',
      2: 'TWO',
      3: 'THREE_PLUS',
      4: 'THREE_PLUS',
      '5+': 'THREE_PLUS',
    };
    const key = String(f.bedrooms);
    if (bMap[key]) q.bedrooms = bMap[key];
  }

  if (f.verifiedOnly === true || f.is_verified === true) q.is_verified = 'true';

  const lt = (f.listingType || f.listing_type || '').toString().toLowerCase();
  if (lt === 'rent' || lt === 'sale' || lt === 'short_term') {
    q.listing_type = lt;
  }

  if (f.sort === 'newest') q.ordering = '-created_at';
  if (f.sort === 'price_asc') q.ordering = 'price_monthly';
  if (f.sort === 'price_desc') q.ordering = '-price_monthly';
  if (f.page) q.page = f.page;

  const datePosted = (f.datePosted || '').toString().toLowerCase();
  if (f.created_after) q.created_after = f.created_after;
  if (f.created_before) q.created_before = f.created_before;
  if (datePosted) {
    const today = new Date();
    const asIso = (d) => d.toISOString().slice(0, 10);
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const t0 = startOf(today);
    if (datePosted === 'today') {
      q.created_after = asIso(t0);
    } else if (datePosted === 'yesterday') {
      const y = new Date(t0);
      y.setDate(y.getDate() - 1);
      q.created_after = asIso(y);
      q.created_before = asIso(y);
    } else if (datePosted === 'last7' || datePosted === '7d') {
      const d = new Date(t0);
      d.setDate(d.getDate() - 7);
      q.created_after = asIso(d);
    } else if (datePosted === 'last30' || datePosted === '30d') {
      const d = new Date(t0);
      d.setDate(d.getDate() - 30);
      q.created_after = asIso(d);
    }
  }

  return q;
}

function buildParams(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    p.append(k, String(v));
  });
  return p.toString();
}

export const propertyService = {
  async getProperties(filters = {}) {
    const qs = buildParams(mapFrontendFilters(filters));
    const { data } = await api.get(`${BASE}/properties/?${qs}`);
    return data;
  },

  async searchProperties(query, filters = {}) {
    return propertyService.getProperties({ ...filters, q: query });
  },

  async getPropertyBySlug(slug) {
    const { data } = await api.get(`${BASE}/properties/${slug}/`);
    return data;
  },

  getPropertyById(slugOrId) {
    return propertyService.getPropertyBySlug(slugOrId);
  },

  async createProperty(propertyData) {
    // Accept legacy UI payloads (camelCase, simplified fields) and normalize to DRF schema.
    // Backend expects: property_type, price_monthly, area_sqm, location.{specific_location,maps_url}, amenities object.
    const raw = propertyData && typeof propertyData === 'object' ? propertyData : {};

    const alreadyDjangoShape = !!raw.property_type && !!raw.price_monthly && !!raw.location && !!raw.amenities;
    if (alreadyDjangoShape) {
      const { data } = await api.post(`${BASE}/properties/`, raw);
      return data;
    }

    const asNum = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const normalizeBedroomEnum = (v) => {
      if (v === null || v === undefined || v === '') return '';
      const s = String(v).trim().toUpperCase();
      if (s === 'STUDIO') return 'STUDIO';
      if (s === 'ONE') return 'ONE';
      if (s === 'TWO') return 'TWO';
      if (s === 'THREE_PLUS') return 'THREE_PLUS';
      const n = asNum(v);
      if (n === null) return '';
      if (n <= 0) return 'STUDIO';
      if (n === 1) return 'ONE';
      if (n === 2) return 'TWO';
      return 'THREE_PLUS';
    };

    const normalizePropertyTypeEnum = (v) => {
      const s = String(v || '').trim().toLowerCase();
      const map = {
        apartment: 'APARTMENT',
        villa: 'VILLA',
        house: 'SERVICE_HOUSE',
        condominium: 'CONDOMINIUM',
        shop: 'BUSINESS_SHOP',
        commercial: 'BUSINESS_SHOP',
        office: 'REAL_ESTATE',
        warehouse: 'REAL_ESTATE',
        hall: 'HALL_RENTAL',
        hall_rental: 'HALL_RENTAL',
      };
      if (s && map[s]) return map[s];
      // If UI somehow passed an already-correct enum.
      const up = String(v || '').trim().toUpperCase();
      const ok = new Set([
        'APARTMENT',
        'VILLA',
        'SERVICE_HOUSE',
        'CONDOMINIUM',
        'REAL_ESTATE',
        'BUSINESS_SHOP',
        'HALL_RENTAL',
      ]);
      return ok.has(up) ? up : '';
    };

    const normalizeAmenities = (amenitiesValue) => {
      // UI uses string[] (wifi, parking...). Backend expects an object (AmenitiesSerializer).
      const list = Array.isArray(amenitiesValue) ? amenitiesValue : [];
      const has = (key) => list.includes(key);
      return {
        water_availability: 'SOMETIMES',
        electricity_stability: 'MODERATE',
        has_wifi: has('wifi'),
        has_parking: has('parking'),
        has_security: has('security'),
        has_generator: has('generator'),
        is_furnished: has('furnished'),
        has_elevator: has('elevator'),
        has_balcony: has('balcony'),
        has_garden: has('garden'),
        has_cctv: has('cctv'),
        pets_allowed: has('pet_friendly'),
      };
    };

    const normalizeHallDetail = (hallDetails, hallAmenities) => {
      if (!hallDetails || typeof hallDetails !== 'object') return null;
      const list = Array.isArray(hallAmenities) ? hallAmenities : [];
      const has = (k) => list.includes(k);
      const cap = asNum(hallDetails.capacity);
      const ph = asNum(hallDetails.hourlyRate ?? hallDetails.pricePerHour ?? hallDetails.price_per_hour);
      const pd = asNum(hallDetails.dailyRate ?? hallDetails.pricePerDay ?? hallDetails.price_per_day);
      // Keep required `capacity` for hall rental; let backend validate if missing.
      return {
        capacity: cap == null ? 0 : Math.max(0, Math.trunc(cap)),
        price_per_hour: ph == null ? null : ph,
        price_per_day: pd == null ? null : pd,
        has_sound_system: has('sound_system'),
        has_stage: has('stage'),
        decoration_allowed: has('decoration'),
        catering_available: has('catering'),
        is_indoor: has('indoor') ? true : true, // default indoor true (UI doesn't capture well)
        hall_type: (hallDetails.hallType || hallDetails.hall_type || 'WEDDING').toString().toUpperCase(),
      };
    };

    const uiLocation = raw.location && typeof raw.location === 'object' ? raw.location : {};
    const specific = String(
      uiLocation.specific_location ?? uiLocation.specificLocation ?? raw.specificLocation ?? ''
    ).trim();

    const payload = {
      title: raw.title ?? '',
      description: raw.description ?? '',
      property_type: normalizePropertyTypeEnum(raw.propertyType ?? raw.property_type ?? ''),
      listing_type: (raw.listing_type ?? raw.listingType ?? 'rent').toString().toLowerCase(),
      bedrooms: normalizeBedroomEnum(raw.bedrooms ?? raw.bedroomsCount ?? ''),
      bathrooms: raw.bathrooms !== undefined && raw.bathrooms !== '' ? Number(raw.bathrooms) : 1,
      area_sqm: asNum(raw.area),
      floor_number: raw.floor_number ?? (raw.floorNumber !== '' ? asNum(raw.floorNumber) : null),
      shop_class_count: raw.shop_class_count ?? asNum(raw.shopClassCount),
      price_monthly: asNum(raw.price ?? raw.monthlyRent ?? raw.price_monthly),
      price_currency: 'ETB',
      location: {
        city: uiLocation.city ?? raw.city ?? '',
        sub_city: uiLocation.sub_city ?? uiLocation.subCity ?? raw.subCity ?? '',
        specific_location: specific,
        maps_url: String(uiLocation.maps_url ?? uiLocation.mapsUrl ?? raw.mapsUrl ?? '').trim(),
      },
      amenities: normalizeAmenities(raw.amenities),
      hall_detail:
        normalizePropertyTypeEnum(raw.propertyType) === 'HALL_RENTAL'
          ? normalizeHallDetail(raw.hallDetails ?? raw.hall_detail, raw.hallAmenities)
          : null,
      // URL-based videos handled via serializer alias; file uploads via /videos endpoint.
      videoUrl: raw.videoUrl,
      video_url: raw.video_url,
    };

    const { data } = await api.post(`${BASE}/properties/`, payload);
    return data;
  },

  /** Use one package credit (or legacy subscription) to go live. */
  async publishProperty(slug) {
    const { data } = await api.post(`${BASE}/properties/${slug}/publish/`);
    return data;
  },

  async updateProperty(slug, propertyData) {
    const { data } = await api.patch(`${BASE}/properties/${slug}/`, propertyData);
    return data;
  },

  async deleteProperty(slug) {
    const { data } = await api.delete(`${BASE}/properties/${slug}/`);
    return data;
  },

  async uploadPropertyImages(slug, files, options = {}) {
    const primaryIndex = Number.isFinite(options?.primaryIndex)
      ? Math.max(0, Number(options.primaryIndex))
      : 0;
    const out = [];
    for (let i = 0; i < files.length; i += 1) {
      const formData = new FormData();
      formData.append('image', files[i]);
      formData.append('is_primary', i === primaryIndex ? 'true' : 'false');
      const { data } = await api.post(
        `${BASE}/properties/${slug}/images/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      out.push(data);
    }
    return out;
  },

  async deletePropertyImage(slug, imageId) {
    const { data } = await api.delete(
      `${BASE}/properties/${slug}/images/${imageId}/`
    );
    return data;
  },

  async uploadPropertyVideos(slug, files) {
    const out = [];
    for (let i = 0; i < files.length; i += 1) {
      const formData = new FormData();
      formData.append('video', files[i]);
      const { data } = await api.post(
        `${BASE}/properties/${slug}/videos/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      out.push(data);
    }
    return out;
  },

  async deletePropertyVideo(slug, videoId) {
    const { data } = await api.delete(
      `${BASE}/properties/${slug}/videos/${videoId}/`
    );
    return data;
  },

  async getFeaturedProperties() {
    const { data } = await api.get(`${BASE}/featured/?${buildParams({ page_size: 24 })}`);
    return data;
  },

  async getNearbyProperties(lat, lng, radius = 5) {
    const { data } = await api.get(
      `${BASE}/nearby/?${buildParams({
        lat,
        lng,
        radius_km: radius,
        page_size: 24,
      })}`
    );
    return data;
  },

  async postPriceEstimate(body) {
    const { data } = await api.post(`${BASE}/price-estimate/`, body);
    return data;
  },

  async getPriceInsight(subCity, city = 'Addis Ababa', propertyType) {
    const params = { sub_city: subCity, city };
    if (propertyType) params.property_type = propertyType;
    const { data } = await api.get(`${BASE}/price-insights/?${buildParams(params)}`);
    return data;
  },

  async getMyProperties(params = {}) {
    const { data } = await api.get(
      `${BASE}/my-properties/?${buildParams({ page_size: 100, ...params })}`
    );
    return data;
  },

  async addFavorite(propertyId) {
    const { data } = await api.post(`${BASE}/favorites/`, { property: propertyId });
    return data;
  },

  async removeFavorite(favoriteId) {
    await api.delete(`${BASE}/favorites/${favoriteId}/`);
  },

  async getFavorites(params = {}) {
    const { data } = await api.get(
      `${BASE}/favorites/?${buildParams({ page_size: 48, ...params })}`
    );
    return data;
  },

  async reportProperty(propertyId, { reason, details }) {
    const { data } = await api.post(`${BASE}/reports/`, {
      property: propertyId,
      reason,
      description: details || '',
    });
    return data;
  },

  async getHallRentals(filters = {}) {
    const { data } = await api.get(
      `${BASE}/halls/?${buildParams({ page_size: 48, ...filters })}`
    );
    return data;
  },
};

export default propertyService;
