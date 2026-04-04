import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiHome, FiMapPin, FiCheckCircle, FiArrowRight,
  FiStar, FiUsers, FiShield, FiTrendingUp, FiChevronLeft,
  FiChevronRight, FiSmartphone,
} from 'react-icons/fi';
import { IoBedOutline } from 'react-icons/io5';
import SearchBar from '../components/common/SearchBar';
import PropertyCard from '../components/property/PropertyCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import propertyService from '../services/properties';
import { ADDIS_ABABA_SUB_CITIES } from '../utils/constants';
import {
  formatPrice, getErrorMessage, listFromApi, normalizePropertyForCard,
} from '../utils/helpers';

const PROPERTY_CATEGORIES = [
  { type: 'apartment', label: 'Apartment', icon: '🏢', color: 'bg-blue-50 text-blue-600' },
  { type: 'villa', label: 'Villa', icon: '🏡', color: 'bg-emerald-50 text-emerald-600' },
  { type: 'condominium', label: 'Condo', icon: '🏬', color: 'bg-purple-50 text-purple-600' },
  { type: 'house', label: 'Service House', icon: '🏠', color: 'bg-orange-50 text-orange-600' },
  { type: 'hall', label: 'Event Hall', icon: '🎪', color: 'bg-pink-50 text-pink-600' },
];

const STEPS = [
  { icon: FiSearch, title: 'Search', description: 'Browse thousands of verified properties across Ethiopian cities.' },
  { icon: FiCheckCircle, title: 'Book a Visit', description: 'Schedule a visit directly with verified landlords at your convenience.' },
  { icon: FiHome, title: 'Move In', description: 'Sign your lease and move into your new home hassle-free.' },
];

const POPULAR_AREAS = [
  { name: 'Bole', count: 320, image: '/areas/bole.jpg' },
  { name: 'Piassa', count: 185, image: '/areas/piassa.jpg' },
  { name: 'Kazanchis', count: 210, image: '/areas/kazanchis.jpg' },
  { name: 'CMC', count: 175, image: '/areas/cmc.jpg' },
  { name: 'Sarbet', count: 140, image: '/areas/sarbet.jpg' },
  { name: 'Megenagna', count: 155, image: '/areas/megenagna.jpg' },
];

const TESTIMONIALS = [
  { name: 'Abebe T.', role: 'Renter', text: 'BetRent made finding my apartment in Bole so simple. The verified listings saved me from scams.', rating: 5 },
  { name: 'Tigist M.', role: 'Landlord', text: 'I listed my property and had 10 interested tenants within a week. The platform is incredible.', rating: 5 },
  { name: 'Dawit K.', role: 'Renter', text: 'The price insight feature helped me negotiate a fair rent. I saved 3,000 ETB per month!', rating: 4 },
];

const STATS = [
  { value: '1,000+', label: 'Properties Listed' },
  { value: '500+', label: 'Verified Listings' },
  { value: '10,000+', label: 'Happy Renters' },
  { value: '50+', label: 'Neighborhoods' },
];

const LOCATION_SUGGESTIONS = ADDIS_ABABA_SUB_CITIES.map((sc) => ({
  label: sc.label,
  subtitle: 'Addis Ababa',
  value: sc.value,
}));

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    propertyService.getFeaturedProperties()
      .then((data) => setFeatured(listFromApi(data)))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSuggestionSelect = (item) => {
    navigate(`/search?subCity=${item.value}`);
  };

  const handleCategoryClick = (type) => {
    if (type === 'hall') {
      navigate('/halls');
    } else {
      navigate(`/search?propertyType=${type}`);
    }
  };

  const handlePropertyClick = (property) => {
    const s = property.slug || property.id;
    navigate(`/property/${s}`);
  };

  const handleFavoriteToggle = async ({ id, favoriteId, willBeFavorited }) => {
    try {
      if (willBeFavorited) await propertyService.addFavorite(id);
      else if (favoriteId) await propertyService.removeFavorite(favoriteId);
    } catch {}
  };

  const visibleFeatured = featured.slice(carouselIndex, carouselIndex + 4);
  const canPrevCarousel = carouselIndex > 0;
  const canNextCarousel = carouselIndex + 4 < featured.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.15),_transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/50 to-green-900/90" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-green-200 text-sm font-medium mb-6">
              <FiShield className="w-4 h-4" />
              Ethiopia's Trusted Rental Marketplace
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Find Your Perfect
              <span className="block text-green-300">Home in Ethiopia</span>
            </h1>
            <p className="text-lg md:text-xl text-green-100/80 mb-10 max-w-2xl mx-auto">
              Browse verified rentals in Addis Ababa and beyond. Apartments, villas, condos, and event halls — all in one place.
            </p>

            <div className="max-w-2xl mx-auto">
              <SearchBar
                placeholder="Search by location, neighborhood, or property type..."
                suggestions={LOCATION_SUGGESTIONS}
                onSearch={handleSearch}
                onSuggestionSelect={handleSuggestionSelect}
                className="shadow-2xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-8">
              {['Bole', 'Piassa', 'Kazanchis', 'CMC'].map((area) => (
                <button
                  key={area}
                  onClick={() => navigate(`/search?q=${area}`)}
                  className="text-sm text-green-200/70 hover:text-white transition-colors"
                >
                  {area} →
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-8 z-10 max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-green-800">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Property Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Browse by Property Type
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Whether you need an apartment, a villa, or an event hall, we have you covered.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {PROPERTY_CATEGORIES.map((cat) => (
            <button
              key={cat.type}
              onClick={() => handleCategoryClick(cat.type)}
              className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${cat.color} group-hover:scale-110 transition-transform`}>
                {cat.icon}
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700 transition-colors">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Featured Properties
            </h2>
            <p className="text-gray-500">Hand-picked listings verified by our team</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setCarouselIndex((i) => Math.max(0, i - 4))}
              disabled={!canPrevCarousel}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              <FiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCarouselIndex((i) => Math.min(featured.length - 4, i + 4))}
              disabled={!canNextCarousel}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              <FiChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading featured properties..." />
        ) : error ? (
          <div className="text-center py-12 text-gray-500">{error}</div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No featured properties available right now.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(visibleFeatured.length > 0 ? visibleFeatured : featured.slice(0, 4)).map((raw) => {
                const property = normalizePropertyForCard(raw);
                return (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={handlePropertyClick}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )})}
            </div>
            <div className="text-center mt-10">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors shadow-sm"
              >
                View All Properties
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              How BetRent Works
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Find your next home in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative text-center group">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px border-t-2 border-dashed border-green-200" />
                  )}
                  <div className="relative z-10 w-24 h-24 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors">
                    <Icon className="w-10 h-10 text-green-700" />
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-700 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Areas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Popular Neighborhoods
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Explore top areas in Addis Ababa with the most rental options
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {POPULAR_AREAS.map((area) => (
            <Link
              key={area.name}
              to={`/search?q=${area.name}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
              <div className="absolute inset-0 bg-green-900/40 group-hover:bg-green-900/20 transition-colors z-10" />
              <img
                src={area.image}
                alt={area.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute bottom-4 left-4 z-20">
                <h3 className="text-lg font-bold text-white mb-0.5">{area.name}</h3>
                <p className="text-sm text-white/80">{area.count}+ properties</p>
              </div>
              <div className="absolute top-4 right-4 z-20">
                <FiMapPin className="w-5 h-5 text-white/70" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Price Insights Teaser */}
      <section className="bg-gradient-to-br from-green-800 to-emerald-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-400/20 rounded-full text-green-200 text-sm font-medium mb-5">
                <FiTrendingUp className="w-4 h-4" />
                Price Intelligence
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Know the Real Price Before You Rent
              </h2>
              <p className="text-green-100/80 leading-relaxed mb-6">
                Our Price Insight tool compares rental prices across neighborhoods so you know
                exactly what's fair. No more overpaying — make informed decisions backed by data.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-800 font-semibold rounded-xl hover:bg-green-50 transition-colors"
              >
                Explore Price Insights
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-green-200 font-medium">Average Rent — Bole</span>
                  <span className="px-2 py-1 bg-green-400/20 text-green-200 text-xs rounded-full font-semibold">Fair Price</span>
                </div>
                <p className="text-3xl font-bold text-white mb-4">{formatPrice(25000)}/mo</p>
                <div className="h-2 bg-white/10 rounded-full mb-3">
                  <div className="h-full w-3/5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" />
                </div>
                <div className="flex justify-between text-xs text-green-200/60">
                  <span>8,000 ETB</span>
                  <span>Average</span>
                  <span>80,000 ETB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            What Our Users Say
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Trusted by thousands of renters and landlords across Ethiopia
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }, (_, s) => (
                  <FiStar
                    key={s}
                    className={`w-4 h-4 ${s < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Download App CTA */}
      <section className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="bg-gradient-to-br from-green-700 to-emerald-800 rounded-3xl p-8 md:p-14 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-green-200 text-sm font-medium mb-5">
                <FiSmartphone className="w-4 h-4" />
                Coming Soon
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                BetRent on Your Phone
              </h2>
              <p className="text-green-100/80 leading-relaxed mb-8 max-w-lg">
                Get instant notifications for new listings, chat with landlords in real-time,
                and manage your bookings on the go. The BetRent mobile app is coming soon.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-300 leading-none">Download on the</p>
                    <p className="text-sm font-semibold leading-tight">App Store</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-300 leading-none">Get it on</p>
                    <p className="text-sm font-semibold leading-tight">Google Play</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-56 h-96 bg-white/10 rounded-[2.5rem] border-4 border-white/20 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center text-white/50">
                  <FiSmartphone className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm font-medium">App Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
