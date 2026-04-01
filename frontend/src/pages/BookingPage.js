import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FiCheck, FiCalendar, FiMapPin, FiArrowLeft, FiAlertCircle,
  FiClock, FiHome,
} from 'react-icons/fi';
import BookingCalendar from '../components/booking/BookingCalendar';
import BookingForm from '../components/booking/BookingForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import useAuth from '../hooks/useAuth';
import propertyService from '../services/properties';
import bookingService from '../services/bookings';
import { formatPrice, getImageUrl, getErrorMessage } from '../utils/helpers';

const STEPS = ['Select Date', 'Booking Details', 'Confirmation'];

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const propertyId = searchParams.get('propertyId');
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [bookedDates, setBookedDates] = useState([]);
  const [bookingResult, setBookingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isHall = property?.propertyType === 'hall';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking?propertyId=${propertyId}` } });
      return;
    }
    if (!propertyId) {
      setError('No property selected.');
      setLoading(false);
      return;
    }

    Promise.all([
      propertyService.getPropertyById(propertyId),
      bookingService.getBookingAvailability(propertyId).catch(() => ({ bookedDates: [] })),
    ])
      .then(([propData, availData]) => {
        setProperty(propData);
        setBookedDates(availData.bookedDates || []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [propertyId, isAuthenticated, navigate]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleNextStep = () => {
    if (currentStep === 0 && !selectedDate) return;
    setCurrentStep((s) => Math.min(s + 1, 2));
  };

  const handleBookingSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const bookingData = {
        propertyId,
        date: selectedDate,
        ...formData,
      };

      const result = isHall
        ? await bookingService.createBooking(bookingData)
        : await bookingService.scheduleViewing(bookingData);

      setBookingResult(result);
      setCurrentStep(2);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text="Loading booking details..." />;

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Booking Unavailable</h1>
        <p className="text-gray-500 mb-6">{error || 'Property not found.'}</p>
        <Link to="/search" className="px-6 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors">
          Browse Properties
        </Link>
      </div>
    );
  }

  const mainImage = property.images?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isHall ? 'Book Event Hall' : 'Schedule a Visit'}
          </h1>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && <div className={`hidden sm:block w-12 h-px ${i <= currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < currentStep ? 'bg-green-600 text-white'
                    : i === currentStep ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < currentStep ? <FiCheck className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`hidden sm:inline text-sm font-medium ${
                    i <= currentStep ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {step}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    <FiCalendar className="inline w-5 h-5 mr-2 -mt-0.5 text-green-600" />
                    Select a Date
                  </h2>
                  <BookingCalendar
                    bookedDates={bookedDates}
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                  />
                </div>
                <button
                  onClick={handleNextStep}
                  disabled={!selectedDate}
                  className="w-full py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <FiCalendar className="w-4 h-4" />
                  Selected date: <span className="font-medium text-gray-800">{selectedDate}</span>
                  <button onClick={() => setCurrentStep(0)} className="text-green-600 hover:underline ml-1">Change</button>
                </div>
                <BookingForm
                  propertyType={isHall ? 'hall' : 'residential'}
                  onSubmit={handleBookingSubmit}
                  isSubmitting={submitting}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <FiCheck className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {isHall ? 'Booking Request Sent!' : 'Visit Scheduled!'}
                </h2>
                <p className="text-gray-500 mb-2 max-w-md mx-auto">
                  {isHall
                    ? 'Your booking request has been sent to the venue owner. You will be notified once it is confirmed.'
                    : 'Your visit has been scheduled. The landlord will confirm your appointment shortly.'}
                </p>
                {bookingResult?.id && (
                  <p className="text-sm text-gray-400 mb-6">
                    Booking ID: <span className="font-mono">{bookingResult.id}</span>
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/search"
                    className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Browse More
                  </Link>
                  <Link
                    to="/profile"
                    className="px-6 py-2.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors"
                  >
                    View My Bookings
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Property Summary Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-20">
              {mainImage && (
                <img
                  src={getImageUrl(typeof mainImage === 'string' ? mainImage : mainImage.url)}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-5">
                <h3 className="font-semibold text-gray-800 mb-1">{property.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-4">
                  <FiMapPin className="w-3.5 h-3.5" />
                  {[property.location?.subCity, property.location?.city].filter(Boolean).join(', ')}
                </p>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{isHall ? 'Hall Rental' : 'Monthly Rent'}</span>
                    <span className="font-semibold text-gray-800">{formatPrice(property.price)}</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-800">{selectedDate}</span>
                    </div>
                  )}
                  {property.propertyType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-800 capitalize">{property.propertyType}</span>
                    </div>
                  )}
                </div>

                {isHall && property.price && (
                  <div className="mt-4 p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-green-600 font-medium mb-1">Price Summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hall rental (per day)</span>
                      <span className="font-semibold text-green-800">{formatPrice(property.price)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
