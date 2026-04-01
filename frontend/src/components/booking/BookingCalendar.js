import React, { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function BookingCalendar({
  bookedDates = [],
  unavailableDates = [],
  selectedDate = '',
  onSelectDate = () => {},
  minDate = null,
  className = '',
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const minStr = minDate || todayStr;

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const unavailSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const canGoPrev = toDateStr(viewYear, viewMonth, 1) > toDateStr(today.getFullYear(), today.getMonth(), 1);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <FiChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <FiChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isPast = dateStr < minStr;
          const isBooked = bookedSet.has(dateStr);
          const isUnavailable = unavailSet.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isDisabled = isPast || isBooked || isUnavailable;

          let style = 'text-gray-700 hover:bg-green-50 hover:text-green-700';
          if (isDisabled) style = 'cursor-not-allowed';
          if (isPast) style += ' text-gray-300';
          if (isBooked) style = 'bg-red-50 text-red-400 cursor-not-allowed';
          if (isUnavailable) style = 'bg-gray-100 text-gray-300 cursor-not-allowed';
          if (isSelected) style = 'bg-green-700 text-white shadow-sm hover:bg-green-800';
          if (isToday && !isSelected) style += ' ring-2 ring-green-300 ring-inset';

          return (
            <button
              key={day}
              onClick={() => !isDisabled && onSelectDate(dateStr)}
              disabled={isDisabled}
              className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${style}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-100 border-2 border-green-500" />
          <span className="text-xs text-gray-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-100 border-2 border-red-400" />
          <span className="text-xs text-gray-500">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-200" />
          <span className="text-xs text-gray-500">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
