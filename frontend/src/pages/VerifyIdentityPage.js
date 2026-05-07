import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUploadCloud, FiShield, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import authService from '../services/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import { formatPhoneNumber, getErrorMessage } from '../utils/helpers';

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <FiCheckCircle className={`w-3.5 h-3.5 ${ok ? 'text-emerald-600' : 'text-gray-400'}`} />
      {label}
    </span>
  );
}

export default function VerifyIdentityPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const otpInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [status, setStatus] = useState(null);
  const [otp, setOtp] = useState('');
  const [files, setFiles] = useState({ idFront: null, idBack: null, selfie: null });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const phone = useMemo(() => user?.phone_number || user?.phone || '', [user]);
  const phoneVerified = Boolean(user?.phone_verified);
  const idVerified = Boolean(user?.id_verified);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authService.getIdentityVerification();
      setStatus(data);
      await refreshUser();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const submission = status?.submission || null;
  const submissionStatus = submission?.status || 'NOT_SUBMITTED';

  const requestOtp = async () => {
    if (!phone) return;
    setSuccess('');
    setError('');
    setOtpSending(true);
    try {
      await authService.requestOTP(phone);
      setSuccess('OTP sent. Enter the 6-digit code to verify your phone.');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!phone || otp.length !== 6) return;
    setSuccess('');
    setError('');
    setOtpVerifying(true);
    try {
      await authService.verifyOTP(phone, otp);
      await refreshUser();
      await loadStatus();
      setSuccess('Phone verified successfully.');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setOtpVerifying(false);
    }
  };

  const submitDocs = async () => {
    setSuccess('');
    setError('');
    setSubmitting(true);
    try {
      const res = await authService.submitIdentityVerification(files);
      setStatus((prev) => ({ ...(prev || {}), submission: res.submission }));
      setSuccess('Documents submitted. Status is now pending review.');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text="Loading verification..." />;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-gradient-to-br from-green-800 to-emerald-900 pb-20 pt-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-green-100 hover:text-white text-sm font-medium mb-4"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <FiShield className="w-6 h-6" /> Verify your identity
          </h1>
          <p className="text-green-200 text-sm">
            Verify your phone and submit ID documents to build trust and unlock all features.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Verification checklist</p>
              <p className="text-xs text-gray-500 mt-0.5">Complete the steps below.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill ok={phoneVerified} label="Phone verified" />
              <StatusPill ok={idVerified} label="ID verified" />
              <Badge
                variant={submissionStatus === 'APPROVED' ? 'verified' : submissionStatus === 'REJECTED' ? 'danger' : submissionStatus === 'PENDING' ? 'pending' : 'neutral'}
                size="sm"
                icon
              >
                {submissionStatus === 'NOT_SUBMITTED' ? 'No submission' : submissionStatus}
              </Badge>
            </div>
          </div>

          {(success || error) && (
            <div className="mt-5 space-y-2">
              {success && (
                <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 1: Phone verification */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Step 1, verify your phone</p>
              <p className="text-xs text-gray-500 mt-0.5">
                We&apos;ll send an OTP to <span className="font-semibold text-gray-700">{formatPhoneNumber(phone)}</span>.
              </p>
            </div>
            <StatusPill ok={phoneVerified} label={phoneVerified ? 'Completed' : 'Required'} />
          </div>

          {!phoneVerified ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={requestOtp}
                disabled={otpSending || !phone}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {otpSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiRefreshCw className="w-4 h-4" />
                )}
                Send OTP
              </button>

              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <input
                  ref={otpInputRef}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={otpVerifying || otp.length !== 6}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 disabled:bg-emerald-300 disabled:cursor-not-allowed"
                >
                  {otpVerifying ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiCheckCircle className="w-4 h-4" />
                  )}
                  Verify OTP
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
              Your phone number is verified.
            </div>
          )}
        </div>

        {/* Step 2: ID documents */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Step 2, submit ID documents</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload your ID and a selfie. Your submission will be reviewed.
              </p>
            </div>
            <StatusPill ok={idVerified} label={idVerified ? 'Completed' : 'Required'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'idFront', label: 'ID front', accept: 'image/*' },
              { key: 'idBack', label: 'ID back (optional)', accept: 'image/*' },
              { key: 'selfie', label: 'Selfie', accept: 'image/*' },
            ].map((f) => (
              <label
                key={f.key}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <FiUploadCloud className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{f.label}</span>
                <span className="text-xs text-gray-400">
                  {files[f.key] ? files[f.key].name : 'Click to choose file'}
                </span>
                <input
                  type="file"
                  accept={f.accept}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFiles((p) => ({ ...p, [f.key]: file }));
                  }}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              type="button"
              onClick={submitDocs}
              disabled={submitting || (!files.idFront && !files.selfie)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiUploadCloud className="w-4 h-4" />
              )}
              Submit for review
            </button>

            <button
              type="button"
              onClick={loadStatus}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 disabled:cursor-not-allowed"
            >
              Refresh status
            </button>
          </div>

          {submission && (
            <div className="mt-5 text-xs text-gray-500">
              Latest submission: <span className="font-semibold text-gray-700">{submission.status}</span>
              {submission.created_at ? `, submitted ${new Date(submission.created_at).toLocaleString()}` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

