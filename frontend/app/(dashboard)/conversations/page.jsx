'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, PhoneOutgoing, PhoneIncoming } from 'lucide-react';
import { conversationsApi } from '../../../lib/api';
import { format } from 'date-fns';

const SENTIMENT_BADGE = {
  positive: 'badge-green', neutral: 'badge-slate', negative: 'badge-red', frustrated: 'badge-red',
};

export default function ConversationsPage() {
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, filter],
    queryFn: () => conversationsApi.list({ page, limit: 20, sentiment: filter || undefined }),
  });

  const { data: detail } = useQuery({
    queryKey: ['conversation', selected],
    queryFn: () => conversationsApi.get(selected),
    enabled: !!selected,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Calls</h1>
        <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All sentiments</option>
          {['positive', 'neutral', 'negative', 'frustrated'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 h-[calc(100vh-140px)]">
        <div className="card flex-1 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1">
            {isLoading ? <p className="text-center text-slate-400 py-8 text-sm">Loading…</p>
              : data?.data?.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 ${selected === c.id ? 'bg-sky-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {c.direction === 'outbound'
                        ? <PhoneOutgoing className="w-4 h-4 text-slate-400" />
                        : <PhoneIncoming className="w-4 h-4 text-sky-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.clients?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.summary || 'No summary'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                    <span className={SENTIMENT_BADGE[c.sentiment] || 'badge-slate'}>{c.sentiment}</span>
                    <span className="text-xs text-slate-400">{format(new Date(c.created_at), 'MMM d HH:mm')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {data?.total > 20 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <button className="btn-secondary text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
              <span className="text-xs text-slate-500">Page {page} of {Math.ceil(data.total / 20)}</span>
              <button className="btn-secondary text-xs" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>Next</button>
            </div>
          )}
        </div>

        {detail ? (
          <div className="card w-96 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">{detail.clients?.name || 'Unknown caller'}</h2>
                <span className={SENTIMENT_BADGE[detail.sentiment] || 'badge-slate'}>{detail.sentiment}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{format(new Date(detail.created_at), 'MMMM d, yyyy — HH:mm')}</p>
              {detail.summary && <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded text-xs">{detail.summary}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transcript</p>
              {Array.isArray(detail.transcript) && detail.transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-800' : 'bg-sky-600 text-white'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {(!detail.transcript || detail.transcript.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No transcript available</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card w-96 flex items-center justify-center text-slate-400 text-sm">Select a call</div>
        )}
      </div>
    </div>
  );
}
