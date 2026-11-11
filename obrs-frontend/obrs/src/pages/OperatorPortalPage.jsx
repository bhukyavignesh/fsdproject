import { useState } from 'react';
import { BusFront, IndianRupee, TrendingUp, Users, Plus } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../components/ui/Toast';
import { CITIES, BUS_TYPES } from '../data/constants';
import { todayISO } from '../utils/format';

const FLEET = [
  { id: 'KA01-AB-2231', route: 'Bengaluru → Chennai', dep: '21:30', type: 'AC Sleeper (2+1)', occupancy: 0.86, revenue: 41200 },
  { id: 'KA01-AC-1180', route: 'Bengaluru → Hyderabad', dep: '20:15', type: 'Scania AC Multi-Axle Sleeper', occupancy: 0.72, revenue: 52800 },
  { id: 'KA05-F-9902', route: 'Bengaluru → Goa', dep: '19:00', type: 'Non-AC Sleeper (2+1)', occupancy: 0.54, revenue: 23400 },
  { id: 'KA03-M-4410', route: 'Chennai → Bengaluru', dep: '22:45', type: 'Volvo Multi-Axle AC Seater (2+2)', occupancy: 0.93, revenue: 38900 },
];

export default function OperatorPortalPage() {
  const { money } = usePreferences();
  const notify = useToast();
  const [showForm, setShowForm] = useState(false);
  const totals = { revenue: FLEET.reduce((s, b) => s + b.revenue, 0), pax: 212, occupancy: FLEET.reduce((s, b) => s + b.occupancy, 0) / FLEET.length };

  const stats = [
    { label: "Today's revenue", value: money(totals.revenue), icon: IndianRupee, delta: '+12%' },
    { label: 'Passengers', value: totals.pax, icon: Users, delta: '+8%' },
    { label: 'Avg occupancy', value: `${Math.round(totals.occupancy * 100)}%`, icon: TrendingUp, delta: '+3pt' },
    { label: 'Active buses', value: FLEET.length, icon: BusFront, delta: '' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">Operator portal</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Fleet overview</h1>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-primary"><Plus className="h-4 w-4" aria-hidden /> Schedule trip</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, delta }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-brand-600" aria-hidden />{delta && <span className="text-xs font-semibold text-emerald-600">{delta}</span>}</div>
            <p className="mt-3 text-2xl font-extrabold">{value}</p>
            <p className="text-xs font-semibold text-ink-500">{label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form className="card mt-6 grid animate-fade-up gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); setShowForm(false); notify('Trip scheduled and published to search.', 'success'); }}>
          <div><label htmlFor="op-from" className="label">From</label><select id="op-from" className="input">{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label htmlFor="op-to" className="label">To</label><select id="op-to" className="input" defaultValue="Chennai">{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label htmlFor="op-date" className="label">Date</label><input id="op-date" type="date" className="input" defaultValue={todayISO(1)} /></div>
          <div><label htmlFor="op-type" className="label">Bus type</label><select id="op-type" className="input">{BUS_TYPES.map((t) => <option key={t.name}>{t.name}</option>)}</select></div>
          <div className="flex items-end"><button type="submit" className="btn-primary w-full">Publish</button></div>
        </form>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-4 pt-4 text-left text-base font-bold">Today&apos;s departures</caption>
          <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-500">{['Bus', 'Route', 'Departs', 'Type', 'Occupancy', 'Revenue'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {FLEET.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold">{b.id}</td>
                <td className="px-4 py-3 font-semibold">{b.route}</td>
                <td className="px-4 py-3 tabular-nums">{b.dep}</td>
                <td className="px-4 py-3 text-ink-500">{b.type}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${b.occupancy * 100}%` }} /></div>
                    <span className="text-xs font-semibold tabular-nums">{Math.round(b.occupancy * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold">{money(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
