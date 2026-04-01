import React from 'react';
import { FiTrendingDown, FiTrendingUp, FiMinus, FiInfo } from 'react-icons/fi';

const formatETB = (price) =>
  new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(price);

function getInsight(price, avg, min, max) {
  if (!avg || !price) return { label: 'No Data', color: 'gray', icon: FiMinus };
  const ratio = price / avg;
  if (ratio <= 0.85) return { label: 'Great Deal', color: 'green', icon: FiTrendingDown };
  if (ratio <= 1.05) return { label: 'Fair Price', color: 'blue', icon: FiMinus };
  if (ratio <= 1.2) return { label: 'Above Average', color: 'yellow', icon: FiTrendingUp };
  return { label: 'Premium Price', color: 'red', icon: FiTrendingUp };
}

const colorMap = {
  green: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  red: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-500', bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
};

export default function PriceInsight({
  price = 0,
  averagePrice = 0,
  minPrice = 0,
  maxPrice = 0,
  areaName = 'this area',
  className = '',
}) {
  const insight = getInsight(price, averagePrice, minPrice, maxPrice);
  const colors = colorMap[insight.color];
  const Icon = insight.icon;

  const range = maxPrice - minPrice;
  const pricePosition = range > 0
    ? Math.min(Math.max(((price - minPrice) / range) * 100, 2), 98)
    : 50;
  const avgPosition = range > 0
    ? Math.min(Math.max(((averagePrice - minPrice) / range) * 100, 2), 98)
    : 50;

  if (!price || !averagePrice) {
    return (
      <div className={`bg-gray-50 rounded-2xl p-5 text-center ${className}`}>
        <FiInfo className="w-6 h-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Price insights not available for this area.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Price Insight</h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
          <Icon className="w-3.5 h-3.5" />
          {insight.label}
        </span>
      </div>

      {/* Price bar */}
      <div className="relative mb-6">
        <div className="h-3 bg-gradient-to-r from-green-400 via-blue-400 via-yellow-400 to-red-400 rounded-full opacity-30" />

        {/* Average marker */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${avgPosition}%` }}
        >
          <div className="w-0.5 h-3 bg-gray-500 mx-auto" />
          <span className="block text-[10px] text-gray-400 mt-1 whitespace-nowrap -translate-x-1/4">
            Avg
          </span>
        </div>

        {/* Current price marker */}
        <div
          className="absolute -top-1 -translate-x-1/2"
          style={{ left: `${pricePosition}%` }}
        >
          <div className={`w-5 h-5 rounded-full border-3 border-white shadow-lg ${colors.bar}`} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Lowest</p>
          <p className="text-sm font-semibold text-gray-700">{formatETB(minPrice)}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Average</p>
          <p className="text-sm font-semibold text-gray-700">{formatETB(averagePrice)}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Highest</p>
          <p className="text-sm font-semibold text-gray-700">{formatETB(maxPrice)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-3">
        Compared to similar properties in {areaName}
      </p>
    </div>
  );
}
