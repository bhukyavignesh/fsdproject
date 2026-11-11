import { ArrowRight, Armchair, BedDouble, Clock } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { computeFare } from '../../utils/fare';
import { formatClock } from '../../utils/format';
import Spinner from '../ui/Spinner';

export function FareBreakdown({ fare, compact = false }) {
  const { money } = usePreferences();
  const rows = [
    ['Seat fare', money(fare.seatFare)],
    fare.discount ? ['Promo discount', `− ${money(fare.discount)}`, 'text-emerald-600'] : null,
    ['GST (5%)', money(fare.taxes)],
    ['Convenience fee', money(fare.convenience)],
  ].filter(Boolean);
  return (
    <dl className={`space-y-2 text-sm ${compact ? '' : 'border-t border-slate-100 pt-3'}`}>
      {rows.map(([k, v, cls]) => (
        <div key={k} className="flex justify-between">
          <dt className="text-ink-500">{k}</dt>
          <dd className={`font-semibold ${cls ?? ''}`}>{v}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
        <dt className="font-bold">Total payable</dt>
        <dd className="font-extrabold">{money(fare.total)}</dd>
      </div>
    </dl>
  );
}

export default function FareSummary({ seats, boarding, dropping, onProceed, loading, disabledReason }) {
  const fare = computeFare(seats);
  return (
    <aside className="card flex flex-col gap-4 p-4 lg:sticky lg:top-24" aria-label="Fare summary">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-500">Fare summary</h3>

      {seats.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-ink-500">Pick seats on the map to see your fare.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Selected seats">
          {seats.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
              {s.type === 'sleeper' ? <BedDouble className="h-3.5 w-3.5" aria-hidden /> : <Armchair className="h-3.5 w-3.5" aria-hidden />}
              {s.label}
            </li>
          ))}
        </ul>
      )}

      {(boarding || dropping) && (
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
          {boarding && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-600" /> <strong>{formatClock(boarding.time)}</strong> {boarding.name}</p>}
          {dropping && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-600" /> <strong>{formatClock(dropping.time)}</strong> {dropping.name}</p>}
        </div>
      )}

      <FareBreakdown fare={fare} />

      <button type="button" onClick={onProceed} disabled={Boolean(disabledReason) || loading} className="btn-primary w-full !py-3">
        {loading ? <><Spinner /> Locking seats…</> : <>Proceed to Book <ArrowRight className="h-4 w-4" aria-hidden /></>}
      </button>
      {disabledReason && <p className="-mt-2 text-center text-xs text-ink-500">{disabledReason}</p>}
    </aside>
  );
}
