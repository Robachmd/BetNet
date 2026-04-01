import React, { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiHome, FiSearch, FiUser, FiLogOut, FiSettings, FiCalendar, FiChevronDown } from 'react-icons/fi';
import SearchBar from '../common/SearchBar';
import LanguageSwitcher from '../common/LanguageSwitcher';
import NotificationBell from '../common/NotificationBell';

export default function Navbar({
  user = null,
  notifications = [],
  unreadCount = 0,
  currentLang = 'en',
  onSearch = () => {},
  onLanguageChange = () => {},
  onNotificationClick = () => {},
  onMarkAllRead = () => {},
  onLogin = () => {},
  onRegister = () => {},
  onLogout = () => {},
  onNavigate = () => {},
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { label: 'Home', icon: FiHome, key: 'home' },
    { label: 'Search', icon: FiSearch, key: 'search' },
    { label: 'Hall Rentals', icon: FiCalendar, key: 'halls' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-xl font-bold">
              <span className="text-green-800">Bet</span>
              <span className="text-green-600">Rent</span>
            </span>
          </button>

          {/* Desktop search */}
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <SearchBar onSearch={onSearch} compact />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => onNavigate(link.key)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop right section */}
          <div className="hidden md:flex items-center gap-1">
            <LanguageSwitcher currentLang={currentLang} onChange={onLanguageChange} />

            {user ? (
              <>
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onNotificationClick={onNotificationClick}
                  onMarkAllRead={onMarkAllRead}
                />

                {/* Profile dropdown */}
                <div ref={profileRef} className="relative ml-1">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:shadow-md transition-all"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <FiChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 py-1">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { onNavigate('profile'); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <FiUser className="w-4 h-4" /> My Profile
                      </button>
                      <button
                        onClick={() => { onNavigate('settings'); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <FiSettings className="w-4 h-4" /> Settings
                      </button>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => { onLogout(); setProfileOpen(false); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <FiLogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={onLogin}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-700 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={onRegister}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors shadow-sm"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Menu"
          >
            {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white h-full overflow-y-auto shadow-xl animate-slide-in-left">
            <div className="p-4">
              <SearchBar onSearch={(q) => { onSearch(q); setMobileOpen(false); }} />
            </div>

            <nav className="px-2 pb-2">
              {navLinks.map((link) => (
                <button
                  key={link.key}
                  onClick={() => { onNavigate(link.key); setMobileOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-base text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="border-t border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">Language</span>
                <LanguageSwitcher currentLang={currentLang} onChange={onLanguageChange} />
              </div>

              {user ? (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { onLogout(); setMobileOpen(false); }}
                    className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { onLogin(); setMobileOpen(false); }}
                    className="w-full py-2.5 text-sm font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { onRegister(); setMobileOpen(false); }}
                    className="w-full py-2.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            .animate-slide-in-left { animation: slide-in-left 0.25s ease-out; }
          `}</style>
        </div>
      )}
    </header>
  );
}
