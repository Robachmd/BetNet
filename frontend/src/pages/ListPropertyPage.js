import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function ListPropertyPage() {
  return (
    <MarketingPageShell title="List your property on BetNet" subtitle="Reach serious renters and buyers">
      <section>
        <p>
          Property owners publish listings through the BetNet owner dashboard. Before a listing can
          go live to the public, you may need an active listing package with available slots (same
          flow as our pricing page). That keeps quality high and limits spam.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">What you will need</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Accurate address and sub-city, plus good photos and a clear description.</li>
          <li>A verified account and, where requested, identity verification.</li>
          <li>An active listing package if your account requires one to publish.</li>
        </ul>
      </section>
      <section className="flex flex-wrap gap-3 pt-2">
        <Link
          to="/register"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
        >
          Register
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Log in
        </Link>
        <Link
          to="/dashboard/property-owner/add-property"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-green-200 text-green-800 text-sm font-medium hover:bg-green-50 transition-colors"
        >
          Go to add property
        </Link>
      </section>
      <p className="text-xs text-gray-500 pt-2">
        If you are not logged in, dashboard links will prompt you to sign in first.
      </p>
    </MarketingPageShell>
  );
}
