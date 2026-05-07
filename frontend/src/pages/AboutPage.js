import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function AboutPage() {
  return (
    <MarketingPageShell title="About BetNet">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Our mission</h2>
        <p>
          BetNet is Ethiopia&apos;s trusted property marketplace. We connect people who need a home
          or venue with serious property owners and help everyone complete the journey with clearer
          information, safer communication, and straightforward tools.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Who we serve</h2>
        <p>
          Renters and buyers across Ethiopia use BetNet to discover apartments, houses, commercial
          space, and event halls. Property owners use one dashboard to list, manage bookings and
          reviews, and grow visibility with optional listing packages.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Trust and quality</h2>
        <p>
          We invest in verification workflows, reporting, and visibility rules so listings stay useful
          and scams stay out. Our team reviews reports and works with owners to keep the marketplace
          professional.
        </p>
      </section>
      <section className="pt-2 flex flex-wrap gap-3">
        <Link
          to="/search"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
        >
          Browse listings
        </Link>
        <Link
          to="/list-property"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          List a property
        </Link>
      </section>
    </MarketingPageShell>
  );
}
