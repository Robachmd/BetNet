import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiCheck } from 'react-icons/fi';
import i18n from '../../i18n';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromoo', flag: '🇪🇹' },
];

function resolveActiveCode(raw) {
  if (!raw) return 'en';
  const base = raw.split('-')[0];
  if (languages.some((l) => l.code === raw)) return raw;
  if (languages.some((l) => l.code === base)) return base;
  return 'en';
}

export default function LanguageSwitcher({
  onChange = () => {},
  compact = false,
  className = '',
}) {
  const { i18n: i18nInstance } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = useMemo(
    () => resolveActiveCode(i18nInstance.language),
    [i18nInstance.language],
  );

  const current = languages.find((l) => l.code === currentLang) || languages[0];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Switch language"
      >
        <FiGlobe className="w-4 h-4" />
        {!compact && <span className="hidden sm:inline">{current.code.toUpperCase()}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                void i18n.changeLanguage(lang.code);
                onChange(lang.code);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                currentLang === lang.code
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {currentLang === lang.code && <FiCheck className="w-4 h-4 text-green-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
