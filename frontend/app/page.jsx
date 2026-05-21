'use client';
import Link from 'next/link';

const FEATURES = [
  { icon: '📞', title: 'Live Voice AI', desc: 'Answers every call in under 1.2 seconds. Never misses a booking.' },
  { icon: '📅', title: 'Smart Booking', desc: 'Creates, updates, and cancels reservations automatically during the call.' },
  { icon: '💬', title: 'SMS & WhatsApp', desc: 'Sends confirmations and follow-ups over the guest\'s preferred channel.' },
  { icon: '📊', title: 'Live Dashboard', desc: 'See every call, booking, and guest profile in real time.' },
  { icon: '🔄', title: 'Outbound Campaigns', desc: 'Re-engages past guests with follow-up calls automatically.' },
  { icon: '🧠', title: 'Hotel Knowledge Base', desc: 'Trained on your FAQs, policies, and amenities out of the box.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">R</div>
          <span className="font-semibold text-lg">Rehema AI</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm">
            Sign in
          </Link>
          <Link href="/register" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors">
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          14-day free trial — no credit card required
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          Your hotel{' '}
          <span className="text-indigo-400">never misses</span>
          {' '}a call again
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Rehema AI answers every inbound call, takes bookings, handles FAQs, and sends confirmations — 24/7, in your hotel's voice.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-lg font-semibold transition-colors">
            Start free trial
          </Link>
          <a href="#pricing" className="px-8 py-4 border border-slate-700 hover:border-slate-500 rounded-xl text-lg font-medium text-slate-300 transition-colors">
            See pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Everything a front desk does, automated</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-16 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
        <p className="text-slate-400 mb-10">One plan, everything included. Cancel any time.</p>
        <div className="bg-slate-900 border-2 border-indigo-600 rounded-2xl p-10">
          <div className="text-5xl font-bold mb-2">$29<span className="text-2xl text-slate-400 font-normal">/mo</span></div>
          <p className="text-slate-400 mb-8">per hotel property</p>
          <ul className="text-left space-y-3 mb-10">
            {[
              'Unlimited inbound calls',
              'AI booking management',
              'SMS & WhatsApp notifications',
              'Outbound follow-up campaigns',
              'Live dashboard & call transcripts',
              'Custom hotel knowledge base',
              'Email support',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400 font-bold">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/register" className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-lg transition-colors">
            Start 14-day free trial
          </Link>
          <p className="text-slate-500 text-xs mt-4">No credit card required to start</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        © 2026 Rehema AI. Built for independent hotels.
      </footer>
    </div>
  );
}
