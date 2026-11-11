import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Radio } from 'lucide-react';
import SeatMap from './SeatMap';
import SeatLegend from './SeatLegend';
import FareSummary from './FareSummary';
import Spinner from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { getSeatLayout } from '../../services/api';
import { useBooking } from '../../context/BookingContext';
import { useLiveSeatUpdates } from '../../hooks/useLiveSeatUpdates';
import { MAX_SEATS_PER_BOOKING, SEAT_STATUS } from '../../data/constants';
import { cx, formatClock } from '../../utils/format';

function PointSelect({ id, label, points, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" value={value?.id ?? ''} onChange={(e) => onChange(points.find((p) => p.id === e.target.value))}>
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {points.map((p) => <option key={p.id} value={p.id}>{formatClock(p.time)} · {p.name}</option>)}
      </select>
    </div>
  );
}

export default function SeatSelectionPanel({ bus }) {
  const [layout, setLayout] = useState(null);
  const [activeDeck, setActiveDeck] = useState('lower');
  const [selectedIds, setSelectedIds] = useState([]);
  const [boarding, setBoarding] = useState(bus.boardingPoints[0]);
  const [dropping, setDropping] = useState(bus.droppingPoints.at(-1));
  const [locking, setLocking] = useState(false);
  const notify = useToast();
  const { holdSeats } = useBooking();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getSeatLayout(bus).then((l) => { if (alive) setLayout(l); });
    return () => { alive = false; };
  }, [bus]);

  const seatIndex = useMemo(() => {
    const map = new Map();
    layout?.decks.forEach((d) => d.grid.flat().forEach((s) => s && map.set(s.id, s)));
    return map;
  }, [layout]);

  const selectedSeats = selectedIds.map((id) => seatIndex.get(id)).filter(Boolean);

  const toggleSeat = useCallback((seat) => {
    setSelectedIds((ids) => {
      if (ids.includes(seat.id)) return ids.filter((x) => x !== seat.id);
      if (ids.length >= MAX_SEATS_PER_BOOKING) {
        notify(`You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time.`, 'warning');
        return ids;
      }
      if (seat.status === SEAT_STATUS.FEMALE) notify(`${seat.label} is reserved for a female passenger.`, 'info');
      return [...ids, seat.id];
    });
  }, [notify]);

  // Live updates: another user grabbed a seat.
  const onLiveUpdate = useCallback(({ seatId, status }) => {
    setLayout((l) => l && ({
      ...l,
      decks: l.decks.map((d) => ({ ...d, grid: d.grid.map((row) => row.map((s) => (s?.id === seatId ? { ...s, status } : s))) })),
    }));
  }, []);
  useLiveSeatUpdates({ enabled: Boolean(layout), layout, selectedIds, onUpdate: onLiveUpdate });

  const proceed = async () => {
    setLocking(true);
    try {
      await holdSeats({ bus, seats: selectedSeats, boarding, dropping });
      navigate('/checkout');
    } catch {
      notify('Those seats were just taken. Please pick again.', 'warning');
    } finally {
      setLocking(false);
    }
  };

  if (!layout) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500"><Spinner className="h-5 w-5" /> Loading seat map…</div>;
  }

  const deck = layout.decks.find((d) => d.id === activeDeck) ?? layout.decks[0];
  const isDouble = layout.decks.length > 1;
  const selectedOnDeck = (d) => selectedSeats.filter((s) => s.deck === d.id).length;
  const disabledReason = !selectedSeats.length ? 'Select at least one seat' : !boarding || !dropping ? 'Choose boarding & drop points' : '';

  return (
    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className={cx('text-sm font-bold', isDouble && 'hidden md:block')}>Choose your seats</h4>
          {isDouble && (
            <div role="tablist" aria-label="Deck" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200 md:hidden">
              {layout.decks.map((d) => (
                <button
                  key={d.id} role="tab" type="button" aria-selected={deck.id === d.id}
                  onClick={() => setActiveDeck(d.id)}
                  className={cx('rounded-lg px-4 py-1.5 text-sm font-semibold transition', deck.id === d.id ? 'bg-ink-900 text-white shadow' : 'text-ink-700 hover:bg-slate-100')}
                >
                  {d.name}
                  {selectedOnDeck(d) > 0 && <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{selectedOnDeck(d)}</span>}
                </button>
              ))}
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden /> Live availability
          </span>
        </div>

        <SeatLegend />

        {/* Desktop shows both decks side by side; mobile uses tabs */}
        <div className="no-scrollbar flex gap-6 overflow-x-auto pb-1">
          {isDouble ? (
            <>
              {layout.decks.map((d) => (
                <div key={d.id} className={cx(d.id !== deck.id && 'hidden md:block')}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">{d.name}</p>
                  <SeatMap deck={d} selectedIds={selectedIds} onToggle={toggleSeat} showDriver={d.id === 'lower'} />
                </div>
              ))}
            </>
          ) : (
            <SeatMap deck={deck} selectedIds={selectedIds} onToggle={toggleSeat} showDriver />
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-ink-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Pink seats can only be booked by female passengers. Selected seats are held for 10 minutes once you proceed.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <PointSelect id={`${bus.id}-boarding`} label="Boarding point" points={bus.boardingPoints} value={boarding} onChange={setBoarding} />
          <PointSelect id={`${bus.id}-dropping`} label="Drop-off point" points={bus.droppingPoints} value={dropping} onChange={setDropping} />
        </div>
      </div>

      <FareSummary seats={selectedSeats} boarding={boarding} dropping={dropping} onProceed={proceed} loading={locking} disabledReason={disabledReason} />
    </div>
  );
}
