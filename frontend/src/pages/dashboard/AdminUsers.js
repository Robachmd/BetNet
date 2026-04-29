import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiChevronDown, FiEye, FiUserCheck,
  FiUserX, FiArrowLeft, FiUser, FiPhone, FiCalendar,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatPhoneNumber, getAvatarUrl, getErrorMessage, listFromApi, ensureArray } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ role: '', verified: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 20 };
      if (searchQuery) params.q = searchQuery;
      if (filters.role) params.role = filters.role;
      if (filters.verified) params.isVerified = filters.verified === 'true';

      const { data } = await api.get('/admin/users', { params });
      const list = listFromApi(data);
      setUsers(list);
      setTotalPages(data.totalPages || data.pagination?.totalPages || Math.ceil((data.total || list.length) / 20));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filters]);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadUsers();
  }, [isAdmin, navigate, loadUsers]);

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
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
    loadUsers();
  };

  const roleBadge = (role) => {
    const config = {
      admin: { variant: 'error', label: 'Admin' },
      landlord: { variant: 'info', label: 'Property Owner' },
      renter: { variant: 'neutral', label: 'Renter' },
    };
    const c = config[role] || config.renter;
    return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
  };
  const safeUsers = ensureArray(users);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" activeKey="admin-users" user={user} onNavigate={handleNavigation} onLogout={logout} />

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Users</h1>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone..."
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                <select
                  value={filters.role}
                  onChange={(e) => { setFilters((f) => ({ ...f, role: e.target.value })); setCurrentPage(1); }}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Roles</option>
                  <option value="renter">Renter</option>
                  <option value="landlord">Property Owner</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={filters.verified}
                  onChange={(e) => { setFilters((f) => ({ ...f, verified: e.target.value })); setCurrentPage(1); }}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100"
                >
                  <option value="">All Verification</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSpinner text="Loading users..." />
          ) : safeUsers.length === 0 ? (
            <EmptyState icon="default" title="No users found" description="Try adjusting your search or filters." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Phone</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Verified</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {safeUsers.map((u) => (
                      <tr key={u.id || u._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {u.avatar || u.photo ? (
                              <img src={getAvatarUrl(u.avatar || u.photo)} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                                {u.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <span className="font-medium text-gray-800 truncate max-w-[150px]">{u.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          {formatPhoneNumber(u.phone) || '-'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {u.isVerified || u.verified ? (
                            <Badge variant="verified" size="sm" icon>Yes</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">No</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge
                            variant={u.status === 'disabled' ? 'error' : 'success'}
                            size="sm" dot
                          >
                            {u.status || 'active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailModal({ open: true, user: u })}
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(u.id || u._id, u.status || 'active')}
                              disabled={actionLoading === (u.id || u._id)}
                              className={`p-2 rounded-lg disabled:opacity-50 ${
                                u.status === 'disabled'
                                  ? 'text-green-500 hover:bg-green-50 hover:text-green-700'
                                  : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                              }`}
                              title={u.status === 'disabled' ? 'Enable User' : 'Disable User'}
                            >
                              {u.status === 'disabled' ? <FiUserCheck className="w-4 h-4" /> : <FiUserX className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-4 border-t border-gray-100">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* User Detail Modal */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, user: null })}
        title="User Details"
        size="md"
      >
        {detailModal.user && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {detailModal.user.avatar || detailModal.user.photo ? (
                <img src={getAvatarUrl(detailModal.user.avatar || detailModal.user.photo)} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold">
                  {detailModal.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{detailModal.user.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{detailModal.user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: FiPhone, label: 'Phone', value: formatPhoneNumber(detailModal.user.phone) },
                { icon: FiUser, label: 'Role', value: detailModal.user.role },
                { icon: FiCalendar, label: 'Joined', value: formatDate(detailModal.user.createdAt) },
                { icon: FiUserCheck, label: 'Verified', value: (detailModal.user.isVerified || detailModal.user.verified) ? 'Yes' : 'No' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <item.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 capitalize">{item.value || '-'}</p>
                  </div>
                </div>
              ))}
            </div>

            {detailModal.user.email && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-800">{detailModal.user.email}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
