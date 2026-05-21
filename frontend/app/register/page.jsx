'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ hotelName: '', ownerEmail: '', password: '', timezone: 'Africa/Nairobi' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/tenant/register', form);
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-indigo-500 rounded-xl items-center justify-center font-bold text-xl mb-4">AI</div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 mt-2 text-sm">14-day free trial, then $29/month</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5" aria-label="Create account form" noValidate>
          <div role="alert" aria-live="assertive" aria-atomic="true">
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}
          </div>

          <div>
            <label htmlFor="reg-hotel" className="block text-sm font-medium text-slate-300 mb-2">Hotel name</label>
            <input
              id="reg-hotel"
              type="text" required value={form.hotelName} onChange={set('hotelName')}
              placeholder="Grand Palace Hotel"
              autoComplete="organization"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">Work email</label>
            <input
              id="reg-email"
              type="email" required value={form.ownerEmail} onChange={set('ownerEmail')}
              placeholder="you@yourhotel.com"
              autoComplete="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              id="reg-password"
              type="password" required value={form.password} onChange={set('password')}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-timezone" className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
            <select
              id="reg-timezone"
              value={form.timezone} onChange={set('timezone')}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            >
              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Africa/Cairo">Africa/Cairo (EET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>

          <button
            type="submit" disabled={loading} aria-disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Creating account...' : 'Start free trial'}
          </button>

          <p className="text-center text-slate-500 text-xs">
            By signing up you agree to our{' '}
            <a href="/terms" className="text-indigo-400 hover:underline">Terms of Use</a>
            {' '}and{' '}
            <a href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a>.
            No credit card required.
          </p>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
