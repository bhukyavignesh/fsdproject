import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ticket, CalendarClock, History, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { usePreferences } from '../context/PreferencesContext';
import Modal from '../components/ui/Modal';
import { cx, formatClock, formatDate, todayISO } from '../utils/format';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'past', label: 'Completed', icon: History },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { bookings, cancelBooking } = useBooking();
  const { money } = usePreferences();
  const [tab, setTab] = useState('upcoming');
  const [toCancel, setToCancel] = useState(null);

  const today = todayISO();
  const groups = {
    upcoming: bookings.filter((b) => b.status !== 'CANCELLED' && b.bus.date >= today),
    past: bookings.filter((b) => b.status !== 'CANCELLED' && b.bus.date < today),
    cancelled: bookings.filter((b) => b.status === 'CANCELLED'),
  };
  const list = groups[tab];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">Hi {user.name.split(' ')[0]} 👋</p>
          <h1 className="text-2xl font-extrabold tracking-tight">My bookings</h1>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Trips', bookings.length], ['Upcoming', groups.upcoming.length], ['Saved', money(bookings.reduce((s, b) => s + (b.fare.discount || 0), 0))]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white px-4 py-2 ring-1 ring-slate-200"><p className="text-lg font-extrabold">{v}</p><p className="text-[11px] font-semibold uppercase text-ink-500">{k}</p></div>
          ))}
        </div>
      </div>

      <div role="tablist" className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold', tab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-900')}>
            <Icon className="h-4 w-4" aria-hidden />{label} <span className="text-xs opacity-60">{groups[id].length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Ticket className="h-10 w-10 text-ink-300" aria-hidden />
          <p className="font-semibold">Nothing here yet</p>
          <Link to="/" className="btn-primary">Book a trip</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.pnr} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[10rem] flex-1">
                <p className="font-bold">{b.bus.from} <ArrowRight className="inline h-3.5 w-3.5" /> {b.bus.to}</p>
                <p className="text-xs text-ink-500">{formatDate(b.bus.date)} · {formatClock(b.boarding.time)} · {b.bus.operator}</p>
              </div>
              <div className="text-sm"><span className="text-ink-500">Seats</span> <strong>{b.seats.map((s) => s.label).join(', ')}</strong></div>
              <div className="font-mono text-sm font-bold">{b.pnr}</div>
              <div className="font-extrabold">{money(b.fare.total)}</div>
              <div className="flex gap-2">
                <Link to={`/confirmation?pnr=${b.pnr}`} className="btn-secondary !py-2 text-xs">View ticket</Link>
                {tab === 'upcoming' && <button type="button" onClick={() => setToCancel(b)} className="btn-ghost !py-2 text-xs text-red-600 hover:bg-red-50">Cancel</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(toCancel)} onClose={() => setToCancel(null)} title="Cancel this booking?">
        {toCancel && (
          <>
            <p className="text-sm text-ink-500">PNR <strong className="font-mono text-ink-900">{toCancel.pnr}</strong> · Estimated refund <strong className="text-ink-900">{money(Math.round(toCancel.fare.total * 0.75))}</strong> (25% cancellation charge).</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setToCancel(null)} className="btn-secondary flex-1">Keep booking</button>
              <button type="button" onClick={() => { cancelBooking(toCancel.pnr); setToCancel(null); }} className="btn flex-1 bg-red-600 text-white hover:bg-red-700">Cancel ticket</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
