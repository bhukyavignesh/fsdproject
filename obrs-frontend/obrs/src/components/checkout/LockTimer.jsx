import { Timer } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { formatCountdown, cx } from '../../utils/format';
import { SEAT_LOCK_MINUTES } from '../../data/constants';

export default function LockTimer({ expiresAt, onExpire }) {
  const remaining = useCountdown(expiresAt, onExpire);
  const pct = Math.max(0, Math.min(100, (remaining / (SEAT_LOCK_MINUTES * 60000)) * 100));
  const urgent = remaining < 2 * 60000;

  return (
    <div className={cx('sticky top-16 z-30 border-b backdrop-blur', urgent ? 'border-red-200 bg-red-50/95' : 'border-amber-200 bg-amber-50/95')}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Timer className={cx('h-5 w-5 shrink-0', urgent ? 'animate-pulse text-red-600' : 'text-amber-600')} aria-hidden />
        <p className="flex-1 text-sm">
          <span className="font-semibold">Seats held for you.</span>{' '}
          <span className="hidden text-ink-700 sm:inline">Complete payment before the timer runs out or they will be released.</span>
        </p>
        <span
          role="timer"
          aria-live={urgent ? 'assertive' : 'off'}
          aria-label={`Time remaining ${formatCountdown(remaining)}`}
          className={cx('rounded-lg px-2.5 py-1 font-mono text-base font-bold tabular-nums', urgent ? 'bg-red-600 text-white' : 'bg-white text-amber-700 ring-1 ring-amber-200')}
        >
          {formatCountdown(remaining)}
        </span>
      </div>
      <div className="h-1 w-full bg-black/5">
        <div className={cx('h-full transition-[width] duration-1000 ease-linear', urgent ? 'bg-red-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
