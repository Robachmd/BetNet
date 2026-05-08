import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiPlus, FiTrash2 } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { bookingService } from '../../services/bookings';
import propertyService from '../../services/properties';
import { ensureArray, getErrorMessage, listFromApi } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function PropertyOwnerAvailabilityPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [datesLoading, setDatesLoading] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await propertyService.getMyProperties({ page_size: 200 });
      const list = listFromApi(data);
      setProperties(list);
      if (!selectedPropertyId && list.length > 0) {
        setSelectedPropertyId(String(list[0].id));
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  const loadUnavailable = useCallback(async (propertyId) => {
    if (!propertyId) return;
    setDatesLoading(true);
    try {
      const data = await bookingService.listUnavailableDates(propertyId);
      setUnavailableDates(listFromApi(data));
    } catch (e) {
      toast.error(getErrorMessage(e));
      setUnavailableDates([]);
    } finally {
      setDatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    loadUnavailable(selectedPropertyId);
  }, [selectedPropertyId, loadUnavailable]);

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/property-owner',
      properties: '/dashboard/property-owner',
      'add-property': '/dashboard/property-owner/add-property',
      'listing-packages': '/dashboard/property-owner/listing-packages',
      bookings: '/dashboard/property-owner/bookings',
      availability: '/dashboard/property-owner/availability',
      reviews: '/dashboard/property-owner/reviews',
      analytics: '/dashboard/property-owner/analytics',
      notifications: '/dashboard/property-owner/notifications',
      messages: '/chat',
      settings: '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const selectedProperty = useMemo(() => {
    const id = Number(selectedPropertyId);
    return ensureArray(properties).find((p) => Number(p.id) === id) || null;
  }, [properties, selectedPropertyId]);

  const addDate = async () => {
    if (!selectedPropertyId) return;
    if (!newDate) {
      toast.error('Choose a date to block');
      return;
    }
    try {
      await bookingService.addUnavailableDate({
        propertyId: Number(selectedPropertyId),
        date: newDate,
        reason: reason.trim(),
      });
      setNewDate('');
      setReason('');
      toast.success('Date blocked');
      await loadUnavailable(selectedPropertyId);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const removeDate = async (id) => {
    try {
      await bookingService.deleteUnavailableDate(id);
      toast.success('Removed');
      await loadUnavailable(selectedPropertyId);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const rows = ensureArray(unavailableDates);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="property_owner"
        activeKey="availability"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0 w-full min-h-screen">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-green-800">Availability</span>
          <button type="button" onClick={() => navigate('/dashboard/property-owner')} className="text-sm text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FiCalendar className="w-6 h-6 text-green-700" />
              Blocked dates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Mark dates as unavailable for halls, short-stays, or any listing.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading your properties..." />
          ) : properties.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No properties yet"
              description="Create a listing first, then come back to manage availability."
            />
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Property</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.title} ({p.city || '—'})
                    </option>
                  ))}
                </select>
                {selectedProperty && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: <span className="font-medium text-gray-700">{selectedProperty.title}</span>
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Reason (optional)</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Reserved, maintenance"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addDate}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800"
                >
                  <FiPlus className="w-4 h-4" />
                  Block date
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">Blocked dates</h2>
                  <button
                    type="button"
                    onClick={() => loadUnavailable(selectedPropertyId)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                    disabled={datesLoading}
                  >
                    Refresh
                  </button>
                </div>

                {datesLoading ? (
                  <LoadingSpinner text="Loading blocked dates..." />
                ) : rows.length === 0 ? (
                  <EmptyState
                    icon="calendar"
                    title="No blocked dates"
                    description="Add a date above to mark it unavailable."
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.date}</p>
                          {r.reason ? (
                            <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">No reason</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDate(r.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

