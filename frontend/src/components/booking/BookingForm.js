import React, { useState } from 'react';
import { FiCalendar, FiClock, FiUsers, FiMessageSquare, FiSend } from 'react-icons/fi';

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

const eventTypes = [
  'Wedding', 'Birthday', 'Corporate Event', 'Conference',
  'Graduation', 'Engagement', 'Other',
];

export default function BookingForm({
  propertyType = 'residential',
  onSubmit = () => {},
  isSubmitting = false,
  className = '',
}) {
  const isHall = propertyType === 'hall';

  const [form, setForm] = useState({
    date: '',
    endDate: '',
    timeSlot: '',
    guestCount: '',
    eventType: '',
    message: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.date) newErrors.date = 'Please select a date';
    if (!isHall && !form.timeSlot) newErrors.timeSlot = 'Please select a time slot';
    if (isHall && !form.endDate) newErrors.endDate = 'Please select an end date';
    if (isHall && !form.eventType) newErrors.eventType = 'Please select an event type';
    if (isHall && !form.guestCount) newErrors.guestCount = 'Please enter guest count';

    const today = new Date().toISOString().split('T')[0];
    if (form.date && form.date < today) newErrors.date = 'Date cannot be in the past';
    if (isHall && form.endDate && form.endDate < form.date) newErrors.endDate = 'End date must be after start date';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-5">
        {isHall ? 'Book This Hall' : 'Schedule a Visit'}
      </h3>

      {/* Date */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <FiCalendar className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          {isHall ? 'Start Date' : 'Preferred Date'}
        </label>
        <input
          type="date"
          min={todayStr}
          value={form.date}
          onChange={(e) => handleChange('date', e.target.value)}
          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
            errors.date ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        />
        {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
      </div>

      {/* End date for halls */}
      {isHall && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <FiCalendar className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            End Date
          </label>
          <input
            type="date"
            min={form.date || todayStr}
            value={form.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
              errors.endDate ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
        </div>
      )}

      {/* Time slots for residential */}
      {!isHall && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FiClock className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            Time Slot
          </label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => handleChange('timeSlot', slot)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  form.timeSlot === slot
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-green-300'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
          {errors.timeSlot && <p className="text-xs text-red-500 mt-1">{errors.timeSlot}</p>}
        </div>
      )}

      {/* Guest count for halls */}
      {isHall && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <FiUsers className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            Number of Guests
          </label>
          <input
            type="number"
            min="1"
            placeholder="Expected number of guests"
            value={form.guestCount}
            onChange={(e) => handleChange('guestCount', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
              errors.guestCount ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.guestCount && <p className="text-xs text-red-500 mt-1">{errors.guestCount}</p>}
        </div>
      )}

      {/* Event type for halls */}
      {isHall && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type</label>
          <select
            value={form.eventType}
            onChange={(e) => handleChange('eventType', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
              errors.eventType ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            <option value="">Select event type</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.eventType && <p className="text-xs text-red-500 mt-1">{errors.eventType}</p>}
        </div>
      )}

      {/* Message */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <FiMessageSquare className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          Message (optional)
        </label>
        <textarea
          rows={3}
          placeholder={isHall ? 'Any special requirements...' : 'Introduce yourself, ask questions...'}
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <FiSend className="w-4 h-4" />
            {isHall ? 'Request Booking' : 'Request Visit'}
          </>
        )}
      </button>
    </form>
  );
}
