'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-slate-800 border-t border-slate-600 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
      <p className="text-sm text-gray-300 flex-1">
        We use strictly necessary cookies to keep you logged in. No tracking or advertising
        cookies.{' '}
        <Link href="/cookies" className="text-blue-400 underline">Cookie Policy</Link>
        {' · '}
        <Link href="/privacy" className="text-blue-400 underline">Privacy Policy</Link>
      </p>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={decline}
          className="px-4 py-2 text-sm rounded border border-gray-500 text-gray-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
