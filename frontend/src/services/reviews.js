import api from './api';

const R = '/reviews';

export const reviewService = {
  async getPropertyReviews(propertyId, params = {}) {
    const qs = new URLSearchParams({ property: propertyId, page_size: 50, ...params });
    const { data } = await api.get(`${R}/reviews/?${qs.toString()}`);
    return data;
  },

  /** Reviews written by the current user (see backend: mine=1). */
  async getMyReviews(params = {}) {
    const { data } = await api.get(`${R}/reviews/`, {
      params: { page_size: 20, mine: 1, ...params },
    });
    return data;
  },

  /** Reviews received by a specific user (property owner or renter). */
  async getReviewsForUser(userId, params = {}) {
    const { data } = await api.get(`${R}/reviews/`, {
      params: { page_size: 20, user: userId, ...params },
    });
    return data;
  },

  async createReview(reviewData) {
    const { data } = await api.post(`${R}/reviews/`, reviewData);
    return data;
  },

  async updateReview(id, reviewData) {
    const { data } = await api.patch(`${R}/reviews/${id}/`, reviewData);
    return data;
  },

  async deleteReview(id) {
    await api.delete(`${R}/reviews/${id}/`);
  },

  async respondToReview(reviewPk, body) {
    const { data } = await api.post(`${R}/reviews/${reviewPk}/respond/`, body);
    return data;
  },

  async getReviewStats(propertyPk) {
    const { data } = await api.get(
      `${R}/properties/${propertyPk}/reviews/summary/`
    );
    return data;
  },
};

export default reviewService;
