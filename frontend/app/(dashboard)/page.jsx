'use client';
import { useQuery } from '@tanstack/react-query';
import { Phone, Users, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react';
import { conversationsApi, bookingsApi, clientsApi } from '../../lib/api';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color = 'text-sky-600', sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats } = useQuery({ queryKey: ['convStats'], queryFn: conversationsApi.stats });
  const { data: bookings } = useQuery({
    queryKey: ['bookingsToday'],
    queryFn: () => bookingsApi.list({ from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }),
  });
  const { data: clients } = useQuery({ queryKey: ['clientCount'], queryFn: () => clientsApi.list({ limit: 1 }) });
  const { data: recentCalls } = useQuery({ queryKey: ['recentCalls'], queryFn: () => conversationsApi.list({ limit: 5 }) });

  const sentimentColors = { positive: 'badge-green', neutral: 'badge-slate', negative: 'badge-red', frustrated: 'badge-red' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Phone} label="Calls Today" value={stats?.todayCalls} color="text-sky-600" />
        <StatCard icon={CalendarDays} label="Bookings Today" value={bookings?.length} color="text-emerald-600" />
        <StatCard icon={Users} label="Total Guests" value={clients?.total} color="text-violet-600" />
        <StatCard icon={TrendingUp} label="Total Calls" value={stats?.totalCalls} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Recent Calls</h2>
          {recentCalls?.data?.length ? (
            <div className="space-y-3">
              {recentCalls.data.map((c) => (
                <div key={c.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.clients?.name || 'Unknown caller'}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.summary || 'No summary'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                    <span className={sentimentColors[c.sentiment] || 'badge-slate'}>{c.sentiment}</span>
                    <span className="text-xs text-slate-400">{format(new Date(c.created_at), 'HH:mm')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-6">No calls yet today</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Sentiment (Last 7 Days)</h2>
          {stats?.sentimentBreakdown ? (
            <div className="space-y-3">
              {Object.entries(stats.sentimentBreakdown).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center gap-3">
                  <span className={`${sentimentColors[sentiment] || 'badge-slate'} capitalize w-24 justify-center`}>{sentiment}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-sky-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (count / (stats.totalCalls || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-6">No sentiment data</p>
          )}
        </div>
      </div>
    </div>
  );
}
