import { memo } from 'react';
import { SEAT_STATUS } from '../../data/constants';
import { cx } from '../../utils/format';

const STYLES = {
  [SEAT_STATUS.AVAILABLE]: 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow',
  [SEAT_STATUS.SELECTED]: 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-200',
  [SEAT_STATUS.BOOKED]: 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-400',
  [SEAT_STATUS.FEMALE]: 'border-pink-500 bg-pink-50 text-pink-700 hover:bg-pink-100',
};

const STATUS_TEXT = {
  [SEAT_STATUS.AVAILABLE]: 'available',
  [SEAT_STATUS.SELECTED]: 'selected',
  [SEAT_STATUS.BOOKED]: 'already booked',
  [SEAT_STATUS.FEMALE]: 'reserved for female passengers',
};

/**
 * A single seat/berth. `status` is the effective status (selected overrides).
 * Rendered as a <button> so it is keyboard- and screen-reader-operable.
 */
function Seat({ seat, status, onToggle, priceLabel }) {
  const isSleeper = seat.type === 'sleeper';
  const disabled = status === SEAT_STATUS.BOOKED;
  const label = `Seat ${seat.label}, ${seat.type}, ${priceLabel}, ${STATUS_TEXT[status]}`;

  return (
    <button
      type="button"
      onClick={() => onToggle(seat)}
      disabled={disabled}
      aria-pressed={status === SEAT_STATUS.SELECTED}
      aria-label={label}
      title={disabled ? `${seat.label} · Booked` : `${seat.label} · ${priceLabel}`}
      className={cx(
        'group relative flex flex-col items-center justify-end rounded-lg border-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        isSleeper ? 'h-[4.5rem] w-10 pb-1.5' : 'h-10 w-10 pb-1',
        STYLES[status],
      )}
    >
      {/* pillow (sleeper) / backrest (seater) */}
      <span
        aria-hidden
        className={cx(
          'absolute left-1/2 -translate-x-1/2 rounded-sm',
          isSleeper ? 'top-1.5 h-1.5 w-6' : 'bottom-1 h-1 w-6 opacity-0',
          status === SEAT_STATUS.SELECTED ? 'bg-white/70' : 'bg-current opacity-40',
        )}
      />
      {disabled && <span aria-hidden className="absolute inset-0 rounded-md bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(148,163,184,.35)_4px,rgba(148,163,184,.35)_6px)]" />}
      <span className={cx('relative', !isSleeper && 'mb-1')}>{seat.label}</span>
    </button>
  );
}

export default memo(Seat);
