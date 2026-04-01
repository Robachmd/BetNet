import api from './api';

const AUTH_PREFIX = '/auth';

export const authService = {
  async login(phone, password) {
    const { data } = await api.post(`${AUTH_PREFIX}/login`, { phone, password });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(userData) {
    const { data } = await api.post(`${AUTH_PREFIX}/register`, userData);
    return data;
  },

  async requestOTP(phone) {
    const { data } = await api.post(`${AUTH_PREFIX}/request-otp`, { phone });
    return data;
  },

  async verifyOTP(phone, otp) {
    const { data } = await api.post(`${AUTH_PREFIX}/verify-otp`, { phone, otp });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post(`${AUTH_PREFIX}/logout`, { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const { data } = await api.post(`${AUTH_PREFIX}/refresh`, { refreshToken });
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },

  async getProfile() {
    const { data } = await api.get(`${AUTH_PREFIX}/profile`);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async updateProfile(profileData) {
    const { data } = await api.put(`${AUTH_PREFIX}/profile`, profileData);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async updateProfilePhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await api.put(`${AUTH_PREFIX}/profile/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.put(`${AUTH_PREFIX}/change-password`, {
      currentPassword,
      newPassword,
    });
    return data;
  },

  async requestPasswordReset(phone) {
    const { data } = await api.post(`${AUTH_PREFIX}/forgot-password`, { phone });
    return data;
  },

  async resetPassword(phone, otp, newPassword) {
    const { data } = await api.post(`${AUTH_PREFIX}/reset-password`, {
      phone,
      otp,
      newPassword,
    });
    return data;
  },

  getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};

export default authService;
