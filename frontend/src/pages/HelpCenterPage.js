import React from 'react';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function HelpCenterPage() {
  return (
    <MarketingPageShell title="Help Center" subtitle="Get answers and reach our team">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Contact us</h2>
        <p>
          Email{' '}
          <a href="mailto:info@betnet.et" className="text-green-700 font-medium hover:underline">
            info@betnet.et
          </a>
          {' '}or call{' '}
          <a href="tel:+251941882661" className="text-green-700 font-medium hover:underline">
            0941882661
          </a>
          . We respond to account, listing, and payment questions on business days.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Common questions</h2>
        <ul className="space-y-4">
          <li>
            <p className="font-medium text-gray-900">How do I publish a listing?</p>
            <p className="mt-1">
              Add a property from your owner dashboard, then complete a listing package purchase if
              required. Publishing consumes a slot from your active package.
            </p>
          </li>
          <li>
            <p className="font-medium text-gray-900">I cannot log in or verify my phone</p>
            <p className="mt-1">
              Use OTP resend from the verification screen and ensure your number is correct. If SMS
              fails repeatedly, email support with your registered phone number.
            </p>
          </li>
          <li>
            <p className="font-medium text-gray-900">A listing looks wrong or suspicious</p>
            <p className="mt-1">
              Open the listing and use Report. Our team reviews flags and may contact the owner or
              remove content that violates our terms.
            </p>
          </li>
        </ul>
      </section>
    </MarketingPageShell>
  );
}
