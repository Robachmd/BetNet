import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiPhone, FiLock, FiEye, FiEyeOff, FiArrowRight, FiSmartphone } from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import authService from '../services/auth';
import { validateEthiopianPhone, normalizePhoneNumber, getErrorMessage } from '../utils/helpers';
import { APP_NAME } from '../utils/constants';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from || '/';

  const [mode, setMode] = useState('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEthiopianPhone(phone)) {
      setError('Please enter a valid Ethiopian phone number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      await login(normalizedPhone, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOTPRequest = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEthiopianPhone(phone)) {
      setError('Please enter a valid Ethiopian phone number');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      await authService.requestOTP(normalizedPhone);
      navigate('/verify-otp', { state: { phone: normalizedPhone, from } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-800 via-green-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute top-20 -right-20 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/" className="text-3xl font-bold text-white mb-4">
            {APP_NAME}
          </Link>
          <p className="text-green-100/80 text-lg mb-8 max-w-md leading-relaxed">
            Ethiopia's trusted rental marketplace. Find verified apartments, villas, and event halls across the country.
          </p>
          <div className="space-y-4">
            {['Verified listings you can trust', 'Price insights for fair rentals', 'Direct contact with landlords'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-green-200">
                <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                  <FiArrowRight className="w-3 h-3" />
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="text-2xl font-bold text-green-800">
              {APP_NAME}
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">
            {mode === 'password' ? 'Sign in with your phone number and password' : 'We\'ll send you a one-time code'}
          </p>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { setMode('password'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode('otp'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login with OTP
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleOTPRequest}>
            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500 pointer-events-none">
                  <FiPhone className="w-4 h-4" />
                  <span className="text-sm font-medium">+251</span>
                  <div className="w-px h-5 bg-gray-300" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="9X XXX XXXX"
                  maxLength={10}
                  className="w-full pl-[100px] pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            {mode === 'password' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right mt-2">
                  <Link to="/forgot-password" className="text-xs text-green-600 hover:text-green-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
              </div>
            )}

            {mode === 'otp' && (
              <p className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
                <FiSmartphone className="w-3.5 h-3.5" />
                We'll send a 6-digit code to your phone via SMS
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'password' ? (
                <>
                  Sign In
                  <FiArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Send OTP Code
                  <FiSmartphone className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-700 font-semibold hover:text-green-800">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
