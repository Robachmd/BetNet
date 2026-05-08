import api from './api';

const PAYMENTS = '/payments';

/**
 * @returns {Promise<{ count?: number, results: object[] }|object[]>}
 */
export async function getListingPackages() {
  const { data } = await api.get(`${PAYMENTS}/listing-packages/`);
  if (data?.results) return data;
  if (Array.isArray(data)) return { results: data };
  return { results: [] };
}

export async function getListingSlotSummary() {
  const { data } = await api.get(`${PAYMENTS}/listing-packages/slots/summary/`);
  return data;
}

export async function getMyListingPurchases() {
  const { data } = await api.get(`${PAYMENTS}/listing-packages/my-purchases/`);
  if (data?.results) return data;
  if (Array.isArray(data)) return { results: data };
  return { results: [] };
}

export async function getMyActiveListingPurchase() {
  const { data } = await api.get(`${PAYMENTS}/listing-packages/my-active/`);
  return data;
}

/**
 * @param {number} packageId
 * @param {object} opts
 * @param {string} [opts.payment_method] — CHAPA | TELEBIRR | …
 * @param {string} [opts.return_url]
 * @param {string} [opts.callback_url]
 * @param {string} [opts.phone] — for Telebirr
 */
export async function initiateListingPackagePurchase(packageId, opts = {}) {
  const { data } = await api.post(
    `${PAYMENTS}/listing-packages/${packageId}/purchase/`,
    {
      payment_method: opts.payment_method || 'CHAPA',
      return_url: opts.return_url,
      callback_url: opts.callback_url,
      phone: opts.phone,
    }
  );
  return data;
}
