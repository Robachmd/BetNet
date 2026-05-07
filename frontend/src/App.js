import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PublicLayout from './components/layout/PublicLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const HallRentalPage = lazy(() => import('./pages/HallRentalPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OTPVerificationPage = lazy(() => import('./pages/OTPVerificationPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const SafetyPage = lazy(() => import('./pages/SafetyPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const PressPage = lazy(() => import('./pages/PressPage'));
const ListPropertyPage = lazy(() => import('./pages/ListPropertyPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const RenterDashboard = lazy(() => import('./pages/dashboard/RenterDashboard'));
const PropertyOwnerDashboard = lazy(() => import('./pages/dashboard/LandlordDashboard'));
const PropertyOwnerListingPackagesPage = lazy(() => import('./pages/dashboard/LandlordListingPackagesPage'));
const PropertyOwnerBookingsPage = lazy(() => import('./pages/dashboard/PropertyOwnerBookingsPage'));
const PropertyOwnerReviewsPage = lazy(() => import('./pages/dashboard/PropertyOwnerReviewsPage'));
const PropertyOwnerAnalyticsPage = lazy(() => import('./pages/dashboard/PropertyOwnerAnalyticsPage'));
const PropertyOwnerNotificationsPage = lazy(() => import('./pages/dashboard/PropertyOwnerNotificationsPage'));
const AddPropertyPage = lazy(() => import('./pages/dashboard/AddPropertyPage'));
const EditPropertyPage = lazy(() => import('./pages/dashboard/EditPropertyPage'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));
const AdminListings = lazy(() => import('./pages/dashboard/AdminListings'));
const AdminUsers = lazy(() => import('./pages/dashboard/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/dashboard/AdminAnalytics'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ChatDetailPage = lazy(() => import('./pages/ChatDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const VerifyIdentityPage = lazy(() => import('./pages/VerifyIdentityPage'));
const PriceInsightsPage = lazy(() => import('./pages/PriceInsightsPage'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-800 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading, canAccessPropertyOwner } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roleNorm = (user?.role || '').toLowerCase();
    const allowedNorm = allowedRoles.map((r) => r.toLowerCase());
    const ok = allowedNorm.some((allowed) => {
      if (allowed === 'landlord' || allowed === 'property_owner') {
        return canAccessPropertyOwner;
      }
      return roleNorm === allowed;
    });
    if (!ok) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public shell: Navbar, Footer, language switcher */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/price-insights" element={<PriceInsightsPage />} />
          <Route path="/property/:slug" element={<PropertyDetailPage />} />
          <Route path="/halls" element={<HallRentalPage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/press" element={<PressPage />} />
          <Route path="/list-property" element={<ListPropertyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          path="/property/:slug/book"
          element={<ProtectedRoute><BookingPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/renter"
          element={
            <ProtectedRoute>
              <RenterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/add-property"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <AddPropertyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/listing-packages"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerListingPackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/bookings"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/reviews"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/analytics"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/notifications"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <PropertyOwnerNotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/property-owner/edit-property/:slug"
          element={
            <ProtectedRoute allowedRoles={['property_owner']}>
              <EditPropertyPage />
            </ProtectedRoute>
          }
        />
        {/* Legacy landlord paths retained for backward compatibility */}
        <Route path="/dashboard/landlord" element={<Navigate to="/dashboard/property-owner" replace />} />
        <Route path="/dashboard/landlord/add-property" element={<Navigate to="/dashboard/property-owner/add-property" replace />} />
        <Route path="/dashboard/landlord/listing-packages" element={<Navigate to="/dashboard/property-owner/listing-packages" replace />} />
        <Route path="/dashboard/landlord/edit-property/:slug" element={<Navigate to="/dashboard/property-owner/edit-property/:slug" replace />} />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/listings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
        />
        <Route
          path="/chat/:conversationId"
          element={<ProtectedRoute><ChatDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />
        <Route
          path="/verify-identity"
          element={<ProtectedRoute><VerifyIdentityPage /></ProtectedRoute>}
        />
        <Route
          path="/favorites"
          element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
