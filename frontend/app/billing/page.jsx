'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function BillingContent() {
  const params = useSearchParams();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/subscription/status')
      .then(r => setSub(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function subscribe() {
    const { data } = await api.post('/api/subscription/create-order');
    window.location.href = data.approveUrl;
  }

  const success = params.get('success');
  const cancelled = params.get('cancelled');
  const error = params.get('error');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-slate-400 mb-8 text-sm">Manage your Rehema AI subscription</p>

      {success && (
        <div className="bg-green-950 border border-green-800 text-green-300 rounded-lg px-4 py-3 text-sm mb-6">
          Subscription activated! You now have full access.
        </div>
      )}
      {cancelled && (
        <div className="bg-yellow-950 border border-yellow-800 text-yellow-300 rounded-lg px-4 py-3 text-sm mb-6">
          Subscription setup cancelled. Your trial is still active.
        </div>
      )}
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
          Something went wrong. Please try again or contact support.
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Rehema AI — Starter</h2>
            <p className="text-slate-400 text-sm">$29 / month · All features included</p>
          </div>
          {loading ? (
            <div className="w-20 h-6 bg-slate-800 rounded animate-pulse" />
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              sub?.status === 'active' ? 'bg-green-950 text-green-400' :
              sub?.status === 'pending' ? 'bg-yellow-950 text-yellow-400' :
              'bg-slate-800 text-slate-400'
            }`}>
              {sub?.status || 'Trial'}
            </span>
          )}
        </div>

        {sub?.current_period_end && (
          <p className="text-slate-400 text-sm">
            Next billing: {new Date(sub.current_period_end).toLocaleDateString()}
          </p>
        )}

        {(!sub || sub.status === 'pending' || sub.status === 'none') && (
          <button
            onClick={subscribe}
            className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            Subscribe with PayPal — $29/mo
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold mb-3">What's included</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          {['Unlimited inbound calls', 'AI booking management', 'SMS & WhatsApp', 'Outbound campaigns', 'Live dashboard', 'Email support'].map(i => (
            <li key={i} className="flex items-center gap-2"><span className="text-green-400">✓</span>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <BillingContent />
    </Suspense>
  );
}
