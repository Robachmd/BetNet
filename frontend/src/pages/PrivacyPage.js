import React from 'react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: April 2026
          </p>

          <div className="space-y-6 text-sm leading-7 text-gray-700">
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. Information we collect</h2>
              <p>
                BetNet collects account details, listing data, communication content, and transaction
                metadata needed to provide marketplace services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. How we use data</h2>
              <p>
                We use data to operate the platform, prevent abuse, process transactions, improve
                matching between users and listings, and provide customer support.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. Sharing and processors</h2>
              <p>
                We share data only when required to deliver services, including payment providers,
                cloud storage, and infrastructure providers under appropriate safeguards.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. Security</h2>
              <p>
                BetNet uses technical and organizational measures to protect personal data, including
                access controls, secure transport, and monitoring.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. Contact and requests</h2>
              <p>
                You can request account-related privacy support through BetNet support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
