import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const socialLinks = [
  { icon: FiFacebook, href: '#', label: 'Facebook' },
  { icon: FiInstagram, href: '#', label: 'Instagram' },
  { icon: FiTwitter, href: '#', label: 'Twitter' },
  { icon: FiYoutube, href: '#', label: 'YouTube' },
];

export default function Footer({ onNavigate = () => {} }) {
  const { t } = useTranslation();

  const footerColumns = useMemo(
    () => [
      {
        titleKey: 'footer.sectionCompany',
        links: [
          { labelKey: 'footer.linkAboutUs', href: '/about' },
          { labelKey: 'footer.linkHowItWorks', href: '/how-it-works' },
          { labelKey: 'footer.linkCareers', href: '/careers' },
          { labelKey: 'footer.linkPress', href: '/press' },
        ],
      },
      {
        titleKey: 'footer.support',
        links: [
          { labelKey: 'footer.linkHelpCenter', href: '/help' },
          { labelKey: 'footer.linkSafety', href: '/safety' },
          { labelKey: 'footer.termsOfService', href: '/terms' },
          { labelKey: 'footer.privacyPolicy', href: '/privacy' },
        ],
      },
      {
        titleKey: 'footer.sectionForLandlords',
        links: [
          { labelKey: 'footer.linkListProperty', href: '/list-property' },
          { labelKey: 'footer.linkLandlordDashboard', href: '/dashboard' },
          { labelKey: 'footer.linkPricingPlans', href: '/pricing' },
          { labelKey: 'footer.linkResources', href: '/resources' },
        ],
      },
      {
        titleKey: 'footer.sectionDiscover',
        links: [
          { labelKey: '', href: '/search?city=addis-ababa', labelPlain: 'Addis Ababa' },
          { labelKey: '', href: '/search?city=hawassa', labelPlain: 'Hawassa' },
          { labelKey: '', href: '/search?city=bahir-dar', labelPlain: 'Bahir Dar' },
          { labelKey: '', href: '/search?city=adama', labelPlain: 'Adama' },
        ],
      },
    ],
    [],
  );

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-white">
                {t('app.name')}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              {t('footer.trustedBlurb')}
            </p>
            <div className="space-y-2.5">
              <a href="mailto:info@betnet.et" className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors">
                <FiMail className="w-4 h-4" /> info@betnet.et
              </a>
              <a href="tel:+251911000000" className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors">
                <FiPhone className="w-4 h-4" /> +251 911 000 000
              </a>
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <FiMapPin className="w-4 h-4 flex-shrink-0" /> Bole, {t('home.addisAbaba')}, Ethiopia
              </p>
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.titleKey}>
              <h4 className="text-sm font-semibold text-white mb-4">{t(col.titleKey)}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + (link.labelKey || link.labelPlain)}>
                    <a
                      href={link.href}
                      onClick={(e) => { e.preventDefault(); onNavigate(link.href); }}
                      className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {link.labelPlain || t(link.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {t('footer.copyright', { year: new Date().getFullYear() })}
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
