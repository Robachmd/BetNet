import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/auth';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => authService.isAuthenticated()
  );

  const loadUser = useCallback(async () => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const profile = await authService.getProfile();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    loadUser().finally(() => setIsLoading(false));
  }, [loadUser]);

  const login = useCallback(async (phone, password) => {
    const data = await authService.login(phone, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await authService.register(userData);
    if (data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  }, []);

  const verifyOTP = useCallback(async (phone, otp) => {
    const data = await authService.verifyOTP(phone, otp);
    if (data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    const updatedUser = await authService.updateProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      return profile;
    } catch {
      return null;
    }
  }, []);

  const switchAppMode = useCallback(async (mode) => {
    const data = await authService.setActiveAppMode(mode);
    setUser(data);
    return data;
  }, []);

  const becomePropertyOwner = useCallback(async () => {
    const res = await authService.enablePropertyOwner();
    if (res.user) {
      setUser(res.user);
    } else {
      await refreshUser();
    }
    return res;
  }, [refreshUser]);

  const contextValue = useMemo(() => {
    const roleN = (user?.role || '').toLowerCase();
    const isPropertyOwnerRole = roleN === 'landlord';
    const isRenterRole = roleN === 'renter';
    const isAdmin = roleN === 'admin';
    const propertyOwnerEligible = user?.landlord_eligible === true;
    // Property owner UI is only for landlord accounts (or admins). Renters must register
    // a separate property owner account to list; no "upgrade on same account" for dashboard access.
    const canAccessPropertyOwner = isPropertyOwnerRole || isAdmin;
    const activeApp = (user?.active_app_mode || 'RENTER').toLowerCase();
    const isOwnerMode = activeApp === 'landlord';
    return {
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      verifyOTP,
      logout,
      updateProfile,
      refreshUser,
      switchAppMode,
      becomePropertyOwner,
      isPropertyOwner: isPropertyOwnerRole,
      isRenter: isRenterRole,
      isAdmin,
      propertyOwnerEligible,
      canAccessPropertyOwner,
      isOwnerMode,
      activeAppMode: user?.active_app_mode || 'RENTER',
      // Backward-compatible aliases for existing call sites.
      becomeLandlord: becomePropertyOwner,
      isLandlord: isPropertyOwnerRole,
      landlordEligible: propertyOwnerEligible,
      canAccessLandlord: canAccessPropertyOwner,
    };
  }, [user, isAuthenticated, isLoading, login, register, verifyOTP, logout, updateProfile, refreshUser, switchAppMode, becomePropertyOwner]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
