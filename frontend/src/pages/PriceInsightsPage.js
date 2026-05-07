import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowLeft,
  FiInfo,
  FiLoader,
  FiTrendingUp,
} from 'react-icons/fi';
import propertyService from '../services/properties';
import {
  CITIES,
  ADDIS_ABABA_SUB_CITIES,
  PROPERTY_TYPES,
  LISTING_TYPES,
} from '../utils/constants';
import { getErrorMessage, formatPrice } from '../utils/helpers';

function formPropertyTypeToApi(formValue) {
  if (!formValue) return null;
  const map = {
    apartment: 'APARTMENT',
    villa: 'VILLA',
    house: 'SERVICE_HOUSE',
    condominium: 'CONDOMINIUM',
    commercial: 'BUSINESS_SHOP',
    hall: 'HALL_RENTAL',
    office: 'REAL_ESTATE',
    shop: 'BUSINESS_SHOP',
    warehouse: 'BUSINESS_SHOP',
  };
  return map[String(formValue).toLowerCase()] || null;
}

function resolveCityApiLabel(formValueKey) {
  const c = CITIES.find((x) => x.value === formValueKey);
  return (c?.label || 'Addis Ababa').trim();
}

function resolveSubCityApiLabel(formValueKey) {
  const s = ADDIS_ABABA_SUB_CITIES.find((x) => x.value === formValueKey);
  return (s?.label || formValueKey || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const BEDROOM_VALUES = ['', 'STUDIO', 'ONE', 'TWO', 'THREE_PLUS'];

export default function PriceInsightsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cityForm, setCityForm] = useState('addis_ababa');
  const [subCityForm, setSubCityForm] = useState('bole');
  const [subCityOther, setSubCityOther] = useState('');
  const [propertyTypeForm, setPropertyTypeForm] = useState('apartment');
  const [listingType, setListingType] = useState('rent');
  const [bedrooms, setBedrooms] = useState('TWO');
  const [bathrooms, setBathrooms] = useState('1');
  const [askingPrice, setAskingPrice] = useState('');
  const [furnished, setFurnished] = useState(false);
  const [parking, setParking] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [security, setSecurity] = useState(false);
  const [generator, setGenerator] = useState(false);
  const [specificLocation, setSpecificLocation] = useState('');
  const [areaSqm, setAreaSqm] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const isAddis = cityForm === 'addis_ababa';

  useEffect(() => {
    const c = searchParams.get('city');
    const sub = searchParams.get('sub_city');
    const pt = searchParams.get('property_type');
    const lt = searchParams.get('listing_type');
    const br = searchParams.get('bedrooms');
    const bath = searchParams.get('bathrooms');
    if (lt) setListingType(lt);
    if (br && BEDROOM_VALUES.includes(br)) setBedrooms(br);
    if (bath != null && bath !== '') setBathrooms(String(bath));
    if (c) {
      const match = CITIES.find((x) => x.label.toLowerCase() === c.toLowerCase());
      if (match) setCityForm(match.value);
    }
    if (sub) {
      const byLabel = ADDIS_ABABA_SUB_CITIES.find(
        (x) => x.label.toLowerCase() === sub.trim().toLowerCase(),
      );
      if (byLabel) setSubCityForm(byLabel.value);
      else {
        setSubCityOther(sub);
      }
    }
    if (pt) {
      const up = pt.toUpperCase();
      const back = Object.entries({
        APARTMENT: 'apartment',
        VILLA: 'villa',
        SERVICE_HOUSE: 'house',
        CONDOMINIUM: 'condominium',
        BUSINESS_SHOP: 'shop',
        HALL_RENTAL: 'hall',
        REAL_ESTATE: 'office',
      }).find(([k]) => k === up);
      if (back) setPropertyTypeForm(back[1]);
    }
    // One-shot: consume params so edits don’t revert
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const subCityApiLabel = useMemo(() => (
    isAddis ? resolveSubCityApiLabel(subCityForm) : subCityOther.trim()
  ), [isAddis, subCityForm, subCityOther]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const cityLabel = resolveCityApiLabel(cityForm);
    if (!subCityApiLabel) {
      setError(t('priceInsights.needSubcity'));
      return;
    }

    const apiPt = formPropertyTypeToApi(propertyTypeForm);
    const body = {
      city: cityLabel,
      sub_city: subCityApiLabel,
      listing_type: listingType,
      bathrooms: Math.min(99, Math.max(0, parseInt(String(bathrooms || '1'), 10) || 1)),
      is_furnished: furnished,
      has_parking: parking,
      has_wifi: wifi,
      has_security: security,
      has_generator: generator,
      specific_location: specificLocation.trim(),
    };
    if (apiPt) body.property_type = apiPt;
    if (bedrooms) body.bedrooms = bedrooms;
    if (areaSqm.trim()) {
      const n = parseFloat(areaSqm);
      if (!Number.isNaN(n) && n > 0) body.area_sqm = String(n);
    }
    if (askingPrice.trim()) {
      const n = parseFloat(askingPrice);
      if (!Number.isNaN(n) && n > 0) body.asking_price = String(n);
    }

    setLoading(true);
    try {
      const data = await propertyService.postPriceEstimate(body);
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-green-800 mb-2">
          <FiTrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {t('home.priceIntelBadge')}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('priceInsights.title')}
        </h1>
        <p className="text-gray-600 text-sm mb-8">
          {t('priceInsights.intro')}
        </p>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 mb-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.city')}
              <select
                value={cityForm}
                onChange={(ev) => setCityForm(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.neighborhood')}
              {isAddis ? (
                <select
                  value={subCityForm}
                  onChange={(ev) => setSubCityForm(ev.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {ADDIS_ABABA_SUB_CITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={subCityOther}
                  onChange={(ev) => setSubCityOther(ev.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  placeholder={t('priceInsights.neighborhoodPlaceholder')}
                />
              )}
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.propertyType')}
              <select
                value={propertyTypeForm}
                onChange={(ev) => setPropertyTypeForm(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {PROPERTY_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.listingType')}
              <select
                value={listingType}
                onChange={(ev) => setListingType(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {LISTING_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.bedrooms')}
              <select
                value={bedrooms}
                onChange={(ev) => setBedrooms(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">{t('priceInsights.optional')}</option>
                <option value="STUDIO">{t('search.studio')}</option>
                <option value="ONE">{t('search.oneBed')}</option>
                <option value="TWO">{t('search.twoBed')}</option>
                <option value="THREE_PLUS">{t('search.threePlusBed')}</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.bathrooms')}
              <input
                type="number"
                min={0}
                max={99}
                value={bathrooms}
                onChange={(ev) => setBathrooms(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('priceInsights.areaSqm')}
              <input
                value={areaSqm}
                onChange={(ev) => setAreaSqm(ev.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                placeholder=" e.g. 85"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            {t('priceInsights.specificLocation')}
            <input
              value={specificLocation}
              onChange={(ev) => setSpecificLocation(ev.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              placeholder={t('priceInsights.landmarkHint')}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            {t('priceInsights.yourAsk')}
            <input
              value={askingPrice}
              onChange={(ev) => setAskingPrice(ev.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              placeholder=" e.g. 35000"
            />
          </label>

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} />
              {t('priceInsights.furnished')}
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} />
              Parking
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} />
              Wi‑Fi
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={security} onChange={(e) => setSecurity(e.target.checked)} />
              Security
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={generator} onChange={(e) => setGenerator(e.target.checked)} />
              Generator
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 text-red-800 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {loading && <FiLoader className="w-4 h-4 animate-spin" />}
            {t('priceInsights.getEstimate')}
          </button>
        </form>

        {result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm px-4 py-3 flex gap-2">
              <FiInfo className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{result.disclaimer}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {t('priceInsights.marketSnapshot')}
              </h2>
              {result.aggregate && (
                <ul className="text-sm text-gray-700 space-y-1 mb-4">
                  <li>
                    {t('priceInsights.samples', { count: result.aggregate.listing_count })}
                  </li>
                  <li>
                    {t('priceInsights.range')}:
                    {' '}
                    {formatPrice(result.aggregate.min_price, 'ETB')}
                    {' '}
                    –
                    {' '}
                    {formatPrice(result.aggregate.max_price, 'ETB')}
                  </li>
                  <li>
                    {t('priceInsights.avg')}:
                    {' '}
                    {formatPrice(result.aggregate.avg_price, 'ETB')}
                  </li>
                </ul>
              )}

              {result.cached && (
                <p className="text-xs text-gray-500 mb-2">{t('priceInsights.cached')}</p>
              )}

              {result.ai_error === 'ai_disabled' && (
                <p className="text-sm text-gray-600">
                  {t('priceInsights.aiDisabled')}
                </p>
              )}

              {result.ai && (
                <>
                  <h3 className="text-md font-semibold text-gray-900 mt-4 mb-2">
                    {t('priceInsights.aiBand')}
                  </h3>
                  <p className="text-xl font-bold text-green-800">
                    {formatPrice(result.ai.suggested_low, 'ETB')}
                    {' '}
                    –
                    {' '}
                    {formatPrice(result.ai.suggested_high, 'ETB')}
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                      {t('priceInsights.mid')}:
                      {' '}
                      {formatPrice(result.ai.suggested_mid, 'ETB')}
                      {' '}
                      ·
                      {' '}
                      {t('priceInsights.confidence', { pct: result.ai.confidence_0_to_100 })}
                    </span>
                  </p>
                  {!!result.ai.summary && (
                    <p className="text-sm text-gray-700 mt-4 leading-relaxed">
                      {result.ai.summary}
                    </p>
                  )}
                  {!!(result.ai.factors && result.ai.factors.length) && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase">{t('priceInsights.drivers')}</p>
                      <ul className="list-disc ml-5 text-sm text-gray-700 mt-1 space-y-1">
                        {result.ai.factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!(result.ai.caveats && result.ai.caveats.length) && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase">{t('priceInsights.caveats')}</p>
                      <ul className="list-disc ml-5 text-sm text-gray-600 mt-1 space-y-1">
                        {result.ai.caveats.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-4">
                    {t('priceInsights.poweredBy', { provider: result.ai.provider, model: result.ai.model })}
                  </p>
                </>
              )}
            </div>

            <div className="text-center">
              <Link to="/search" className="text-sm text-green-700 font-semibold hover:underline">
                {t('priceInsights.backToSearch')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
