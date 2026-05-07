import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function SafetyPage() {
  return (
    <MarketingPageShell title="Safety on BetNet" subtitle="Protect yourself when renting or listing">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">For renters and buyers</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Prefer listings from owners with completed verification when available.</li>
          <li>Never send money outside the official payment flows shown on BetNet.</li>
          <li>Visit properties in person before large deposits when possible.</li>
          <li>Report suspicious pricing, duplicate posts, or coercion using in-product reporting.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">For property owners</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Keep your listing photos and address accurate to build renter trust.</li>
          <li>Use chat inside BetNet to keep a record of conversations.</li>
          <li>Respond to booking and review messages promptly and professionally.</li>
        </ul>
      </section>
      <p className="text-gray-600">
        Read our{' '}
        <Link to="/terms" className="text-green-700 font-medium hover:underline">
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link to="/privacy" className="text-green-700 font-medium hover:underline">
          Privacy Policy
        </Link>
        {' '}for full rules and data practices.
      </p>
    </MarketingPageShell>
  );
}
