import api from './api';

const BOOKINGS_PREFIX = '/bookings';

export const bookingService = {
  async createBooking(bookingData) {
    const { data } = await api.post(BOOKINGS_PREFIX, bookingData);
    return data;
  },

  async getMyBookings(params = {}) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/my-bookings`, { params });
    return data;
  },

  async getBookingById(id) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/${id}`);
    return data;
  },

  async getLandlordBookings(params = {}) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/landlord`, { params });
    return data;
  },

  async updateBookingStatus(id, status, reason) {
    const { data } = await api.put(`${BOOKINGS_PREFIX}/${id}/status`, {
      status,
      reason,
    });
    return data;
  },

  async cancelBooking(id, reason) {
    const { data } = await api.put(`${BOOKINGS_PREFIX}/${id}/cancel`, { reason });
    return data;
  },

  async getBookingAvailability(propertyId, startDate, endDate) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/availability`, {
      params: { propertyId, startDate, endDate },
    });
    return data;
  },

  async scheduleViewing(bookingData) {
    const { data } = await api.post(`${BOOKINGS_PREFIX}/viewing`, bookingData);
    return data;
  },

  async getViewingSchedule(propertyId) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/viewing/${propertyId}`);
    return data;
  },

  async confirmViewing(viewingId) {
    const { data } = await api.put(`${BOOKINGS_PREFIX}/viewing/${viewingId}/confirm`);
    return data;
  },

  async getBookingHistory(params = {}) {
    const { data } = await api.get(`${BOOKINGS_PREFIX}/history`, { params });
    return data;
  },

  async extendBooking(id, newEndDate) {
    const { data } = await api.put(`${BOOKINGS_PREFIX}/${id}/extend`, {
      newEndDate,
    });
    return data;
  },
};

export default bookingService;
