import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiSliders } from 'react-icons/fi';

const propertyTypes = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hall', label: 'Event Hall' },
];

const cities = [
  { value: '', label: 'All Cities' },
  { value: 'addis-ababa', label: 'Addis Ababa' },
  { value: 'hawassa', label: 'Hawassa' },
  { value: 'bahir-dar', label: 'Bahir Dar' },
  { value: 'adama', label: 'Adama' },
  { value: 'dire-dawa', label: 'Dire Dawa' },
  { value: 'mekelle', label: 'Mekelle' },
  { value: 'jimma', label: 'Jimma' },
  { value: 'gondar', label: 'Gondar' },
];

const subCities = {
  'addis-ababa': [
    { value: '', label: 'All Sub-Cities' },
    { value: 'bole', label: 'Bole' },
    { value: 'kirkos', label: 'Kirkos' },
    { value: 'yeka', label: 'Yeka' },
    { value: 'arada', label: 'Arada' },
    { value: 'nifas-silk', label: 'Nifas Silk Lafto' },
    { value: 'kolfe', label: 'Kolfe Keranio' },
    { value: 'lideta', label: 'Lideta' },
    { value: 'akaky-kaliti', label: 'Akaky Kaliti' },
    { value: 'addis-ketema', label: 'Addis Ketema' },
    { value: 'gulele', label: 'Gulele' },
    { value: 'lemi-kura', label: 'Lemi Kura' },
  ],
};

const amenitiesList = [
  'Water Supply', 'Electricity', 'Parking', 'WiFi', 'Security/Guard',
  'Generator', 'Elevator', 'Furnished', 'Balcony', 'Garden',
];

const bedroomOptions = [
  { value: '', label: 'Any' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5+', label: '5+' },
];

export default function PropertyFilters({
  filters = {},
  onChange = () => {},
  onClear = () => {},
  className = '',
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    type: true,
    listing: true,
    price: true,
    bedrooms: true,
    location: true,
    amenities: false,
    more: false,
  });

  const {
    propertyType = '',
    listingType = '',
    minPrice = '',
    maxPrice = '',
    bedrooms = '',
    city = '',
    subCity = '',
    amenities = [],
    verifiedOnly = false,
  } = filters;

  const activeCount = [
    propertyType, listingType, minPrice, maxPrice, bedrooms, city, subCity, verifiedOnly,
  ].filter(Boolean).length + amenities.length;

  const toggleSection = (key) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));

  const handleChange = (key, value) => onChange({ ...filters, [key]: value });

  const handleAmenityToggle = (amenity) => {
    const updated = amenities.includes(amenity)
      ? amenities.filter((a) => a !== amenity)
      : [...amenities, amenity];
    handleChange('amenities', updated);
  };

  const Section = ({ title, sectionKey, children }) => (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full py-3 px-1 text-sm font-semibold text-gray-700"
      >
        {title}
        {expandedSections[sectionKey] ? (
          <FiChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expandedSections[sectionKey] && <div className="pb-4 px-1">{children}</div>}
    </div>
  );

  const filterContent = (
    <div className="space-y-1">
      <Section title="Property Type" sectionKey="type">
        <select
          value={propertyType}
          onChange={(e) => handleChange('propertyType', e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
        >
          {propertyTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </Section>

      <Section title="Rent or buy" sectionKey="listing">
        <select
          value={listingType}
          onChange={(e) => handleChange('listingType', e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
        >
          <option value="">All listings</option>
          <option value="rent">For rent</option>
          <option value="sale">For sale</option>
          <option value="short_term">Short-term rent</option>
        </select>
      </Section>

      <Section title="Price Range (ETB)" sectionKey="price">
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
          />
        </div>
      </Section>

      <Section title="Bedrooms" sectionKey="bedrooms">
        <div className="flex flex-wrap gap-2">
          {bedroomOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleChange('bedrooms', opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                bedrooms === opt.value
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-green-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Location" sectionKey="location">
        <div className="space-y-3">
          <select
            value={city}
            onChange={(e) => {
              handleChange('city', e.target.value);
              handleChange('subCity', '');
            }}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
          >
            {cities.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {city && subCities[city] && (
            <select
              value={subCity}
              onChange={(e) => handleChange('subCity', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
            >
              {subCities[city].map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
        </div>
      </Section>

      <Section title="Amenities" sectionKey="amenities">
        <div className="grid grid-cols-2 gap-2">
          {amenitiesList.map((amenity) => (
            <label
              key={amenity}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                amenities.includes(amenity)
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={amenities.includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {amenity}
            </label>
          ))}
        </div>
      </Section>

      <Section title="More Options" sectionKey="more">
        <label className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl cursor-pointer">
          <span className="text-sm text-gray-700">Verified properties only</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => handleChange('verifiedOnly', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${verifiedOnly ? 'bg-green-600' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform mt-1 ${verifiedOnly ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
        </label>
      </Section>

      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-2"
        >
          <FiX className="w-4 h-4" />
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-green-300 transition-colors ${className}`}
      >
        <FiSliders className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <span className="min-w-[20px] h-5 flex items-center justify-center bg-green-600 text-white text-xs font-bold rounded-full px-1">
            {activeCount}
          </span>
        )}
      </button>

      {/* Desktop sidebar */}
      <div className={`hidden lg:block bg-white rounded-2xl shadow-sm p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Filters</h3>
          {activeCount > 0 && (
            <span className="text-xs text-green-600 font-medium">{activeCount} active</span>
          )}
        </div>
        {filterContent}
      </div>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Filters</h3>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4">{filterContent}</div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
