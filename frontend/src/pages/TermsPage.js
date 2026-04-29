import React from 'react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: April 2026
          </p>

          <div className="space-y-6 text-sm leading-7 text-gray-700">
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. Platform role</h2>
              <p>
                BetNet provides a marketplace to connect renters, buyers, and property owners.
                BetNet does not own listed properties unless explicitly stated in a listing.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. Account responsibility</h2>
              <p>
                You are responsible for keeping your account credentials secure and for all activities
                that happen under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. Listing standards</h2>
              <p>
                Property owners must provide accurate and lawful listing information. Misleading or
                fraudulent listings may be removed and can result in account suspension.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. Payments and fees</h2>
              <p>
                Listing and package fees are shown before payment confirmation. Payments are processed
                through supported third-party providers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Contact</h2>
              <p>
                For support on account, listings, or payment issues, contact BetNet support through the
                in-app channels or official support email.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
