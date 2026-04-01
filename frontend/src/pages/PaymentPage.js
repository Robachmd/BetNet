import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiCreditCard, FiCheck, FiX, FiArrowLeft, FiShield,
  FiClock, FiAlertCircle, FiChevronRight, FiSmartphone,
  FiDollarSign,
} from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import { paymentService } from '../services/payments';
import { PAYMENT_METHODS } from '../utils/constants';
import { formatPrice, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUS = { IDLE: 'idle', PROCESSING: 'processing', SUCCESS: 'success', FAILURE: 'failure' };

const methodIcons = {
  chapa: FiCreditCard,
  telebirr: FiSmartphone,
  cbe_birr: FiSmartphone,
  bank_transfer: FiDollarSign,
  cash: FiDollarSign,
};

export default function PaymentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bookingId = searchParams.get('bookingId');
  const amount = searchParams.get('amount');
  const propertyTitle = searchParams.get('title') || 'Property Rental';
  const txRef = searchParams.get('tx_ref');

  const [selectedMethod, setSelectedMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(STATUS.IDLE);
  const [transactionRef, setTransactionRef] = useState(txRef || '');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (txRef) {
      verifyPayment(txRef);
    }
  }, [txRef]);

  const verifyPayment = async (ref) => {
    setPaymentStatus(STATUS.PROCESSING);
    try {
      const result = await paymentService.verifyPayment(ref);
      if (result.status === 'success' || result.verified) {
        setPaymentStatus(STATUS.SUCCESS);
        setReceipt(result);
        setTransactionRef(ref);
      } else {
        setPaymentStatus(STATUS.FAILURE);
        setError(result.message || 'Payment verification failed');
      }
    } catch (err) {
      setPaymentStatus(STATUS.FAILURE);
      setError(getErrorMessage(err));
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setPaymentStatus(STATUS.PROCESSING);
    setError('');

    try {
      let result;
      const paymentData = {
        bookingId,
        amount: Number(amount),
        paymentMethod: selectedMethod,
        returnUrl: window.location.origin + '/payment?tx_ref=',
        description: propertyTitle,
        email: user?.email,
        phone: user?.phone,
        name: user?.name,
      };

      if (selectedMethod === 'chapa') {
        result = await paymentService.initiateChapaPayment(paymentData);
      } else if (selectedMethod === 'telebirr' || selectedMethod === 'cbe_birr') {
        result = await paymentService.initiateTelebirtPayment(paymentData);
      } else {
        result = await paymentService.initializePayment(paymentData);
      }

      if (result.checkoutUrl || result.checkout_url || result.redirectUrl) {
        window.location.href = result.checkoutUrl || result.checkout_url || result.redirectUrl;
        return;
      }

      if (result.transactionRef || result.tx_ref) {
        setTransactionRef(result.transactionRef || result.tx_ref);
        if (selectedMethod === 'bank_transfer' || selectedMethod === 'cash') {
          setPaymentStatus(STATUS.SUCCESS);
          setReceipt(result);
        } else {
          verifyPayment(result.transactionRef || result.tx_ref);
        }
      } else {
        setPaymentStatus(STATUS.SUCCESS);
        setReceipt(result);
      }
    } catch (err) {
      setPaymentStatus(STATUS.FAILURE);
      setError(getErrorMessage(err));
    }
  };

  const availableMethods = PAYMENT_METHODS.filter((m) => m.value !== 'cash');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <FiArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <FiShield className="w-5 h-5" />
              <span className="text-sm font-medium text-green-100">Secure Payment</span>
            </div>
            <h1 className="text-xl font-bold">BetRent Payment</h1>
          </div>

          <div className="p-6">
            {/* IDLE - Select method and pay */}
            {paymentStatus === STATUS.IDLE && (
              <>
                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Property</span>
                      <span className="font-medium text-gray-800 truncate ml-4 max-w-[200px]">{propertyTitle}</span>
                    </div>
                    {bookingId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Booking ID</span>
                        <span className="font-mono text-xs text-gray-500">{bookingId}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="text-xl font-bold text-green-700">{formatPrice(amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</h3>
                <div className="space-y-2 mb-6">
                  {availableMethods.map((method) => {
                    const Icon = methodIcons[method.value] || FiCreditCard;
                    const isSelected = selectedMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setSelectedMethod(method.value)}
                        className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                            {method.label}
                          </p>
                          {method.value === 'chapa' && <p className="text-xs text-gray-400">Credit/Debit Card, Mobile Money</p>}
                          {method.value === 'telebirr' && <p className="text-xs text-gray-400">Pay with Telebirr</p>}
                          {method.value === 'bank_transfer' && <p className="text-xs text-gray-400">Direct bank transfer</p>}
                          {method.value === 'cbe_birr' && <p className="text-xs text-gray-400">CBE Mobile Banking</p>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handlePayment}
                  disabled={!selectedMethod}
                  className="w-full py-3.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  Pay {formatPrice(amount)} <FiChevronRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
                  <FiShield className="w-3 h-3" /> Payments are secured and encrypted
                </p>
              </>
            )}

            {/* PROCESSING */}
            {paymentStatus === STATUS.PROCESSING && (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-5">
                  <div className="w-full h-full border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h2>
                <p className="text-sm text-gray-500 mb-1">Please wait while we process your payment...</p>
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <FiClock className="w-3 h-3" /> This may take a few moments
                </p>
              </div>
            )}

            {/* SUCCESS */}
            {paymentStatus === STATUS.SUCCESS && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheck className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h2>
                <p className="text-sm text-gray-500 mb-6">Your payment has been processed successfully.</p>

                {/* Receipt */}
                <div className="bg-gray-50 rounded-xl p-5 text-left mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    Transaction Receipt
                  </h3>
                  <div className="space-y-2 text-sm">
                    {transactionRef && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Transaction Ref</span>
                        <span className="font-mono text-xs text-gray-700">{transactionRef}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-medium text-gray-800">{formatPrice(amount || receipt?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="text-gray-700 capitalize">{selectedMethod || receipt?.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date</span>
                      <span className="text-gray-700">{new Date().toLocaleDateString('en-ET')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <Badge variant="success" size="sm" icon>Paid</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 py-2.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/search')}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Browse More
                  </button>
                </div>
              </div>
            )}

            {/* FAILURE */}
            {paymentStatus === STATUS.FAILURE && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 bg-red-100 rounded-full flex items-center justify-center">
                  <FiX className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h2>
                <p className="text-sm text-gray-500 mb-2">We couldn&apos;t process your payment.</p>
                {error && (
                  <div className="bg-red-50 rounded-lg p-3 mb-6 text-sm text-red-600 flex items-start gap-2">
                    <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPaymentStatus(STATUS.IDLE); setError(''); }}
                    className="flex-1 py-2.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
