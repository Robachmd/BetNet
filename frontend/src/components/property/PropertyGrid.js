import React from 'react';
import PropertyCard from './PropertyCard';
import EmptyState from '../common/EmptyState';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-10" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-28" />
      </div>
    </div>
  );
}

export default function PropertyGrid({
  properties = [],
  isLoading = false,
  skeletonCount = 8,
  onPropertyClick = () => {},
  onFavoriteToggle = () => {},
  favoriteIds = new Set(),
  emptyTitle = 'No properties found',
  emptyDescription = 'Try adjusting your search or filters to find what you\'re looking for.',
  emptyAction = '',
  onEmptyAction = null,
  className = '',
}) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 ${className}`}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 ${className}`}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          onClick={onPropertyClick}
          onFavoriteToggle={onFavoriteToggle}
          isFavorited={favoriteIds.has(property.id)}
        />
      ))}
    </div>
  );
}
