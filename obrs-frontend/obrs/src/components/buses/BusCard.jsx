import { ChevronDown, Wifi, Plug, Droplets, Lamp, MapPinned, Cookie, Snowflake, BedDouble, Armchair, BedSingle } from 'lucide-react';
import RatingBadge from '../ui/RatingBadge';
import SeatSelectionPanel from '../seats/SeatSelectionPanel';
import { usePreferences } from '../../context/PreferencesContext';
import { cx, formatClock, formatDuration } from '../../utils/format';

const AMENITY_ICONS = {
  WiFi: Wifi, 'Charging Point': Plug, 'Water Bottle': Droplets, Blanket: BedSingle,
  'Reading Light': Lamp, 'Live Tracking': MapPinned, Snacks: Cookie,
};

export default function BusCard({ bus, expanded, onToggle }) {
  const { money } = usePreferences();
  const nextDay = bus.arrival >= 1440;
  const lowSeats = bus.availableSeats <= 8;
  const panelId = `seats-${bus.id}`;

  return (
    <article className={cx('card overflow-hidden transition', expanded ? 'ring-2 ring-brand-500/30' : 'hover:shadow-lift')} aria-label={`${bus.operator}, ${bus.busType}`}>
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1.4fr_1.6fr_1fr]">
        {/* Operator */}
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold">{bus.operator}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            {bus.ac && <Snowflake className="h-3.5 w-3.5 text-sky-500" aria-label="Air conditioned" />}
            {bus.kind === 'sleeper' ? <BedDouble className="h-3.5 w-3.5" aria-hidden /> : <Armchair className="h-3.5 w-3.5" aria-hidden />}
            {bus.busType}
          </p>
          <div className="mt-2"><RatingBadge rating={bus.rating} count={bus.ratingCount} /></div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Amenities">
            {bus.amenities.slice(0, 5).map((a) => {
              const Icon = AMENITY_ICONS[a];
              return (
                <li key={a} title={a} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-ink-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">{a}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xl font-extrabold tabular-nums">{formatClock(bus.departure)}</p>
            <p className="max-w-[7rem] truncate text-xs text-ink-500">{bus.boardingPoints[0].name}</p>
          </div>
          <div className="flex flex-1 flex-col items-center text-[11px] font-semibold text-ink-500">
            {formatDuration(bus.duration)}
            <div className="relative my-1 h-px w-full bg-slate-300">
              <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full border-2 border-emerald-500 bg-white" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-600" />
            </div>
            {bus.liveTracking ? <span className="text-emerald-600">Live tracking</span> : <span>&nbsp;</span>}
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold tabular-nums">
              {formatClock(bus.arrival)}{nextDay && <sup className="ml-0.5 text-[10px] font-bold text-brand-600">+1</sup>}
            </p>
            <p className="max-w-[7rem] truncate text-xs text-ink-500">{bus.droppingPoints.at(-1).name}</p>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 md:flex-col md:items-end md:justify-center md:border-0 md:pt-0">
          <div className="md:text-right">
            <p className="text-xs text-ink-500">Starts from</p>
            <p className="text-2xl font-extrabold leading-tight">{money(bus.minFare)}</p>
            <p className={cx('text-xs font-semibold', lowSeats ? 'text-brand-600' : 'text-emerald-600')}>
              {bus.availableSeats} seats left{lowSeats && ' · filling fast'}
            </p>
          </div>
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className={expanded ? 'btn-secondary' : 'btn-primary'}>
            {expanded ? 'Hide Seats' : 'Select Seats'}
            <ChevronDown className={cx('h-4 w-4 transition', expanded && 'rotate-180')} aria-hidden />
          </button>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="animate-fade-up">
          <SeatSelectionPanel bus={bus} />
        </div>
      )}
    </article>
  );
}

export function BusCardSkeleton() {
  return (
    <div className="card animate-pulse p-5" aria-hidden>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1.6fr_1fr]">
        <div className="space-y-2"><div className="h-4 w-40 rounded bg-slate-200" /><div className="h-3 w-56 rounded bg-slate-100" /><div className="h-5 w-24 rounded bg-slate-100" /></div>
        <div className="flex items-center gap-3"><div className="h-6 w-14 rounded bg-slate-200" /><div className="h-px flex-1 bg-slate-200" /><div className="h-6 w-14 rounded bg-slate-200" /></div>
        <div className="flex flex-col items-end gap-2"><div className="h-6 w-20 rounded bg-slate-200" /><div className="h-9 w-32 rounded-xl bg-slate-200" /></div>
      </div>
    </div>
  );
}
