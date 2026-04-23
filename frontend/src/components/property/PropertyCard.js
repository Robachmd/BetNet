import React, { useState } from 'react';
import {
  FiHeart, FiMapPin, FiChevronLeft, FiChevronRight,
  FiCheck, FiStar,
} from 'react-icons/fi';
import { IoBedOutline } from 'react-icons/io5';
import { LuBath } from 'react-icons/lu';
import Badge from '../common/Badge';

const formatETB = (price) => {
  if (!price && price !== 0) return '';
  return new Intl.NumberFormat('en-ET', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);
};

export default function PropertyCard({
  property = {},
  onFavoriteToggle = () => {},
  onClick = () => {},
  isFavorited = false,
  className = '',
}) {
  const {
    id,
    title = 'Untitled Property',
    images = [],
    price = 0,
    priceUnit = '/month',
    listingType = 'rent',
    location = {},
    bedrooms = 0,
    bathrooms = 0,
    propertyType = 'apartment',
    isVerified = false,
    isFeatured = false,
    rating = 0,
    reviewCount = 0,
  } = property;

  const [currentImg, setCurrentImg] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [liked, setLiked] = useState(isFavorited);

  const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  const imgs = images.length > 0 ? images : [placeholderImg];
  const lt = (listingType || property.listing_type || 'rent').toString().toLowerCase();

  const handleFavorite = (e) => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    onFavoriteToggle({
      id,
      favoriteId: property.favorite_id,
      willBeFavorited: next,
    });
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentImg((i) => (i > 0 ? i - 1 : imgs.length - 1));
    setImgLoaded(false);
  };

  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentImg((i) => (i < imgs.length - 1 ? i + 1 : 0));
    setImgLoaded(false);
  };

  return (
    <article
      onClick={() => onClick(property)}
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${className}`}
    >
      {/* Image section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={imgs[currentImg]}
          alt={title}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          {lt === 'rent' && (
            <Badge variant="neutral" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-200">
              For rent
            </Badge>
          )}
          {lt === 'sale' && (
            <Badge variant="pending" size="sm" className="bg-amber-100 text-amber-900 border-amber-200">
              For sale
            </Badge>
          )}
          {lt === 'short_term' && (
            <Badge variant="neutral" size="sm" className="bg-sky-50 text-sky-800 border-sky-200">
              Short-term
            </Badge>
          )}
          {isFeatured && (
            <Badge variant="featured" size="sm" icon>
              Featured
            </Badge>
          )}
          {isVerified && (
            <Badge variant="verified" size="sm" icon>
              Verified
            </Badge>
          )}
        </div>

        {/* Property type badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="neutral" size="sm" className="bg-white/90 backdrop-blur-sm">
            {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
          </Badge>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all hover:scale-110"
          aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
        >
          <FiHeart
            className={`w-5 h-5 transition-colors ${
              liked ? 'fill-red-600 text-red-600' : 'text-gray-600'
            }`}
          />
        </button>

        {/* Image carousel controls */}
        {imgs.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <FiChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <FiChevronRight className="w-4 h-4 text-gray-700" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              {imgs.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentImg ? 'bg-white w-3' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-base font-semibold text-gray-800 line-clamp-1 group-hover:text-green-700 transition-colors">
            {title}
          </h3>
          {rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <FiStar className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-xs text-gray-400">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <FiMapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-500 truncate">
            {[location.subCity, location.city].filter(Boolean).join(', ') || 'Location not specified'}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <IoBedOutline className="w-4 h-4" />
            <span>
              {property.bedroomsIsEnumLabel || typeof bedrooms === 'string'
                ? bedrooms
                : `${bedrooms} ${bedrooms === 1 ? 'Bed' : 'Beds'}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <LuBath className="w-4 h-4" />
            <span>{bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-lg font-bold text-green-800">{formatETB(price)} ETB</span>
          <span className="text-sm text-gray-400">{priceUnit}</span>
        </div>
      </div>
    </article>
  );
}
