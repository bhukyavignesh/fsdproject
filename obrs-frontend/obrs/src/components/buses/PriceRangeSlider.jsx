import { usePreferences } from '../../context/PreferencesContext';

export default function PriceRangeSlider({ min, max, value, onChange, step = 50 }) {
  const { money } = usePreferences();
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const left = ((lo - min) / span) * 100;
  const right = 100 - ((hi - min) / span) * 100;

  return (
    <div>
      <div className="mb-3 flex justify-between text-sm font-semibold">
        <span>{money(lo)}</span>
        <span>{money(hi)}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-200" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500" style={{ left: `${left}%`, right: `${right}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          aria-label="Minimum price"
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - step), hi])}
          className="range-dual absolute inset-0 h-5 w-full"
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          aria-label="Maximum price"
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
          className="range-dual absolute inset-0 h-5 w-full"
        />
      </div>
    </div>
  );
}
