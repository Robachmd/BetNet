import api from './api';

const NOTIFICATIONS_PREFIX = '/notifications';

export const notificationService = {
  async getNotifications(params = {}) {
    const { data } = await api.get(NOTIFICATIONS_PREFIX, { params });
    return data;
  },

  async getUnreadCount() {
    const { data } = await api.get(`${NOTIFICATIONS_PREFIX}/unread-count`);
    return data;
  },

  async markAsRead(notificationId) {
    const { data } = await api.put(`${NOTIFICATIONS_PREFIX}/${notificationId}/read`);
    return data;
  },

  async markAllAsRead() {
    const { data } = await api.put(`${NOTIFICATIONS_PREFIX}/read-all`);
    return data;
  },

  async deleteNotification(notificationId) {
    const { data } = await api.delete(`${NOTIFICATIONS_PREFIX}/${notificationId}`);
    return data;
  },

  async getNotificationPreferences() {
    const { data } = await api.get(`${NOTIFICATIONS_PREFIX}/preferences`);
    return data;
  },

  async updateNotificationPreferences(preferences) {
    const { data } = await api.put(
      `${NOTIFICATIONS_PREFIX}/preferences`,
      preferences
    );
    return data;
  },

  async registerPushToken(token, platform) {
    const { data } = await api.post(`${NOTIFICATIONS_PREFIX}/push-token`, {
      token,
      platform,
    });
    return data;
  },

  async unregisterPushToken(token) {
    const { data } = await api.delete(`${NOTIFICATIONS_PREFIX}/push-token`, {
      data: { token },
    });
    return data;
  },
};

export default notificationService;
