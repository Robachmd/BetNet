import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

const links = [
  { to: '/about', label: 'About BetNet' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/help', label: 'Help Center' },
  { to: '/safety', label: 'Safety' },
  { to: '/list-property', label: 'List your property' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
];

export default function ResourcesPage() {
  return (
    <MarketingPageShell title="Resources" subtitle="Quick links across BetNet">
      <ul className="space-y-3">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className="text-green-700 font-medium hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </MarketingPageShell>
  );
}
