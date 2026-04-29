import api from './api';
import { WS_BASE_URL } from '../config/runtime';

const CHAT_PREFIX = '/chat';

export const chatService = {
  async getConversations(params = {}) {
    const { data } = await api.get(`${CHAT_PREFIX}/conversations`, { params });
    return data;
  },

  async getConversationById(conversationId) {
    const { data } = await api.get(`${CHAT_PREFIX}/conversations/${conversationId}`);
    return data;
  },

  async createConversation(participantId, propertyId = null) {
    const body = { participant_id: participantId };
    if (propertyId != null && propertyId !== '') {
      body.property_id = propertyId;
    }
    const { data } = await api.post(`${CHAT_PREFIX}/conversations`, body);
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
    const { data } = await api.post(
      `${CHAT_PREFIX}/conversations/${conversationId}/read/`
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
