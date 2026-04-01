import React from 'react';
import { FiCheck, FiStar, FiAlertCircle, FiClock } from 'react-icons/fi';

const variants = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
  verified: 'bg-green-600 text-white',
  featured: 'bg-yellow-500 text-white',
  pending: 'bg-orange-100 text-orange-700',
};

const iconMap = {
  verified: FiCheck,
  featured: FiStar,
  error: FiAlertCircle,
  pending: FiClock,
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon = false,
  dot = false,
  className = '',
}) {
  const IconComponent = icon ? iconMap[variant] : null;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap ${variants[variant]} ${sizeMap[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success' ? 'bg-green-500'
            : variant === 'error' ? 'bg-red-500'
            : variant === 'warning' ? 'bg-yellow-500'
            : 'bg-gray-500'
          }`}
        />
      )}
      {IconComponent && <IconComponent className="w-3 h-3" />}
      {children}
    </span>
  );
}
