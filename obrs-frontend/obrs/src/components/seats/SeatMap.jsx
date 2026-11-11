import Seat from './Seat';
import { SEAT_STATUS } from '../../data/constants';
import { usePreferences } from '../../context/PreferencesContext';

function SteeringWheel() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Driver">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V21M9.6 11.2 3.5 9.5M14.4 11.2l6.1-1.7" />
    </svg>
  );
}

/**
 * Renders one deck as a CSS grid. Grid rows come from the layout API; `null`
 * cells are aisles. Selection state is owned by the parent.
 */
export default function SeatMap({ deck, selectedIds, onToggle, showDriver }) {
  const { money } = usePreferences();
  const cols = deck.grid[0]?.length ?? 4;

  return (
    <div className="inline-block rounded-2xl border-2 border-slate-200 bg-white p-4 pt-3">
      <div className="mb-3 flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Front</span>
        {showDriver ? <SteeringWheel /> : <span className="h-7" />}
      </div>
      <div
        role="group"
        aria-label={`${deck.name} seat map`}
        className="grid gap-2"
        style={{ gridTemplateColumns: deck.grid[0].map((c) => (c ? 'auto' : '1.25rem')).join(' ') }}
      >
        {deck.grid.flatMap((row, r) => row.map((seat, c) => (
          seat ? (
            <Seat
              key={seat.id}
              seat={seat}
              status={selectedIds.includes(seat.id) ? SEAT_STATUS.SELECTED : seat.status}
              onToggle={onToggle}
              priceLabel={money(seat.fare)}
            />
          ) : <span key={`aisle-${r}-${c}`} aria-hidden />
        )))}
      </div>
      <span className="sr-only">{cols} columns per row</span>
    </div>
  );
}
