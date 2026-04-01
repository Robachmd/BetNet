import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const HallRentalPage = lazy(() => import('./pages/HallRentalPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OTPVerificationPage = lazy(() => import('./pages/OTPVerificationPage'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const RenterDashboard = lazy(() => import('./pages/dashboard/RenterDashboard'));
const LandlordDashboard = lazy(() => import('./pages/dashboard/LandlordDashboard'));
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
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
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
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="/halls" element={<HallRentalPage />} />

        {/* Guest-only routes */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/verify-otp" element={<OTPVerificationPage />} />

        {/* Protected routes */}
        <Route
          path="/property/:id/book"
          element={<ProtectedRoute><BookingPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/renter"
          element={
            <ProtectedRoute allowedRoles={['renter']}>
              <RenterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord"
          element={
            <ProtectedRoute allowedRoles={['landlord']}>
              <LandlordDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/add-property"
          element={
            <ProtectedRoute allowedRoles={['landlord']}>
              <AddPropertyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/edit-property/:id"
          element={
            <ProtectedRoute allowedRoles={['landlord']}>
              <EditPropertyPage />
            </ProtectedRoute>
          }
        />
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
          path="/favorites"
          element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
