'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignsApi } from '../../../lib/api';
import { format } from 'date-fns';

const TYPE_LABEL = { follow_up: 'Follow-up', re_engagement: 'Re-engagement', promotion: 'Promotion' };
const STATUS_COLOR = { active: 'badge-green', paused: 'badge-yellow', completed: 'badge-slate' };

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'follow_up', trigger_days_after: 2, max_calls_per_day: 20 });

  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: campaignsApi.list });
  const { data: calls } = useQuery({ queryKey: ['campaignCalls', selected], queryFn: () => campaignsApi.getCalls(selected), enabled: !!selected });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => campaignsApi.setStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Updated'); },
  });

  const createMut = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => { qc.invalidateQueries(['campaigns']); setShowCreate(false); toast.success('Campaign created'); },
    onError: (e) => toast.error(e?.error || 'Error'),
  });

  const runBatchMut = useMutation({
    mutationFn: campaignsApi.runBatch,
    onSuccess: () => toast.success('Batch triggered'),
  });

  const CALL_STATUS_COLOR = { pending: 'badge-yellow', calling: 'badge-blue', completed: 'badge-green', failed: 'badge-red', opted_out: 'badge-slate' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-xs" onClick={() => runBatchMut.mutate()} disabled={runBatchMut.isPending}>
            <Phone className="w-3.5 h-3.5" /> Run Now
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-140px)]">
        <div className="card flex-1 flex flex-col overflow-hidden">
          {isLoading ? <p className="text-center text-slate-400 py-8 text-sm">Loading…</p>
            : campaigns.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id === selected ? null : c.id)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${selected === c.id ? 'bg-sky-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                    <span className={STATUS_COLOR[c.status] || 'badge-slate'}>{c.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABEL[c.type]} · up to {c.max_calls_per_day} calls/day</p>
                </div>
                <div className="flex gap-1">
                  {c.status === 'active' && (
                    <button className="btn-secondary p-1.5" onClick={(e) => { e.stopPropagation(); statusMut.mutate({ id: c.id, status: 'paused' }); }}>
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {c.status === 'paused' && (
                    <button className="btn-secondary p-1.5 text-emerald-600" onClick={(e) => { e.stopPropagation(); statusMut.mutate({ id: c.id, status: 'active' }); }}>
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="card w-96 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Call Log</h3>
            </div>
            <div className="overflow-y-auto flex-1">
              {calls?.map((call) => (
                <div key={call.id} className="p-3 border-b border-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{call.clients?.name}</p>
                    <span className={CALL_STATUS_COLOR[call.status] || 'badge-slate'}>{call.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{call.clients?.phone}</p>
                  {call.called_at && <p className="text-xs text-slate-400">{format(new Date(call.called_at), 'MMM d, HH:mm')}</p>}
                </div>
              ))}
              {!calls?.length && <p className="text-center text-slate-400 py-8 text-sm">No calls yet</p>}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 mb-4">New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trigger after (days)</label>
                <input type="number" className="input" value={form.trigger_days_after} onChange={(e) => setForm((f) => ({ ...f, trigger_days_after: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Max calls per day</label>
                <input type="number" className="input" value={form.max_calls_per_day} onChange={(e) => setForm((f) => ({ ...f, max_calls_per_day: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1" onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
                {createMut.isPending ? 'Creating…' : 'Create Campaign'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
