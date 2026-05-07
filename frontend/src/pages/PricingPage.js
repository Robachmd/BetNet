import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function PricingPage() {
  return (
    <MarketingPageShell title="Pricing and listing packages" subtitle="Pay for visibility, publish on your schedule">
      <section>
        <p>
          BetNet uses listing packages so owners can publish multiple properties within a bundle
          instead of paying per click. Package details and current prices are shown in your
          dashboard when you are ready to buy, including any promotions or provider fees at
          checkout (for example through our payment partners).
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">What packages usually cover</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>A fixed number of simultaneous published listings (slots).</li>
          <li>Renewal or upgrade paths when you outgrow your current bundle.</li>
          <li>Access to owner tools: bookings, reviews, and analytics where enabled.</li>
        </ul>
      </section>
      <section className="pt-2">
        <Link
          to="/dashboard/property-owner/listing-packages"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
        >
          View listing packages
        </Link>
        <p className="text-xs text-gray-500 mt-3">
          You must be signed in as a property owner to purchase. New owners can register and opt in
          to owner features from their profile.
        </p>
      </section>
    </MarketingPageShell>
  );
}
