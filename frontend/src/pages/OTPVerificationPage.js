import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import authService from '../services/auth';
import { formatPhoneNumber, getErrorMessage } from '../utils/helpers';
import { APP_NAME } from '../utils/constants';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP } = useAuth();

  const phone = location.state?.phone || '';
  const from = location.state?.from || '/';
  const isRegistration = location.state?.isRegistration || false;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
  }, [phone, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback((index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (digits.length > 1) {
        const newOtp = [...otp];
        for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i++) {
          newOtp[index + i] = digits[i];
        }
        setOtp(newOtp);
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const otpString = otp.join('');
  const isComplete = otpString.length === OTP_LENGTH;

  const handleVerify = useCallback(async () => {
    if (!isComplete) return;
    setLoading(true);
    setError('');
    try {
      await verifyOTP(phone, otpString);
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 1500);
    } catch (err) {
      setError(getErrorMessage(err));
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [isComplete, phone, otpString, verifyOTP, from, navigate]);

  useEffect(() => {
    if (isComplete && !loading && !success) {
      handleVerify();
    }
  }, [isComplete, loading, success, handleVerify]);

  const handleResend = async () => {
    if (resendTimer > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      await authService.requestOTP(phone);
      setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-bold text-green-800 inline-block mb-8">
            {APP_NAME}
          </Link>

          {success ? (
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <FiCheck className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {success ? 'Verified!' : 'Verify your phone'}
          </h1>
          <p className="text-gray-500 text-sm">
            {success
              ? 'Your phone number has been verified successfully.'
              : (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="font-semibold text-gray-800">{formatPhoneNumber(phone)}</span>
                </>
              )}
          </p>
        </div>

        {!success && (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6 text-center">
                {error}
              </div>
            )}

            {/* OTP Input Boxes */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  maxLength={OTP_LENGTH}
                  className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none ${
                    digit
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 bg-gray-50 text-gray-800'
                  } focus:border-green-500 focus:ring-4 focus:ring-green-100`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={!isComplete || loading}
              className="w-full py-3.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify Code
                  <FiCheck className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend */}
            <div className="text-center mt-6">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-400">
                  Resend code in <span className="font-semibold text-gray-600">{formatTime(resendTimer)}</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center gap-2 text-sm text-green-700 font-semibold hover:text-green-800 disabled:text-gray-400"
                >
                  {resendLoading ? (
                    <div className="w-4 h-4 border-2 border-green-300 border-t-green-700 rounded-full animate-spin" />
                  ) : (
                    <FiRefreshCw className="w-4 h-4" />
                  )}
                  Resend Code
                </button>
              )}
            </div>

            {/* Back to Login */}
            <div className="text-center mt-8">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
