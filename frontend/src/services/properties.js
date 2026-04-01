import api from './api';

const PROPERTIES_PREFIX = '/properties';

export const propertyService = {
  async getProperties(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    const { data } = await api.get(`${PROPERTIES_PREFIX}?${params.toString()}`);
    return data;
  },

  async getPropertyById(id) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/${id}`);
    return data;
  },

  async createProperty(propertyData) {
    const { data } = await api.post(PROPERTIES_PREFIX, propertyData);
    return data;
  },

  async updateProperty(id, propertyData) {
    const { data } = await api.put(`${PROPERTIES_PREFIX}/${id}`, propertyData);
    return data;
  },

  async deleteProperty(id) {
    const { data } = await api.delete(`${PROPERTIES_PREFIX}/${id}`);
    return data;
  },

  async uploadPropertyImages(propertyId, files) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const { data } = await api.post(
      `${PROPERTIES_PREFIX}/${propertyId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  async deletePropertyImage(propertyId, imageId) {
    const { data } = await api.delete(
      `${PROPERTIES_PREFIX}/${propertyId}/images/${imageId}`
    );
    return data;
  },

  async getFeaturedProperties() {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/featured`);
    return data;
  },

  async getNearbyProperties(lat, lng, radius = 5) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/nearby`, {
      params: { lat, lng, radius },
    });
    return data;
  },

  async getPriceInsight(subCity, propertyType) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/price-insight`, {
      params: { subCity, propertyType },
    });
    return data;
  },

  async getMyProperties(params = {}) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/my-listings`, { params });
    return data;
  },

  async toggleFavorite(propertyId) {
    const { data } = await api.post(`${PROPERTIES_PREFIX}/${propertyId}/favorite`);
    return data;
  },

  async getFavorites(params = {}) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/favorites`, { params });
    return data;
  },

  async reportProperty(propertyId, reportData) {
    const { data } = await api.post(
      `${PROPERTIES_PREFIX}/${propertyId}/report`,
      reportData
    );
    return data;
  },

  async searchProperties(query, filters = {}) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/search`, {
      params: { q: query, ...filters },
    });
    return data;
  },

  async getHallRentals(filters = {}) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/halls`, {
      params: filters,
    });
    return data;
  },

  async getPropertyTypes() {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/types`);
    return data;
  },

  async getPropertyStats(propertyId) {
    const { data } = await api.get(`${PROPERTIES_PREFIX}/${propertyId}/stats`);
    return data;
  },
};

export default propertyService;
