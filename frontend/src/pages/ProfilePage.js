import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMail, FiLock, FiCamera, FiSave, FiEye,
  FiEyeOff, FiBell, FiCheck, FiShield, FiHome, FiCalendar,
  FiStar, FiAlertCircle,
} from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import authService from '../services/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import {
  formatPhoneNumber, getAvatarUrl, getInitials, getErrorMessage,
  validateEthiopianPhone, normalizePhoneNumber,
} from '../utils/helpers';

const NOTIFICATION_PREFS = [
  { key: 'newListings', label: 'New listings in my area', description: 'Get notified when new properties are listed near you' },
  { key: 'bookingUpdates', label: 'Booking updates', description: 'Confirmations, cancellations, and reminders' },
  { key: 'messages', label: 'Chat messages', description: 'When a landlord or renter sends you a message' },
  { key: 'priceDrops', label: 'Price drops', description: 'When a favorited property lowers its price' },
  { key: 'promotions', label: 'Promotions & tips', description: 'Offers, rental tips, and BetRent news' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  const [notifications, setNotifications] = useState({
    newListings: true,
    bookingUpdates: true,
    messages: true,
    priceDrops: false,
    promotions: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
      if (user.notifications) {
        setNotifications((prev) => ({ ...prev, ...user.notifications }));
      }
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  const clearMessages = () => { setSuccess(''); setError(''); };

  const handleProfileSave = async () => {
    clearMessages();
    setSaving(true);
    try {
      if (avatarFile) {
        await authService.updateProfilePhoto(avatarFile);
      }
      await updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        bio: profile.bio.trim(),
      });
      setSuccess('Profile updated successfully!');
      setAvatarFile(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    clearMessages();
    const errors = {};
    if (!passwords.currentPassword) errors.currentPassword = 'Current password is required';
    if (passwords.newPassword.length < 6) errors.newPassword = 'Must be at least 6 characters';
    if (passwords.newPassword !== passwords.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully!');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    clearMessages();
    setSaving(true);
    try {
      await updateProfile({ notifications });
      setSuccess('Notification preferences updated!');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  if (authLoading) return <LoadingSpinner fullScreen text="Loading profile..." />;

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'password', label: 'Password', icon: FiLock },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-emerald-900 pb-24 pt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-green-200 text-sm">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-green-100">
                {avatarPreview || user.avatar ? (
                  <img
                    src={avatarPreview || getAvatarUrl(user.avatar)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-green-700">
                    {getInitials(`${user.firstName} ${user.lastName}`)}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center hover:bg-green-800 transition-colors shadow-lg"
              >
                <FiCamera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-gray-500">{formatPhoneNumber(user.phone)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant={user.role === 'landlord' ? 'info' : 'success'} size="sm" icon>
                  {user.role === 'landlord' ? 'Landlord' : 'Renter'}
                </Badge>
                {user.isVerified && (
                  <Badge variant="verified" size="sm" icon>Verified</Badge>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 text-center">
              {user.role === 'landlord' ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.listingsCount || 0}</p>
                    <p className="text-xs text-gray-500">Listings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.averageRating?.toFixed(1) || '—'}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.bookingsCount || 0}</p>
                    <p className="text-xs text-gray-500">Bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.favoritesCount || 0}</p>
                    <p className="text-xs text-gray-500">Saved</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Verification Banner */}
        {!user.isVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <FiShield className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Your account is not verified</p>
              <p className="text-xs text-yellow-600">Verify your identity to unlock all features and build trust.</p>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors">
              Verify Now
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); clearMessages(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-green-700 border-b-2 border-green-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Messages */}
            {success && (
              <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                <FiCheck className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formatPhoneNumber(profile.phone)}
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (optional)</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                  />
                </div>

                <button
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-5 max-w-md">
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => {
                  const labels = {
                    currentPassword: 'Current Password',
                    newPassword: 'New Password',
                    confirmPassword: 'Confirm New Password',
                  };
                  const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels[field]}</label>
                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPasswords[showKey] ? 'text' : 'password'}
                          value={passwords[field]}
                          onChange={(e) => {
                            setPasswords((p) => ({ ...p, [field]: e.target.value }));
                            if (passwordErrors[field]) setPasswordErrors((pe) => ({ ...pe, [field]: '' }));
                          }}
                          placeholder={labels[field]}
                          className={`w-full pl-10 pr-12 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 ${
                            passwordErrors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((sp) => ({ ...sp, [showKey]: !sp[showKey] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords[showKey] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors[field] && (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors[field]}</p>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiLock className="w-4 h-4" />
                  )}
                  Change Password
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {NOTIFICATION_PREFS.map((pref) => (
                  <label
                    key={pref.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{pref.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pref.description}</p>
                    </div>
                    <div className="relative flex-shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={notifications[pref.key]}
                        onChange={(e) => setNotifications((n) => ({ ...n, [pref.key]: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${notifications[pref.key] ? 'bg-green-600' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${notifications[pref.key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </label>
                ))}

                <button
                  onClick={handleNotificationsSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors mt-6"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  Save Preferences
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
