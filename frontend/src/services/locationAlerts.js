import api from './api';

const BASE = '/notifications/location-alerts/';

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return [];
}

export const locationAlertsService = {
  async list() {
    const { data } = await api.get(BASE);
    return normalizeListResponse(data);
  },

  async create(payload) {
    const { data } = await api.post(BASE, payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`${BASE}${id}/`, payload);
    return data;
  },

  async remove(id) {
    await api.delete(`${BASE}${id}/`);
  },
};

export default locationAlertsService;
