import React from 'react';
import MarketingPageShell from '../components/marketing/MarketingPageShell';

export default function CareersPage() {
  return (
    <MarketingPageShell title="Careers" subtitle="Build with us">
      <p>
        BetNet is growing a product and operations team that cares about housing access and trust in
        Ethiopia. We post open roles when they are available. Until then, we welcome introductions:
        send your CV and a short note to{' '}
        <a href="mailto:careers@betnet.et" className="text-green-700 font-medium hover:underline">
          careers@betnet.et
        </a>
        {' '}
        (or use info@betnet.et if careers bounces).
      </p>
      <p className="text-gray-600">
        We are especially interested in people with experience in marketplace operations, trust and
        safety, mobile growth, and partnerships in East Africa.
      </p>
    </MarketingPageShell>
  );
}
