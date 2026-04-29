import React from 'react';
import PropertyCard from './PropertyCard';
import EmptyState from '../common/EmptyState';
import { PropertyGridSkeleton } from '../common/Skeletons';
import { normalizePropertyForCard } from '../../utils/helpers';

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
      <div className={className}>
        <PropertyGridSkeleton count={skeletonCount} />
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
      {properties.map((raw) => {
        const property = normalizePropertyForCard(raw);
        return (
        <PropertyCard
          key={property.id}
          property={property}
          onClick={onPropertyClick}
          onFavoriteToggle={onFavoriteToggle}
          isFavorited={property.isFavorited || favoriteIds.has(property.id)}
        />
      )})}
    </div>
  );
}
