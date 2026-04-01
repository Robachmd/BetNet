import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPhone, FiLock, FiEye, FiEyeOff, FiUser, FiArrowRight,
  FiArrowLeft, FiCheck, FiHome, FiKey,
} from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import { validateEthiopianPhone, normalizePhoneNumber, getErrorMessage } from '../utils/helpers';
import { APP_NAME } from '../utils/constants';

const STEPS = [
  { title: 'Phone & Password', icon: FiKey },
  { title: 'Personal Info', icon: FiUser },
  { title: 'Choose Your Role', icon: FiHome },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: '',
    acceptTerms: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: '' }));
    setError('');
  };

  const validateStep = (stepIndex) => {
    const errors = {};

    if (stepIndex === 0) {
      if (!validateEthiopianPhone(form.phone)) {
        errors.phone = 'Enter a valid Ethiopian phone number (e.g. 09XXXXXXXX)';
      }
      if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (stepIndex === 1) {
      if (!form.firstName.trim()) errors.firstName = 'First name is required';
      if (!form.lastName.trim()) errors.lastName = 'Last name is required';
    }

    if (stepIndex === 2) {
      if (!form.role) errors.role = 'Please select a role';
      if (!form.acceptTerms) errors.acceptTerms = 'You must accept the terms';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    setError('');
    try {
      const userData = {
        phone: normalizePhoneNumber(form.phone),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      };

      await register(userData);
      navigate('/verify-otp', {
        state: { phone: userData.phone, from: '/', isRegistration: true },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ field }) =>
    fieldErrors[field] ? <p className="text-xs text-red-500 mt-1">{fieldErrors[field]}</p> : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-800 via-green-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute top-20 -right-20 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/" className="text-3xl font-bold text-white mb-4">
            {APP_NAME}
          </Link>
          <p className="text-green-100/80 text-lg mb-10 max-w-md leading-relaxed">
            Join thousands of Ethiopians finding their perfect rental homes and event venues.
          </p>

          {/* Steps Preview */}
          <div className="space-y-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.title} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone ? 'bg-green-400 text-white' : isActive ? 'bg-white text-green-800' : 'bg-green-600/30 text-green-300'
                  }`}>
                    {isDone ? <FiCheck className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive || isDone ? 'text-white' : 'text-green-300'}`}>
                      Step {i + 1}
                    </p>
                    <p className={`text-xs ${isActive || isDone ? 'text-green-100' : 'text-green-400'}`}>
                      {s.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-green-800">{APP_NAME}</Link>
          </div>

          {/* Mobile Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < step ? 'bg-green-600' : i === step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {step === 0 ? 'Create your account' : step === 1 ? 'Tell us about yourself' : 'How will you use BetRent?'}
          </h1>
          <p className="text-gray-500 mb-8 text-sm">
            Step {step + 1} of {STEPS.length} — {STEPS[step].title}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
          )}

          {/* Step 1: Phone & Password */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500 pointer-events-none">
                    <FiPhone className="w-4 h-4" />
                    <span className="text-sm font-medium">+251</span>
                    <div className="w-px h-5 bg-gray-300" />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="9X XXX XXXX"
                    maxLength={10}
                    className={`w-full pl-[100px] pr-4 py-3.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
                      fieldErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <FieldError field="phone" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Create a strong password"
                    className={`w-full pl-10 pr-12 py-3.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
                      fieldErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError field="password" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    placeholder="Re-enter your password"
                    className={`w-full pl-10 pr-12 py-3.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
                      fieldErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError field="confirmPassword" />
              </div>
            </div>
          )}

          {/* Step 2: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    className={`w-full pl-10 pr-4 py-3.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
                      fieldErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <FieldError field="firstName" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    className={`w-full pl-10 pr-4 py-3.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
                      fieldErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <FieldError field="lastName" />
              </div>
            </div>
          )}

          {/* Step 3: Role Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateField('role', 'renter')}
                  className={`p-6 rounded-2xl border-2 text-center transition-all ${
                    form.role === 'renter'
                      ? 'border-green-600 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                    form.role === 'renter' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <FiUser className={`w-7 h-7 ${form.role === 'renter' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-semibold mb-1 ${form.role === 'renter' ? 'text-green-800' : 'text-gray-800'}`}>
                    Renter
                  </p>
                  <p className="text-xs text-gray-500">I'm looking for a place to rent</p>
                </button>

                <button
                  type="button"
                  onClick={() => updateField('role', 'landlord')}
                  className={`p-6 rounded-2xl border-2 text-center transition-all ${
                    form.role === 'landlord'
                      ? 'border-green-600 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                    form.role === 'landlord' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <FiHome className={`w-7 h-7 ${form.role === 'landlord' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-semibold mb-1 ${form.role === 'landlord' ? 'text-green-800' : 'text-gray-800'}`}>
                    Landlord
                  </p>
                  <p className="text-xs text-gray-500">I want to list my property</p>
                </button>
              </div>
              <FieldError field="role" />

              <label className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors ${
                fieldErrors.acceptTerms ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => updateField('acceptTerms', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="/terms" className="text-green-600 hover:underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-green-600 hover:underline font-medium">Privacy Policy</a>
                </span>
              </label>
              <FieldError field="acceptTerms" />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors"
              >
                Continue
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <FiCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-green-700 font-semibold hover:text-green-800">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
