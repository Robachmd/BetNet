import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiArrowRight } from 'react-icons/fi';

const STEPS = {
  renter: [
    { label: 'Search properties', path: '/search' },
    { label: 'Saved homes', path: '/favorites' },
    { label: 'Your profile', path: '/profile' },
  ],
  owner: [
    { label: 'Add a listing', path: '/dashboard/property-owner/add-property' },
    { label: 'Booking requests', path: '/dashboard/property-owner/bookings' },
    { label: 'Messages', path: '/chat' },
  ],
};

export default function GetStartedBanner({ variant, userId }) {
  const navigate = useNavigate();
  const key =
    userId != null && variant ? `betnet_get_started_dismissed_${userId}_${variant}` : null;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!key) return;
    setHidden(localStorage.getItem(key) === '1');
  }, [key]);

  const dismiss = () => {
    if (key) localStorage.setItem(key, '1');
    setHidden(true);
  };

  if (hidden || !variant || !STEPS[variant]) return null;

  const steps = STEPS[variant];

  return (
    <section
      className="surface-card relative overflow-hidden border-primary-100/50 bg-gradient-to-br from-primary-50/90 via-white to-white p-5 sm:p-6 animate-slide-up ring-1 ring-primary-100/40"
      aria-label="Getting started"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-100/40 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight text-gray-900">
            Get started with BetNet
          </h2>
          <p className="mt-1 text-sm text-muted max-w-xl">
            Complete these steps to make the most of your account.
          </p>
          <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            {steps.map((step, i) => (
              <li key={step.path}>
                <button
                  type="button"
                  onClick={() => navigate(step.path)}
                  className="group inline-flex w-full sm:w-auto items-center gap-2 rounded-xl border border-gray-200/90 bg-white/90 px-4 py-2.5 text-left text-sm font-medium text-gray-800 shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800">
                    {i + 1}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  <FiArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ol>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="self-start rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          aria-label="Dismiss getting started tips"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
