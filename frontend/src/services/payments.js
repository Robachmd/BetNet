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

  /** POST /payments/verify/ — confirm status with Chapa/Telebirr (transaction_id, payment_method). */
  async confirmPaymentWithProvider(transactionId, paymentMethod) {
    const method = (paymentMethod || 'CHAPA').toString().toUpperCase();
    const { data } = await api.post(`${PAYMENTS_PREFIX}/verify/`, {
      transaction_id: transactionId,
      payment_method: method,
    });
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

  async getPropertyOwnerEarnings(params = {}) {
    const { data } = await api.get(`${PAYMENTS_PREFIX}/earnings`, { params });
    return data;
  },

  // Backward-compatible alias while call sites migrate.
  async getLandlordEarnings(params = {}) {
    return this.getPropertyOwnerEarnings(params);
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
