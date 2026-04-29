import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

export function PropertyCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <SkeletonBlock className="aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-3 w-2/5" />
        <SkeletonBlock className="h-3 w-3/5" />
        <SkeletonBlock className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SkeletonBlock className="h-72 md:h-96 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <SkeletonBlock className="h-8 w-3/4" />
            <SkeletonBlock className="h-6 w-1/3" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-52 w-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
