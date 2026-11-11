import { useMemo, useState } from 'react';
import { ChevronDown, Moon, Sun, Sunrise, Sunset, Snowflake, Fan, BedDouble, Armchair, Star } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';
import { AMENITIES, DEPARTURE_SLOTS } from '../../data/constants';
import PriceRangeSlider from './PriceRangeSlider';
import { countActiveFilters } from '../../utils/filterBuses';
import { cx } from '../../utils/format';

const SLOT_ICONS = { Moon, Sunrise, Sun, Sunset };

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-100 py-4 last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-sm font-bold">
        {title}
        <ChevronDown className={cx('h-4 w-4 text-ink-500 transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function ToggleTile({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx('flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition', active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-700 hover:border-slate-300')}>
      <Icon className="h-5 w-5" aria-hidden />{label}
    </button>
  );
}

function CheckList({ options, selected, onToggle, limit = 5 }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, limit);
  return (
    <div className="space-y-1">
      {visible.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-slate-50">
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
          <span className="truncate">{opt}</span>
        </label>
      ))}
      {options.length > limit && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="px-1 text-xs font-semibold text-brand-600 hover:underline">
          {showAll ? 'Show less' : `+${options.length - limit} more`}
        </button>
      )}
    </div>
  );
}

export default function FilterSidebar({ buses, priceBounds }) {
  const { filters: f, setFilter, toggleFilter, resetFilters } = useSearch();

  const options = useMemo(() => {
    const uniq = (arr) => [...new Set(arr)].sort();
    return {
      operators: uniq(buses.map((b) => b.operator)),
      boarding: uniq(buses.flatMap((b) => b.boardingPoints.map((p) => p.name))),
      dropping: uniq(buses.flatMap((b) => b.droppingPoints.map((p) => p.name))),
    };
  }, [buses]);

  const active = countActiveFilters(f, priceBounds);

  return (
    <div aria-label="Filters">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-extrabold">Filters {active > 0 && <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{active}</span>}</h2>
        <button type="button" disabled={!active} onClick={() => resetFilters(priceBounds)} className="text-xs font-semibold text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline">Clear all</button>
      </div>

      <Section title="Bus type">
        <div className="grid grid-cols-4 gap-2">
          <ToggleTile active={f.ac} onClick={() => setFilter('ac', !f.ac)} icon={Snowflake} label="AC" />
          <ToggleTile active={f.nonAc} onClick={() => setFilter('nonAc', !f.nonAc)} icon={Fan} label="Non-AC" />
          <ToggleTile active={f.sleeper} onClick={() => setFilter('sleeper', !f.sleeper)} icon={BedDouble} label="Sleeper" />
          <ToggleTile active={f.seater} onClick={() => setFilter('seater', !f.seater)} icon={Armchair} label="Seater" />
        </div>
      </Section>

      <Section title="Departure time">
        <div className="grid grid-cols-2 gap-2">
          {DEPARTURE_SLOTS.map((s) => {
            const Icon = SLOT_ICONS[s.icon];
            return <ToggleTile key={s.id} active={f.departureSlots.includes(s.id)} onClick={() => toggleFilter('departureSlots', s.id)} icon={Icon} label={s.label} />;
          })}
        </div>
      </Section>

      <Section title="Price range">
        <PriceRangeSlider min={priceBounds[0]} max={priceBounds[1]} value={f.price} onChange={(v) => setFilter('price', v)} />
      </Section>

      <Section title="Rating">
        <div className="flex flex-wrap gap-2">
          {[0, 3.5, 4, 4.5].map((r) => (
            <button key={r} type="button" aria-pressed={f.minRating === r} onClick={() => setFilter('minRating', r)} className={cx('chip', f.minRating === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-700')}>
              {r ? <><Star className="h-3 w-3 fill-current" aria-hidden />{r}+</> : 'Any'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Amenities" defaultOpen={false}>
        <CheckList options={AMENITIES} selected={f.amenities} onToggle={(v) => toggleFilter('amenities', v)} />
      </Section>

      <Section title="Boarding points" defaultOpen={false}>
        <CheckList options={options.boarding} selected={f.boardingPoints} onToggle={(v) => toggleFilter('boardingPoints', v)} />
      </Section>

      <Section title="Drop points" defaultOpen={false}>
        <CheckList options={options.dropping} selected={f.droppingPoints} onToggle={(v) => toggleFilter('droppingPoints', v)} />
      </Section>

      <Section title="Operators" defaultOpen={false}>
        <CheckList options={options.operators} selected={f.operators} onToggle={(v) => toggleFilter('operators', v)} />
      </Section>
    </div>
  );
}
