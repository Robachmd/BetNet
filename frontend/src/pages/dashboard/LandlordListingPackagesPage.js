import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiChevronLeft, FiLayers, FiCheck, FiCreditCard, FiSmartphone, FiLoader,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { paymentService } from '../../services/payments';
import {
  getListingPackages,
  getListingSlotSummary,
  initiateListingPackagePurchase,
} from '../../services/listingPackages';
import { formatPrice, getErrorMessage, listFromApi, ensureArray } from '../../utils/helpers';
import { API_BASE_URL } from '../../config/runtime';
import toast from 'react-hot-toast';

const RETURN_PATH = '/dashboard/property-owner/listing-packages';

function methodToApi(frontend) {
  const m = (frontend || 'chapa').toLowerCase();
  if (m === 'chapa') return 'CHAPA';
  if (m === 'telebirr' || m === 'telebirt') return 'TELEBIRR';
  return m.toUpperCase();
}

function mapPaymentInitError(err) {
  const payload = err?.response?.data || {};
  const reason = String(payload?.reason || '').toLowerCase();
  const provider = String(payload?.provider || '').toUpperCase();
  const hint = payload?.actionable_hint || '';
  const generic = getErrorMessage(err);

  if (provider === 'CHAPA') {
    if (reason === 'missing_server_key' || reason === 'wrong_key_type' || reason === 'invalid_api_key') {
      return 'Chapa is not configured correctly right now. Please contact support while we update the server payment key.';
    }
    if (reason === 'merchant_inactive') {
      return 'Payments are temporarily unavailable because the Chapa merchant account is not active for collections.';
    }
  }
  if (hint) return `${generic} ${hint}`.trim();
  return generic;
}

function packagePreferenceScore(pkg) {
  let score = 0;
  if (pkg?.badge_label) score += 3;
  if (pkg?.tagline) score += 2;
  if ((pkg?.savings_percent ?? 0) > 0) score += 2;
  if (pkg?.is_featured) score += 1;
  return score;
}

const PACKAGE_DISPLAY_PRESETS = {
  1: {
    name: '1 Listings Package',
    tagline: 'Post up to 1 listings without per-post fees.',
  },
  5: {
    badgeLabel: 'Popular',
    name: 'Plus',
    tagline: '~20% vs 5 single listings',
    savingsPercent: 20,
  },
  20: {
    badgeLabel: 'Best value',
    name: 'Pro',
    tagline: '~40% savings vs singles',
    savingsPercent: 40,
  },
  50: {
    name: 'Business',
    tagline: 'For agencies & teams',
    savingsPercent: 50,
  },
  100: {
    badgeLabel: 'Lowest / listing',
    name: 'Enterprise',
    tagline: 'Lowest per-listing cost',
    savingsPercent: 60,
  },
};

function packageDisplayInfo(pkg) {
  const quota = Number(pkg?.listing_quota);
  const preset = Number.isFinite(quota) ? PACKAGE_DISPLAY_PRESETS[quota] : null;
  return {
    badgeLabel: preset?.badgeLabel ?? pkg?.badge_label,
    name: preset?.name ?? pkg?.name,
    tagline: preset?.tagline ?? pkg?.tagline,
    savingsPercent: preset?.savingsPercent ?? pkg?.savings_percent,
  };
}

export default function PropertyOwnerListingPackagesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('chapa');
  const [phone, setPhone] = useState('');
  const verifyStartedForRef = useRef('');
  const pendingDraftSlugRef = useRef(location.state?.draftSlug || null);

  useEffect(() => {
    const draftSlugFromState = location.state?.draftSlug;
    if (draftSlugFromState) {
      pendingDraftSlugRef.current = draftSlugFromState;
      sessionStorage.setItem('listingPkgDraftSlug', draftSlugFromState);
    }
  }, [location.state]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgRes, sum] = await Promise.all([
        getListingPackages(),
        getListingSlotSummary(),
      ]);
      const list = listFromApi(pkgRes);
      const dedupedByQuota = new Map();
      list.forEach((pkg) => {
        const quota =
          Number.isFinite(Number(pkg?.listing_quota))
            ? Number(pkg.listing_quota)
            : null;
        const key = quota == null ? `id:${pkg?.id}` : `quota:${quota}`;
        const prev = dedupedByQuota.get(key);
        if (!prev || packagePreferenceScore(pkg) > packagePreferenceScore(prev)) {
          dedupedByQuota.set(key, pkg);
        }
      });
      const uniquePackages = Array.from(dedupedByQuota.values());
      setPackages(
        [...uniquePackages].sort((a, b) => {
          const qa = Number(a?.listing_quota ?? Infinity);
          const qb = Number(b?.listing_quota ?? Infinity);
          if (Number.isFinite(qa) && Number.isFinite(qb) && qa !== qb) {
            return qa - qb;
          }
          return (a.sort_order ?? a.id ?? 0) - (b.sort_order ?? b.id ?? 0);
        })
      );
      setSummary(sum);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSlotSummary = useCallback(async () => {
    try {
      const sum = await getListingSlotSummary();
      setSummary(sum);
      return Number(sum?.package_slots_remaining ?? 0);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const focusPackageId = searchParams.get('package');
  useEffect(() => {
    if (loading || !focusPackageId) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`listing-pkg-${focusPackageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-green-500', 'ring-offset-2');
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-green-500', 'ring-offset-2');
        }, 2000);
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [loading, focusPackageId, packages]);

  useEffect(() => {
    const trxRef =
      searchParams.get('trx_ref') || searchParams.get('tx_ref');
    if (!trxRef) return;
    if (verifyStartedForRef.current === trxRef) return;
    verifyStartedForRef.current = trxRef;

    const stored = sessionStorage.getItem('listingPkgPayMethod') || 'chapa';
    const pendingDraftSlug =
      pendingDraftSlugRef.current || sessionStorage.getItem('listingPkgDraftSlug');

    setVerifying(true);
    (async () => {
      try {
        await paymentService.confirmPaymentWithProvider(
          trxRef,
          methodToApi(stored)
        );
        sessionStorage.removeItem('listingPkgPayMethod');
        const remaining = await refreshSlotSummary();
        toast.success(
          remaining == null
            ? 'Payment confirmed. Your listing package slots are updated.'
            : `Payment confirmed. Listing package slots left: ${remaining}.`
        );
        await loadData();
        if (pendingDraftSlug) {
          sessionStorage.removeItem('listingPkgDraftSlug');
          pendingDraftSlugRef.current = null;
          navigate(`/dashboard/property-owner/edit-property/${pendingDraftSlug}`);
          return;
        }
      } catch (e) {
        const msg = getErrorMessage(e);
        if (msg && !/not yet confirmed/i.test(msg)) {
          toast.error(msg);
        }
        await loadData();
      } finally {
        setVerifying(false);
        searchParams.delete('trx_ref');
        searchParams.delete('tx_ref');
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams, setSearchParams, loadData, navigate, refreshSlotSummary]);

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/property-owner',
      properties: '/dashboard/property-owner',
      'add-property': '/dashboard/property-owner/add-property',
      'listing-packages': '/dashboard/property-owner/listing-packages',
      bookings: '/dashboard/property-owner/bookings',
      reviews: '/dashboard/property-owner/reviews',
      analytics: '/dashboard/property-owner/analytics',
      notifications: '/dashboard/property-owner/notifications',
      messages: '/chat',
      settings: '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const buy = async (pkg) => {
    if (purchasingId != null) return;
    setPaymentError('');
    if (methodToApi(paymentMethod) === 'TELEBIRR' && !phone.trim()) {
      toast.error('Enter your Telebirr phone number');
      return;
    }
    const baseOrigin = window.location.origin;
    const returnUrl = `${baseOrigin}${RETURN_PATH}`;
    sessionStorage.setItem('listingPkgPayMethod', paymentMethod);
    setPurchasingId(pkg.id);
    try {
      const webhookPath =
        methodToApi(paymentMethod) === 'TELEBIRR'
          ? '/payments/webhooks/telebirr/'
          : '/payments/webhooks/chapa/';
      const res = await initiateListingPackagePurchase(pkg.id, {
        payment_method: methodToApi(paymentMethod),
        return_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}tx_ref=`,
        callback_url: `${API_BASE_URL}${webhookPath}`,
        phone: phone.trim() || undefined,
      });
      if (res.checkout_url) {
        const draftSlug = pendingDraftSlugRef.current;
        if (draftSlug) {
          sessionStorage.setItem('listingPkgDraftSlug', draftSlug);
        }
        window.location.href = res.checkout_url;
        return;
      }
      if (res.transaction_id) {
        const remaining = await refreshSlotSummary();
        toast.success(
          remaining == null
            ? 'Package recorded. If payment was not online, use payment history to confirm.'
            : `Package recorded. Listing package slots left: ${remaining}.`
        );
        await loadData();
      }
    } catch (e) {
      const friendly = mapPaymentInitError(e);
      setPaymentError(friendly);
      toast.error(friendly);
    } finally {
      setPurchasingId(null);
    }
  };
  const safePackages = ensureArray(packages);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="property_owner"
        activeKey="listing-packages"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard/property-owner')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <FiChevronLeft className="w-4 h-4" />
            Back to dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Listing packages</h1>
            <p className="text-gray-500 mt-1 max-w-2xl">
              Each time you publish a property to the public catalog, it uses one listing package slot. Buy a
              package that matches how many properties you want live at once.
            </p>
          </div>

          {verifying && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <FiLoader className="w-4 h-4 animate-spin" />
              Confirming payment with provider…
            </div>
          )}

          {loading ? (
            <LoadingSpinner text="Loading packages…" />
          ) : (
            <>
              {summary && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Your balance</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {summary.package_slots_remaining ?? 0} listing package slots
                    </p>
                    {!!summary.legacy_subscription_slots_remaining && (
                      <p className="text-sm text-gray-500 mt-1">
                        Plus {summary.legacy_subscription_slots_remaining} from subscription plan
                      </p>
                    )}
                    <p
                      className={`text-sm font-medium mt-2 ${
                        summary.can_publish ? 'text-green-700' : 'text-amber-700'
                      }`}
                    >
                      {summary.can_publish
                        ? 'You can publish a property now'
                        : 'Add a package to publish a new live listing'}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {summary.published_listings_count ?? 0} live listings
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Pay with</p>
                {paymentError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {paymentError}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('chapa'); setPaymentError(''); }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      paymentMethod === 'chapa'
                        ? 'border-green-700 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <FiCreditCard className="w-4 h-4" />
                    Chapa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('telebirr'); setPaymentError(''); }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      paymentMethod === 'telebirr'
                        ? 'border-green-700 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <FiSmartphone className="w-4 h-4" />
                    Telebirr
                  </button>
                </div>
                {paymentMethod === 'telebirr' && (
                  <div className="mt-3">
                    <label htmlFor="telebirr-phone" className="text-xs text-gray-500 block mb-1">
                      Phone (Telebirr)
                    </label>
                    <input
                      id="telebirr-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09…"
                      className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                    />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {safePackages.map((pkg) => {
                  const display = packageDisplayInfo(pkg);
                  const currency = pkg.currency || 'ETB';
                  const perListing = pkg.price_per_listing
                    ? formatPrice(Number(pkg.price_per_listing), currency)
                    : null;
                  return (
                    <div
                      id={`listing-pkg-${pkg.id}`}
                      key={pkg.id}
                      className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col transition-shadow ${
                        display.badgeLabel
                          ? 'ring-2 ring-green-500/30 border-green-200'
                          : 'border-gray-100'
                      }`}
                    >
                      {display.badgeLabel && (
                        <span className="self-start mb-2 text-[11px] font-semibold uppercase tracking-wide text-green-800 bg-green-100 px-2 py-0.5 rounded">
                          {display.badgeLabel}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <FiLayers className="w-5 h-5 text-green-700" />
                        <h2 className="text-lg font-semibold text-gray-900">{display.name}</h2>
                      </div>
                      {display.tagline && (
                        <p className="text-sm text-gray-500 mb-3">{display.tagline}</p>
                      )}
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(pkg.price, currency)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {pkg.listing_quota} listing{pkg.listing_quota !== 1 ? 's' : ''}
                        {perListing && (
                          <span className="text-gray-500">
                            {' '}
                            · {perListing} each
                          </span>
                        )}
                      </p>
                      {display.savingsPercent != null && display.savingsPercent > 0 && (
                        <p className="text-xs text-green-700 font-medium mt-2">
                          Save {display.savingsPercent}% vs single listing
                        </p>
                      )}
                      <ul className="mt-3 text-sm text-gray-500 space-y-1 flex-1">
                        <li className="flex items-center gap-1.5">
                          <FiCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Uses one listing package slot when you publish
                        </li>
                        <li className="flex items-center gap-1.5">
                          <FiCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {pkg.validity_days} days to use remaining slots
                        </li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => buy(pkg)}
                        disabled={purchasingId === pkg.id}
                        className="mt-4 w-full py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {purchasingId === pkg.id ? 'Redirecting…' : 'Buy now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
