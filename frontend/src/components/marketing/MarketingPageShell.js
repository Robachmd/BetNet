import React from 'react';

/**
 * Shared layout for public marketing pages (About, Help, etc.).
 */
export default function MarketingPageShell({ title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-gray-500 mb-8">{subtitle}</p>
          ) : (
            <div className="mb-8" />
          )}
          <div className="space-y-6 text-sm leading-7 text-gray-700">{children}</div>
        </div>
      </div>
    </main>
  );
}
