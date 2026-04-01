import api from './api';

const CHAT_PREFIX = '/chat';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

export const chatService = {
  async getConversations(params = {}) {
    const { data } = await api.get(`${CHAT_PREFIX}/conversations`, { params });
    return data;
  },

  async getConversationById(conversationId) {
    const { data } = await api.get(`${CHAT_PREFIX}/conversations/${conversationId}`);
    return data;
  },

  async createConversation(participantId, propertyId) {
    const { data } = await api.post(`${CHAT_PREFIX}/conversations`, {
      participantId,
      propertyId,
    });
    return data;
  },

  async getMessages(conversationId, params = {}) {
    const { data } = await api.get(
      `${CHAT_PREFIX}/conversations/${conversationId}/messages`,
      { params }
    );
    return data;
  },

  async sendMessage(conversationId, messageData) {
    const { data } = await api.post(
      `${CHAT_PREFIX}/conversations/${conversationId}/messages`,
      messageData
    );
    return data;
  },

  async sendImageMessage(conversationId, file) {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(
      `${CHAT_PREFIX}/conversations/${conversationId}/messages/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  async markAsRead(conversationId) {
    const { data } = await api.put(
      `${CHAT_PREFIX}/conversations/${conversationId}/read`
    );
    return data;
  },

  async deleteConversation(conversationId) {
    const { data } = await api.delete(
      `${CHAT_PREFIX}/conversations/${conversationId}`
    );
    return data;
  },

  async getUnreadCount() {
    const { data } = await api.get(`${CHAT_PREFIX}/unread-count`);
    return data;
  },

  async blockUser(userId) {
    const { data } = await api.post(`${CHAT_PREFIX}/block/${userId}`);
    return data;
  },

  async unblockUser(userId) {
    const { data } = await api.delete(`${CHAT_PREFIX}/block/${userId}`);
    return data;
  },

  createWebSocketConnection(token) {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${token}`);
    return ws;
  },
};

export default chatService;
