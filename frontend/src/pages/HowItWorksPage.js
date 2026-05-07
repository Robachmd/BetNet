import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function HowItWorksPage() {
  return (
    <MarketingPageShell title="How BetNet works">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">For renters and buyers</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <span className="font-medium text-gray-900">Search and filter.</span>
            {' '}
            Use location, price, property type, and verified-only filters to narrow results.
          </li>
          <li>
            <span className="font-medium text-gray-900">Open the listing.</span>
            {' '}
            Review photos, map pins, amenities, and owner details. Save favorites for later.
          </li>
          <li>
            <span className="font-medium text-gray-900">Book a visit or message the owner.</span>
            {' '}
            Use in-app chat when you are logged in, or follow the visit flow where available.
          </li>
          <li>
            <span className="font-medium text-gray-900">Close with confidence.</span>
            {' '}
            Prefer verified owners, read our safety tips, and use official payment paths when the
            listing supports them.
          </li>
        </ol>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">For property owners</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <span className="font-medium text-gray-900">Create an account</span>
            {' '}
            and complete your profile. Opt into property-owner tools when you are ready to list.
          </li>
          <li>
            <span className="font-medium text-gray-900">Add a listing</span>
            {' '}
            with accurate location, pricing, and media. Choose rent, sale, or short-term where
            supported.
          </li>
          <li>
            <span className="font-medium text-gray-900">Choose a listing package</span>
            {' '}
            so your property can go live within your slot limits (see Pricing for details).
          </li>
          <li>
            <span className="font-medium text-gray-900">Manage from the dashboard:</span>
            {' '}
            bookings, reviews, and notifications in one place.
          </li>
        </ol>
      </section>
      <section className="pt-2 flex flex-wrap gap-3">
        <Link
          to="/register"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
        >
          Create an account
        </Link>
        <Link
          to="/search"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Search properties
        </Link>
        <Link
          to="/list-property"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Start listing
        </Link>
      </section>
    </MarketingPageShell>
  );
}
