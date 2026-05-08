import api from './api';

const AUTH = '/accounts';

function persistSession(data) {
  const tokens = data.tokens || {};
  const access = tokens.access || data.access;
  const refresh = tokens.refresh || data.refresh;
  if (access) localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  return { ...data, accessToken: access, refreshToken: refresh };
}

export const authService = {
  async login(phone, password) {
    const { data } = await api.post(`${AUTH}/login/`, {
      phone_number: phone,
      password,
    });
    return persistSession(data);
  },

  async register(userData) {
    const roleMap = {
      renter: 'RENTER',
      landlord: 'LANDLORD',
      property_owner: 'LANDLORD',
      propertyowner: 'LANDLORD',
      owner: 'LANDLORD',
    };
    const role =
      roleMap[(userData.role || '').toLowerCase()] ||
      (userData.role || 'RENTER').toUpperCase();

    const { data } = await api.post(`${AUTH}/register/`, {
      phone_number: userData.phone,
      password: userData.password,
      password_confirm: userData.confirmPassword || userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email || '',
      role,
      preferred_language: userData.preferredLanguage || 'EN',
    });
    return persistSession(data);
  },

  async requestOTP(phone) {
    const { data } = await api.post(`${AUTH}/otp/request/`, {
      phone_number: phone,
    });
    return data;
  },

  async verifyOTP(phone, otp) {
    const { data } = await api.post(`${AUTH}/otp/verify/`, {
      phone_number: phone,
      otp,
    });
    if (data.tokens) return persistSession(data);
    return data;
  },

  logout() {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      api.post(`${AUTH}/logout/`, { refresh }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  async refreshToken() {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) throw new Error('No refresh token');
    const { data } = await api.post(`${AUTH}/token/refresh/`, { refresh });
    localStorage.setItem('accessToken', data.access);
    if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
    return data;
  },

  async getProfile() {
    const { data } = await api.get(`${AUTH}/profile/`);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async updateProfile(profileData) {
    const { data } = await api.patch(`${AUTH}/profile/`, profileData);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async updateProfilePhoto(file) {
    const form = new FormData();
    form.append('profile_image', file);
    const { data } = await api.patch(`${AUTH}/profile/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async getIdentityVerification() {
    const { data } = await api.get(`${AUTH}/verification/`);
    return data;
  },

  async submitIdentityVerification({ idFront, idBack, selfie }) {
    const form = new FormData();
    if (idFront) form.append('id_document_front', idFront);
    if (idBack) form.append('id_document_back', idBack);
    if (selfie) form.append('selfie', selfie);
    const { data } = await api.post(`${AUTH}/verification/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async enablePropertyOwner() {
    let data;
    try {
      ({ data } = await api.post(`${AUTH}/enable-property-owner/`));
    } catch {
      ({ data } = await api.post(`${AUTH}/enable-landlord/`));
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  // Backward-compatible alias while older call sites migrate.
  async enableLandlord() {
    return this.enablePropertyOwner();
  },

  async setActiveAppMode(mode) {
    // Backward compatible: PATCH profile still supported.
    const { data } = await api.patch(`${AUTH}/profile/`, {
      active_app_mode: mode,
    });
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async switchWorkspace(mode) {
    const { data } = await api.post(`${AUTH}/switch-workspace/`, {
      mode,
    });
    const u = data.user || data;
    localStorage.setItem('user', JSON.stringify(u));
    return u;
  },

  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    const { data } = await api.post(`${AUTH}/change-password/`, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm || newPassword,
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
