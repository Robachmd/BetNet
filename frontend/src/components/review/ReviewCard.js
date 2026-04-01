import React, { useState } from 'react';
import StarRating from '../common/StarRating';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default function ReviewCard({
  review = {},
  className = '',
}) {
  const {
    rating = 0,
    title = '',
    comment = '',
    reviewerName = 'Anonymous',
    reviewerAvatar = '',
    createdAt = '',
    landlordResponse = null,
  } = review;

  const [expanded, setExpanded] = useState(false);
  const isLong = comment.length > 200;

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {reviewerAvatar ? (
          <img src={reviewerAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {reviewerName[0]?.toUpperCase() || 'A'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{reviewerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={rating} size="sm" />
            <span className="text-xs text-gray-400">{timeAgo(createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      {title && (
        <h4 className="text-sm font-semibold text-gray-800 mb-1.5">{title}</h4>
      )}

      {/* Comment */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {isLong && !expanded ? `${comment.slice(0, 200)}...` : comment}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-green-600 mt-1.5 hover:text-green-700"
        >
          {expanded ? (
            <>Show less <FiChevronUp className="w-3 h-3" /></>
          ) : (
            <>Read more <FiChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}

      {/* Landlord response */}
      {landlordResponse && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-green-200">
          <p className="text-xs font-semibold text-green-700 mb-1">Landlord Response</p>
          <p className="text-sm text-gray-600">{landlordResponse}</p>
        </div>
      )}
    </div>
  );
}
