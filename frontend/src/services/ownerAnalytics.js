import api from './api';

const ANALYTICS = '/analytics';

export const ownerAnalyticsService = {
  async getListingsEngagement(params = {}) {
    const { data } = await api.get(`${ANALYTICS}/owner/listings/engagement/`, { params });
    return data;
  },

  async getListingEngagement(slug, params = {}) {
    const { data } = await api.get(`${ANALYTICS}/owner/listings/${slug}/engagement/`, { params });
    return data;
  },
};

export default ownerAnalyticsService;

