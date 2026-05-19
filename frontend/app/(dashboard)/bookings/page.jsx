'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsApi, clientsApi } from '../../../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

const STATUS_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-slate-100 text-slate-600',
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ client_id: '', date: '', time: '', service: '', notes: '' });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', format(month, 'yyyy-MM')],
    queryFn: () => bookingsApi.list({
      from: format(startOfMonth(month), 'yyyy-MM-dd'),
      to: format(endOfMonth(month), 'yyyy-MM-dd'),
    }),
  });

  const { data: clients } = useQuery({ queryKey: ['clientsList'], queryFn: () => clientsApi.list({ limit: 100 }) });

  const cancelMut = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => { qc.invalidateQueries(['bookings']); setSelected(null); toast.success('Booking cancelled'); },
  });

  const createMut = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => { qc.invalidateQueries(['bookings']); setShowCreate(false); toast.success('Booking created'); },
    onError: (e) => toast.error(e?.error || 'Booking failed'),
  });

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDayOfWeek = startOfMonth(month).getDay();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      <div className="flex gap-6">
        {/* Calendar */}
        <div className="card flex-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <button className="btn-secondary p-1.5" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-semibold text-slate-900">{format(month, 'MMMM yyyy')}</h2>
            <button className="btn-secondary p-1.5" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="bg-slate-50 text-center text-xs font-medium text-slate-500 py-2">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="bg-white" />)}
            {days.map((day) => {
              const dayBookings = bookings.filter((b) => b.date === format(day, 'yyyy-MM-dd'));
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-slate-50 ${isToday ? 'ring-2 ring-sky-500 ring-inset' : ''}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-sky-600' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <div key={b.id} onClick={() => setSelected(b)} className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                        {b.time?.slice(0, 5)} {b.service}
                      </div>
                    ))}
                    {dayBookings.length > 3 && <div className="text-xs text-slate-400 pl-1">+{dayBookings.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking Detail */}
        {selected ? (
          <div className="card w-72 p-5 h-fit">
            <h3 className="font-bold text-slate-900 mb-3">{selected.service}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{selected.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Time</span><span>{selected.time}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Guest</span><span>{selected.clients?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span>
                <span className={`badge ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            {selected.notes && <p className="text-xs text-slate-500 mt-3 p-2 bg-slate-50 rounded">{selected.notes}</p>}
            {selected.status !== 'cancelled' && (
              <button className="btn-secondary w-full mt-4 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => cancelMut.mutate(selected.id)}>
                Cancel Booking
              </button>
            )}
            <button className="text-xs text-slate-400 mt-2 w-full text-center" onClick={() => setSelected(null)}>Close</button>
          </div>
        ) : null}
      </div>

      {/* Create Booking Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 mb-4">New Booking</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Guest *</label>
                <select className="input" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Select guest…</option>
                  {clients?.data?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>
              {[['date', 'Date *', 'date'], ['time', 'Time *', 'time'], ['service', 'Service *', 'text']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type={type} className="input" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1" onClick={() => createMut.mutate(form)}
                disabled={!form.client_id || !form.date || !form.time || !form.service || createMut.isPending}>
                {createMut.isPending ? 'Creating…' : 'Create Booking'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
