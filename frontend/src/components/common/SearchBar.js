import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSearch, FiX, FiMapPin, FiClock } from 'react-icons/fi';

export default function SearchBar({
  placeholder = 'Search by location, property type...',
  suggestions = [],
  recentSearches = [],
  onSearch = () => {},
  onSuggestionSelect = () => {},
  className = '',
  compact = false,
}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const showDropdown = isFocused && (suggestions.length > 0 || recentSearches.length > 0 || query.length > 0);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [query, onSearch]
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 bg-gray-100 border border-transparent rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all ${
            compact ? 'py-2' : 'py-3'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
                Recent Searches
              </p>
              {recentSearches.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(item); onSearch(item); setIsFocused(false); }}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
                >
                  <FiClock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="p-3">
              {query.length > 0 && (
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
                  Suggestions
                </p>
              )}
              {filteredSuggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { onSuggestionSelect(item); setQuery(item.label); setIsFocused(false); }}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-green-50 text-sm text-gray-700 transition-colors"
                >
                  <FiMapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="text-left">
                    <span className="block">{item.label}</span>
                    {item.subtitle && (
                      <span className="text-xs text-gray-400">{item.subtitle}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length > 0 && filteredSuggestions.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
