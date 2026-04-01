import React, { useState } from 'react';
import { FiStar, FiSend } from 'react-icons/fi';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewForm({
  onSubmit = () => {},
  isSubmitting = false,
  className = '',
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!rating) newErrors.rating = 'Please select a rating';
    if (!comment.trim()) newErrors.comment = 'Please write a comment';
    if (comment.trim().length < 10) newErrors.comment = 'Comment should be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ rating, title: title.trim(), comment: comment.trim() });
    }
  };

  const activeLabel = ratingLabels[hovered || rating] || '';

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-5">Write a Review</h3>

      {/* Star selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => { setRating(star); if (errors.rating) setErrors((e) => ({ ...e, rating: '' })); }}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
            >
              <FiStar
                className={`w-8 h-8 transition-colors ${
                  star <= (hovered || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {activeLabel && (
            <span className="ml-2 text-sm font-medium text-gray-600">{activeLabel}</span>
          )}
        </div>
        {errors.rating && <p className="text-xs text-red-500 mt-1">{errors.rating}</p>}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Title (optional)
        </label>
        <input
          type="text"
          placeholder="Summarize your experience"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
        />
      </div>

      {/* Comment */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Your Review
        </label>
        <textarea
          rows={4}
          placeholder="Share details about your experience..."
          value={comment}
          onChange={(e) => { setComment(e.target.value); if (errors.comment) setErrors((er) => ({ ...er, comment: '' })); }}
          maxLength={1000}
          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all ${
            errors.comment ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.comment ? (
            <p className="text-xs text-red-500">{errors.comment}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{comment.length}/1000</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <FiSend className="w-4 h-4" />
            Submit Review
          </>
        )}
      </button>
    </form>
  );
}
