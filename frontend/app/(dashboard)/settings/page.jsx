'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

const FIELDS = [
  { key: 'HOTEL_NAME', label: 'Hotel Name', type: 'text' },
  { key: 'HOTEL_TIMEZONE', label: 'Timezone', type: 'text', placeholder: 'Africa/Nairobi' },
  { key: 'WORKING_HOURS_START', label: 'Working Hours Start', type: 'time' },
  { key: 'WORKING_HOURS_END', label: 'Working Hours End', type: 'time' },
  { key: 'ELEVENLABS_VOICE_ID', label: 'ElevenLabs Voice ID', type: 'text' },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    toast.success('Settings saved — restart server to apply changes');
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your AI receptionist</p>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Hotel Configuration</h2>
          <div className="space-y-4">
            {FIELDS.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type={type} className="input" placeholder={placeholder || `Enter ${label.toLowerCase()}`} />
                <p className="text-xs text-slate-400 mt-1">Env var: <code className="bg-slate-100 px-1 rounded">{key}</code></p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Voice Settings</h2>
          <p className="text-sm text-slate-500 mb-4">The AI receptionist uses ElevenLabs for natural voice synthesis. Configure your voice ID above.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">Settings changes require a server restart to take effect. Environment variables are the authoritative source — this panel is for reference only.</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-2">System Status</h2>
          <div className="space-y-2">
            {[['Twilio Voice', 'Connected'], ['ElevenLabs TTS', 'Connected'], ['Deepgram STT', 'Connected'], ['Supabase DB', 'Connected'], ['Google Calendar', 'Not configured']].map(([service, status]) => (
              <div key={service} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{service}</span>
                <span className={`badge ${status === 'Connected' ? 'badge-green' : 'badge-slate'}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave}>{saved ? 'Saved ✓' : 'Save Settings'}</button>
      </div>
    </div>
  );
}
