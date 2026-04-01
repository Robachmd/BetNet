import React from 'react';
import {
  FiWifi, FiShield, FiSun, FiDroplet, FiZap, FiWind,
  FiTruck, FiHome, FiMonitor, FiPhone, FiCheckCircle, FiXCircle,
} from 'react-icons/fi';

const amenityIcons = {
  'Water Supply': FiDroplet,
  'Electricity': FiZap,
  'Parking': FiTruck,
  'WiFi': FiWifi,
  'Security/Guard': FiShield,
  'Generator': FiSun,
  'Elevator': FiHome,
  'Furnished': FiMonitor,
  'Balcony': FiWind,
  'Garden': FiSun,
  'CCTV': FiMonitor,
  'Laundry': FiDroplet,
  'Air Conditioning': FiWind,
  'Heating': FiSun,
  'Phone Line': FiPhone,
  'Cable TV': FiMonitor,
};

export default function AmenitiesList({
  available = [],
  unavailable = [],
  showUnavailable = true,
  columns = 2,
  compact = false,
  className = '',
}) {
  const colClass = columns === 3
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : columns === 1
      ? 'grid-cols-1'
      : 'grid-cols-1 sm:grid-cols-2';

  const AmenityItem = ({ name, isAvailable }) => {
    const Icon = amenityIcons[name] || FiCheckCircle;
    return (
      <div
        className={`flex items-center gap-3 ${compact ? 'py-2' : 'py-3 px-4 rounded-xl'} ${
          isAvailable
            ? compact ? '' : 'bg-green-50/50'
            : compact ? 'opacity-50' : 'bg-gray-50'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isAvailable
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span
          className={`text-sm font-medium ${
            isAvailable ? 'text-gray-700' : 'text-gray-400 line-through'
          }`}
        >
          {name}
        </span>
        {isAvailable ? (
          <FiCheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
        ) : (
          <FiXCircle className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
        )}
      </div>
    );
  };

  if (available.length === 0 && unavailable.length === 0) {
    return (
      <div className={`text-center py-8 text-sm text-gray-400 ${className}`}>
        No amenity information available.
      </div>
    );
  }

  return (
    <div className={className}>
      {available.length > 0 && (
        <div className={`grid ${colClass} gap-2`}>
          {available.map((name) => (
            <AmenityItem key={name} name={name} isAvailable />
          ))}
        </div>
      )}

      {showUnavailable && unavailable.length > 0 && (
        <>
          {available.length > 0 && (
            <div className="my-4 border-t border-gray-100" />
          )}
          <div className={`grid ${colClass} gap-2`}>
            {unavailable.map((name) => (
              <AmenityItem key={name} name={name} isAvailable={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
