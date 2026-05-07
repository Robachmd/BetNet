import React from 'react';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function PressPage() {
  return (
    <MarketingPageShell title="Press" subtitle="Media and brand information">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Contact</h2>
        <p>
          For press inquiries, product briefings, or logos, email{' '}
          <a href="mailto:press@betnet.et" className="text-green-700 font-medium hover:underline">
            press@betnet.et
          </a>
          . We route to the right person on the team and aim to reply within a few business days.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-2">About BetNet in one line</h2>
        <p className="italic text-gray-800">
          BetNet helps Ethiopians find and list homes, commercial space, and event venues with
          verification, chat, and transparent listing tools.
        </p>
      </section>
    </MarketingPageShell>
  );
}
