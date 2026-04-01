import React from 'react';
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const footerLinks = {
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Safety', href: '/safety' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
  'For Landlords': [
    { label: 'List Your Property', href: '/list-property' },
    { label: 'Landlord Dashboard', href: '/dashboard' },
    { label: 'Pricing Plans', href: '/pricing' },
    { label: 'Resources', href: '/resources' },
  ],
  Discover: [
    { label: 'Addis Ababa', href: '/search?city=addis-ababa' },
    { label: 'Hawassa', href: '/search?city=hawassa' },
    { label: 'Bahir Dar', href: '/search?city=bahir-dar' },
    { label: 'Adama', href: '/search?city=adama' },
  ],
};

const socialLinks = [
  { icon: FiFacebook, href: '#', label: 'Facebook' },
  { icon: FiInstagram, href: '#', label: 'Instagram' },
  { icon: FiTwitter, href: '#', label: 'Twitter' },
  { icon: FiYoutube, href: '#', label: 'YouTube' },
];

export default function Footer({ onNavigate = () => {} }) {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-white">
                Bet<span className="text-green-400">Rent</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              Ethiopia&apos;s trusted rental marketplace. Find your next home or list your property with confidence.
            </p>
            <div className="space-y-2.5">
              <a href="mailto:info@betrent.et" className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors">
                <FiMail className="w-4 h-4" /> info@betrent.et
              </a>
              <a href="tel:+251911000000" className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors">
                <FiPhone className="w-4 h-4" /> +251 911 000 000
              </a>
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <FiMapPin className="w-4 h-4 flex-shrink-0" /> Bole, Addis Ababa, Ethiopia
              </p>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => { e.preventDefault(); onNavigate(link.href); }}
                      className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} BetRent. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-green-700 hover:text-white transition-all"
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
