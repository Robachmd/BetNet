import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiCheck, FiX, FiTrash2, FiEye,
  FiChevronDown, FiAlertCircle, FiArrowLeft,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { propertyService } from '../../services/properties';
import { PROPERTY_TYPES, CITIES } from '../../utils/constants';
import { formatPrice, getImageUrl, getErrorMessage } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminListings() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ verified: '', propertyType: '', city: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectModal, setRejectModal] = useState({ open: false, propertyId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 15 };
      if (searchQuery) params.q = searchQuery;
      if (filters.verified === 'true') params.isVerified = true;
      if (filters.verified === 'false') params.isVerified = false;
      if (filters.propertyType) params.propertyType = filters.propertyType;
      if (filters.city) params.city = filters.city;

      let data;
      try {
        const resp = await api.get('/admin/properties', { params });
        data = resp.data;
      } catch {
        data = await propertyService.getProperties(params);
      }

      const list = data.properties || data.data || data || [];
      setProperties(list);
      setTotalPages(data.totalPages || data.pagination?.totalPages || Math.ceil((data.total || list.length) / 15));
    } catch {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filters]);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadProperties();
  }, [isAdmin, navigate, loadProperties]);

  const handleVerify = async (id) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/properties/${id}/verify`);
      toast.success('Property verified');
      loadProperties();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.propertyId) return;
    setActionLoading(rejectModal.propertyId);
    try {
      await api.put(`/admin/properties/${rejectModal.propertyId}/reject`, { reason: rejectReason });
      toast.success('Property rejected');
      setRejectModal({ open: false, propertyId: null });
      setRejectReason('');
      loadProperties();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    setActionLoading(id);
    try {
      await propertyService.deleteProperty(id);
      toast.success('Property deleted');
      loadProperties();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const confirmed = window.confirm(`${action} ${ids.length} properties?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        ids.map((id) => {
          if (action === 'Verify') return api.put(`/admin/properties/${id}/verify`);
          if (action === 'Delete') return propertyService.deleteProperty(id);
          return api.put(`/admin/properties/${id}/reject`, { reason: 'Bulk rejection' });
        })
      );
      toast.success(`${action} completed for ${ids.length} properties`);
      setSelectedIds(new Set());
      loadProperties();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map((p) => p.id)));
    }
  };

  const handleNavigation = (key) => {
    const routes = {
      'admin-dashboard': '/dashboard/admin',
      'admin-users': '/dashboard/admin/users',
      'admin-properties': '/dashboard/admin/listings',
      'admin-reports': '/dashboard/admin/analytics',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProperties();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" activeKey="admin-properties" user={user} onNavigate={handleNavigation} onLogout={logout} />

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Listings</h1>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                <button onClick={() => handleBulkAction('Verify')} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Verify</button>
                <button onClick={() => handleBulkAction('Reject')} className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">Reject</button>
                <button onClick={() => handleBulkAction('Delete')} className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">Delete</button>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white"
                />
              </form>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100"
              >
                <FiFilter className="w-4 h-4" /> Filters
                <FiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                <select
                  value={filters.verified}
                  onChange={(e) => { setFilters((f) => ({ ...f, verified: e.target.value })); setCurrentPage(1); }}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Verification</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
                <select
                  value={filters.propertyType}
                  onChange={(e) => { setFilters((f) => ({ ...f, propertyType: e.target.value })); setCurrentPage(1); }}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Types</option>
                  {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  value={filters.city}
                  onChange={(e) => { setFilters((f) => ({ ...f, city: e.target.value })); setCurrentPage(1); }}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Cities</option>
                  {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSpinner text="Loading listings..." />
          ) : properties.length === 0 ? (
            <EmptyState icon="property" title="No properties found" description="Try adjusting your filters." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === properties.length && properties.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Property</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Owner</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Price</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Verified</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {properties.map((property) => (
                      <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(property.id)}
                            onChange={() => toggleSelect(property.id)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getImageUrl(property.images?.[0])}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                            <span className="font-medium text-gray-800 truncate max-w-[180px]">
                              {property.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell truncate max-w-[120px]">
                          {property.owner?.name || property.landlordName || '-'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="neutral" size="sm">{property.propertyType || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium hidden sm:table-cell">
                          {formatPrice(property.price)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge
                            variant={property.status === 'available' ? 'success' : property.status === 'rejected' ? 'error' : 'neutral'}
                            size="sm" dot
                          >
                            {property.status || 'unknown'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {property.isVerified ? (
                            <Badge variant="verified" size="sm" icon>Yes</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">No</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/property/${property.id}`)}
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="View"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            {!property.isVerified && (
                              <button
                                onClick={() => handleVerify(property.id)}
                                disabled={actionLoading === property.id}
                                className="p-2 rounded-lg text-green-500 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                                title="Verify"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setRejectModal({ open: true, propertyId: property.id })}
                              className="p-2 rounded-lg text-orange-400 hover:bg-orange-50 hover:text-orange-600"
                              title="Reject"
                            >
                              <FiAlertCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(property.id)}
                              disabled={actionLoading === property.id}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-4 border-t border-gray-100">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => { setRejectModal({ open: false, propertyId: null }); setRejectReason(''); }}
        title="Reject Property"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setRejectModal({ open: false, propertyId: null }); setRejectReason(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Please provide a reason for rejecting this property listing.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
      </Modal>
    </div>
  );
}
