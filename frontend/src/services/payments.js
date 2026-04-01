import api from './api';

const PAYMENTS_PREFIX = '/payments';

export const paymentService = {
  async initializePayment(paymentData) {
    const { data } = await api.post(`${PAYMENTS_PREFIX}/initialize`, paymentData);
    return data;
  },

  async verifyPayment(transactionRef) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/verify/${transactionRef}`);
    return data;
  },

  async getPaymentHistory(params = {}) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/history`, { params });
    return data;
  },

  async getPaymentById(id) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/${id}`);
    return data;
  },

  async initiateChapaPayment(paymentData) {
    const { data } = await api.post(`${PAYMENTS_PREFIX}/chapa/initialize`, paymentData);
    return data;
  },

  async verifyChapaPayment(txRef) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/chapa/verify/${txRef}`);
    return data;
  },

  async initiateTelebirtPayment(paymentData) {
    const { data } = await api.post(
      `${PAYMENTS_PREFIX}/telebirr/initialize`,
      paymentData
    );
    return data;
  },

  async verifyTelebirtPayment(txRef) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/telebirr/verify/${txRef}`);
    return data;
  },

  async getPaymentMethods() {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/methods`);
    return data;
  },

  async requestRefund(paymentId, reason) {
    const { data } = await api.post(`${PAYMENTS_PREFIX}/${paymentId}/refund`, {
      reason,
    });
    return data;
  },

  async getLandlordEarnings(params = {}) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/earnings`, { params });
    return data;
  },

  async requestPayout(amount, paymentMethod) {
    const { data } = await api.post(`${PAYMENTS_PREFIX}/payout`, {
      amount,
      paymentMethod,
    });
    return data;
  },

  async getPayoutHistory(params = {}) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/payouts`, { params });
    return data;
  },
};

export default paymentService;
