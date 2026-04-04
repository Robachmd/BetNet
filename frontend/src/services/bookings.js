import api from './api';

const B = '/bookings';

function parseVisitTime(slot) {
  if (!slot) return '10:00:00';
  const m = String(slot).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return '10:00:00';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}:00`;
}

export const bookingService = {
  async scheduleViewing({ propertyId, date, timeSlot, message }) {
    const { data } = await api.post(`${B}/bookings/`, {
      property: propertyId,
      booking_type: 'VISIT',
      visit_date: date,
      visit_time: parseVisitTime(timeSlot),
      message: message || '',
    });
    return data;
  },

  async createBooking(payload) {
    return bookingService.createHallBooking({
      propertyId: payload.propertyId,
      date: payload.date,
      endDate: payload.endDate,
      timeSlot: payload.timeSlot,
      endTime: payload.endTime,
      guestCount: payload.guestCount,
      eventType: payload.eventType,
      message: payload.message,
    });
  },

  async createHallBooking({
    propertyId,
    date,
    endDate,
    timeSlot,
    endTime,
    guestCount,
    eventType,
    message,
  }) {
    const { data } = await api.post(`${B}/hall-bookings/`, {
      property: propertyId,
      event_date: date,
      event_end_date: endDate || date,
      start_time: parseVisitTime(timeSlot || '09:00 AM'),
      end_time: parseVisitTime(endTime || '05:00 PM'),
      guest_count: Number.parseInt(String(guestCount), 10) || 1,
      event_type: eventType || 'Event',
      special_requests: message || '',
    });
    return data;
  },

  async getBookingAvailability(propertyId) {
    const { data } = await api.get(`${B}/availability/${propertyId}/`);
    return data;
  },

  async getMyBookings(params = {}) {
    const { data } = await api.get(`${B}/bookings/`, {
      params: { page_size: 50, ...params },
    });
    return data;
  },

  async getBookingById(id) {
    const { data } = await api.get(`${B}/bookings/${id}/`);
    return data;
  },

  async updateBookingStatus(id, status, landlord_response = '') {
    const { data } = await api.patch(`${B}/bookings/${id}/update-status/`, {
      status,
      landlord_response,
    });
    return data;
  },

  async cancelBooking(id) {
    const { data } = await api.post(`${B}/bookings/${id}/cancel/`);
    return data;
  },
};

export default bookingService;
