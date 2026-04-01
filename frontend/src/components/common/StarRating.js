import React, { useState } from 'react';
import { FiStar } from 'react-icons/fi';

export default function StarRating({
  rating = 0,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onChange = () => {},
  showValue = false,
  className = '',
}) {
  const [hovered, setHovered] = useState(0);

  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= (hovered || rating);
        const halfFilled = !filled && starValue - 0.5 <= rating && !hovered;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`relative ${interactive ? 'cursor-pointer' : 'cursor-default'} focus:outline-none transition-transform ${
              interactive && hovered >= starValue ? 'scale-110' : ''
            }`}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            {/* Background star */}
            <FiStar
              className={`${sizeClass} ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : halfFilled
                    ? 'text-yellow-400'
                    : 'text-gray-300'
              } transition-colors`}
            />
            {/* Half fill overlay */}
            {halfFilled && (
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <FiStar className={`${sizeClass} fill-yellow-400 text-yellow-400`} />
              </div>
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
