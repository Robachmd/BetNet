import api from './api';

const REVIEWS_PREFIX = '/reviews';

export const reviewService = {
  async getPropertyReviews(propertyId, params = {}) {
    const { data } = await api.get(`${REVIEWS_PREFIX}/property/${propertyId}`, {
      params,
    });
    return data;
  },

  async createReview(reviewData) {
    const { data } = await api.post(REVIEWS_PREFIX, reviewData);
    return data;
  },

  async updateReview(id, reviewData) {
    const { data } = await api.put(`${REVIEWS_PREFIX}/${id}`, reviewData);
    return data;
  },

  async deleteReview(id) {
    const { data } = await api.delete(`${REVIEWS_PREFIX}/${id}`);
    return data;
  },

  async getLandlordReviews(landlordId, params = {}) {
    const { data } = await api.get(`${REVIEWS_PREFIX}/landlord/${landlordId}`, {
      params,
    });
    return data;
  },

  async getMyReviews(params = {}) {
    const { data } = await api.get(`${REVIEWS_PREFIX}/my-reviews`, { params });
    return data;
  },

  async reportReview(reviewId, reason) {
    const { data } = await api.post(`${REVIEWS_PREFIX}/${reviewId}/report`, {
      reason,
    });
    return data;
  },

  async respondToReview(reviewId, response) {
    const { data } = await api.post(`${REVIEWS_PREFIX}/${reviewId}/respond`, {
      response,
    });
    return data;
  },

  async getReviewStats(propertyId) {
    const { data } = await api.get(`${REVIEWS_PREFIX}/stats/${propertyId}`);
    return data;
  },
};

export default reviewService;
