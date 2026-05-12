import React, { useState, useEffect, useCallback } from 'react';
import { FiMapPin, FiTrash2, FiPlus, FiBell, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { CITIES, ADDIS_ABABA_SUB_CITIES, PROPERTY_TYPES } from '../../utils/constants';
import { locationAlertsService } from '../../services/locationAlerts';
import { getErrorMessage } from '../../utils/helpers';
import { InlineListSkeleton } from '../common/Skeletons';
import toast from 'react-hot-toast';

const ADDIS = 'addis_ababa';

const emptyForm = {
  label: '',
  cityValue: 'addis_ababa',
  subCityValue: '',
  subCityFree: '',
  propertyType: '',
  useRadius: false,
  latitude: '',
  longitude: '',
  radius_km: 5,
};

function cityLabelFromValue(value) {
  return CITIES.find((c) => c.value === value)?.label || value;
}

function buildPayloadFromForm(f) {
  const normalizePropertyTypeEnum = (v) => {
    const s = String(v || '').trim().toLowerCase();
    const map = {
      apartment: 'APARTMENT',
      villa: 'VILLA',
      house: 'SERVICE_HOUSE',
      condominium: 'CONDOMINIUM',
      shop: 'BUSINESS_SHOP',
      commercial: 'BUSINESS_SHOP',
      office: 'REAL_ESTATE',
      warehouse: 'REAL_ESTATE',
      hall: 'HALL_RENTAL',
      hall_rental: 'HALL_RENTAL',
    };
    if (s && map[s]) return map[s];
    const up = String(v || '').trim().toUpperCase();
    const ok = new Set([
      'APARTMENT',
      'VILLA',
      'SERVICE_HOUSE',
      'CONDOMINIUM',
      'REAL_ESTATE',
      'BUSINESS_SHOP',
      'HALL_RENTAL',
    ]);
    return ok.has(up) ? up : '';
  };

  const city = cityLabelFromValue(f.cityValue);
  const sub = f.cityValue === ADDIS
    ? (f.subCityValue
        ? ADDIS_ABABA_SUB_CITIES.find((s) => s.value === f.subCityValue)?.label || f.subCityValue
        : '')
    : (f.subCityFree || '').trim();
  const latStr = f.latitude != null && String(f.latitude).trim() !== '' ? String(f.latitude).trim() : '';
  const lonStr = f.longitude != null && String(f.longitude).trim() !== '' ? String(f.longitude).trim() : '';
  if (f.useRadius && (latStr === '' || lonStr === '')) {
    return { error: 'Enter both latitude and longitude for a radius alert, or turn off “Precise radius”.' };
  }
  return {
    payload: {
      label: f.label.trim() || '',
      city,
      sub_city: sub,
      property_type: normalizePropertyTypeEnum(f.propertyType),
      latitude: f.useRadius && latStr ? Number(latStr) : null,
      longitude: f.useRadius && lonStr ? Number(lonStr) : null,
      radius_km: f.useRadius && latStr && lonStr
        ? Math.min(100, Math.max(1, Number(f.radius_km) || 5))
        : 5,
      is_active: true,
    },
  };
}

export default function LocationAlertsPanel({ className = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openForm, setOpenForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await locationAlertsService.list();
      setItems(list);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const { payload, error } = buildPayloadFromForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    if (!payload.city) {
      toast.error('Choose a city');
      return;
    }
    setSaving(true);
    try {
      await locationAlertsService.create(payload);
      toast.success('We will notify you when new listings match this area.');
      setForm(emptyForm);
      setOpenForm(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this area alert?')) return;
    try {
      await locationAlertsService.remove(id);
      toast.success('Area alert removed');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggleActive = async (row) => {
    try {
      await locationAlertsService.update(row.id, { is_active: !row.is_active });
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiBell className="w-5 h-5 text-green-600" />
            New listing alerts by area
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Choose cities (and optionally a sub-area or a map point + radius). When a property is
            <span className="font-medium text-gray-700"> first published</span> in that area, we will notify
            you here (respects your “new listing” notification preference in your profile).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenForm((o) => !o)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 shrink-0"
        >
          {openForm ? 'Close' : <><FiPlus className="w-4 h-4" /> Add area</>}
        </button>
      </div>

      {openForm && (
        <form onSubmit={submit} className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
            <input
              className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Near work"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
            <select
              className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
              value={form.cityValue}
              onChange={(e) => setForm((f) => ({
                ...f,
                cityValue: e.target.value,
                subCityValue: '',
                subCityFree: '',
              }))}
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {form.cityValue === ADDIS ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sub-city (optional)</label>
              <select
                className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.subCityValue}
                onChange={(e) => setForm((f) => ({ ...f, subCityValue: e.target.value }))}
              >
                <option value="">Whole city / any sub-city</option>
                {ADDIS_ABABA_SUB_CITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sub-area (optional)</label>
              <input
                className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.subCityFree || ''}
                onChange={(e) => setForm((f) => ({ ...f, subCityFree: e.target.value }))}
                placeholder="Neighborhood or area name, if you know it"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Property type (optional)</label>
            <select
              className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
              value={form.propertyType || ''}
              onChange={(e) => setForm((ff) => ({ ...ff, propertyType: e.target.value }))}
            >
              <option value="">Any type</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              If set, you will only be notified for new listings of this type in the chosen area.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.useRadius}
                onChange={(e) => setForm((f) => ({ ...f, useRadius: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Precise area (use map coordinates + radius in km)
            </label>
            <p className="text-xs text-gray-500 mt-1">
              If set, a listing is matched when it is within the radius of your point. Otherwise we match
              by city, or by sub-city when you select one.
            </p>
            {form.useRadius && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="e.g. 8.99"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="e.g. 38.79"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Radius (km)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    type="number"
                    min={1}
                    max={100}
                    value={form.radius_km}
                    onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save area'}
            </button>
            <button
              type="button"
              onClick={() => { setOpenForm(false); setForm(emptyForm); }}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <InlineListSkeleton rows={3} />
      ) : items.length === 0 && !openForm ? (
        <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-200 rounded-xl">
          No areas yet. Add the cities or neighborhoods you care about to get instant alerts.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <FiMapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {row.label || 'Area alert'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.city}
                    {row.sub_city ? ` · ${row.sub_city}` : ''}
                    {row.latitude != null && row.longitude != null
                      ? ` · ~${row.radius_km} km from pin`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => toggleActive(row)}
                  className="p-1.5 text-gray-500 hover:text-gray-800"
                  title={row.is_active ? 'Pause' : 'Resume'}
                  aria-label={row.is_active ? 'Pause' : 'Resume'}
                >
                  {row.is_active
                    ? <FiToggleRight className="w-7 h-7 text-green-600" />
                    : <FiToggleLeft className="w-7 h-7 text-gray-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
