import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProtectedRoute({
  children,
  isAuthenticated = false,
  isLoading = false,
  userRole = null,
  requiredRole = null,
  redirectTo = '/login',
  onRedirect = null,
  fallback = null,
}) {
  if (isLoading) {
    return <LoadingSpinner fullScreen text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    if (onRedirect) {
      onRedirect(redirectTo);
      return null;
    }
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null;
    }
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-sm mx-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-50 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-500 mb-6">Please log in to access this page.</p>
          <a
            href={redirectTo}
            className="inline-block px-6 py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <span className="text-3xl">⛔</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500 mb-6">
              You don&apos;t have permission to view this page.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
