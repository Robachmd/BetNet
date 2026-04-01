import React from 'react';
import { FiStar } from 'react-icons/fi';
import StarRating from '../common/StarRating';

export default function RatingSummary({
  averageRating = 0,
  totalReviews = 0,
  distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  className = '',
}) {
  const maxCount = Math.max(...Object.values(distribution), 1);

  if (totalReviews === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 text-center ${className}`}>
        <FiStar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-700 mb-1">No Reviews Yet</h3>
        <p className="text-sm text-gray-400">Be the first to review this property.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Average score */}
        <div className="text-center flex-shrink-0">
          <p className="text-5xl font-bold text-gray-800 mb-1">
            {averageRating.toFixed(1)}
          </p>
          <StarRating rating={averageRating} size="md" />
          <p className="text-sm text-gray-400 mt-2">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-4 text-right">{star}</span>
                <FiStar className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {pct > 0 ? `${Math.round(pct)}%` : '0%'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
