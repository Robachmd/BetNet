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
    const { data } = await api.post(`${BASE}/properties/`, propertyData);
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
