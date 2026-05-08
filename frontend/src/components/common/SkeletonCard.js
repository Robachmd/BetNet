import React from 'react';

export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`surface-card overflow-hidden animate-pulse ${className}`}
      aria-hidden
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2" />
        <div className="flex gap-4">
          <div className="h-3 bg-gray-100 rounded-md w-20" />
          <div className="h-3 bg-gray-100 rounded-md w-20" />
        </div>
        <div className="h-5 bg-gray-100 rounded-lg w-28" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;
