'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../../../lib/api';
import { format } from 'date-fns';

export default function CRMPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', contact_consent: false });

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search, limit: 30 }),
  });

  const { data: clientDetail } = useQuery({
    queryKey: ['client', selected],
    queryFn: () => clientsApi.get(selected),
    enabled: !!selected,
  });

  const createMut = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => { qc.invalidateQueries(['clients']); setShowCreate(false); setForm({ name: '', phone: '', email: '', notes: '', contact_consent: false }); toast.success('Guest created'); },
    onError: (e) => toast.error(e?.error || 'Error creating guest'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['client', selected]); toast.success('Updated'); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Guests</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Guest
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* Guest List */}
        <div className="card flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search by name, phone or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? <p className="text-center text-slate-400 py-8 text-sm">Loading…</p> : data?.data?.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected === c.id ? 'bg-sky-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                  </div>
                  {c.contact_consent
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                  }
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Guest Detail */}
        {clientDetail ? (
          <div className="card w-96 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">{clientDetail.name}</h2>
              <div className="flex flex-col gap-1 mt-2">
                {clientDetail.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="w-3.5 h-3.5" />{clientDetail.phone}</div>}
                {clientDetail.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="w-3.5 h-3.5" />{clientDetail.email}</div>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={!!clientDetail.contact_consent} onChange={(e) => updateMut.mutate({ id: clientDetail.id, data: { contact_consent: e.target.checked } })} />
                  Marketing consent
                </label>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</label>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{clientDetail.notes || 'No notes'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent Bookings</label>
                <div className="mt-2 space-y-2">
                  {clientDetail.bookings?.slice(0, 5).map((b) => (
                    <div key={b.id} className="text-xs bg-slate-50 rounded-lg p-2.5">
                      <span className="font-medium">{b.service}</span> — {b.date} {b.time}
                      <span className={`ml-2 ${b.status === 'confirmed' ? 'text-emerald-600' : 'text-slate-400'}`}>{b.status}</span>
                    </div>
                  ))}
                  {!clientDetail.bookings?.length && <p className="text-xs text-slate-400">No bookings</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent Calls</label>
                <div className="mt-2 space-y-2">
                  {clientDetail.conversations?.slice(0, 3).map((c) => (
                    <div key={c.id} className="text-xs bg-slate-50 rounded-lg p-2.5">
                      <p className="line-clamp-2 text-slate-700">{c.summary || 'No summary'}</p>
                      <p className="text-slate-400 mt-1">{format(new Date(c.created_at), 'MMM d, HH:mm')}</p>
                    </div>
                  ))}
                  {!clientDetail.conversations?.length && <p className="text-xs text-slate-400">No calls</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card w-96 flex items-center justify-center text-slate-400 text-sm">Select a guest</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 mb-4">New Guest</h2>
            <div className="space-y-3">
              {[['name', 'Name *'], ['phone', 'Phone'], ['email', 'Email']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input className="input" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.contact_consent} onChange={(e) => setForm((f) => ({ ...f, contact_consent: e.target.checked }))} />
                Marketing consent
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1" onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
                {createMut.isPending ? 'Creating…' : 'Create Guest'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
