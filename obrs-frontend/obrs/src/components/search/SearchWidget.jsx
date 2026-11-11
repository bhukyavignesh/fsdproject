import { useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, MapPin, Search, Plus, X } from 'lucide-react';
import { CITIES } from '../../data/constants';
import { useSearch } from '../../context/SearchContext';
import { todayISO } from '../../utils/format';

function CityField({ id, label, value, onChange, exclude }) {
  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input appearance-none !pl-9 font-semibold">
          {CITIES.map((c) => <option key={c} value={c} disabled={c === exclude}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function SearchWidget({ variant = 'hero', onSearched }) {
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState(query);
  const [showReturn, setShowReturn] = useState(Boolean(query.returnDate));
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState('');

  const update = (patch) => { setError(''); setForm((f) => ({ ...f, ...patch })); };

  const swap = () => {
    setSwapping(true);
    update({ from: form.to, to: form.from });
    setTimeout(() => setSwapping(false), 300);
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.from === form.to) return setError('Origin and destination must be different.');
    if (showReturn && form.returnDate && form.returnDate < form.date) return setError('Return date cannot be before departure.');
    const q = { ...form, returnDate: showReturn ? form.returnDate : '' };
    setQuery(q);
    navigate({ pathname: '/buses', search: `?${createSearchParams({ from: q.from, to: q.to, date: q.date, ...(q.returnDate && { return: q.returnDate }) })}` });
    onSearched?.();
  };

  const isHero = variant === 'hero';

  return (
    <form onSubmit={submit} className={isHero ? 'card p-4 sm:p-6' : ''} aria-label="Search buses">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end lg:flex-[2]">
          <CityField id={`${variant}-from`} label="From" value={form.from} onChange={(v) => update({ from: v })} exclude={form.to} />
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className={`absolute right-4 top-[3.35rem] z-10 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-brand-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 sm:static sm:mb-0.5 sm:shrink-0 ${swapping ? 'rotate-180' : ''}`}
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden />
          </button>
          <CityField id={`${variant}-to`} label="To" value={form.to} onChange={(v) => update({ to: v })} exclude={form.from} />
        </div>

        <div className="flex gap-3 lg:flex-[1.4]">
          <div className="flex-1">
            <label htmlFor={`${variant}-date`} className="label">Departure</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
              <input id={`${variant}-date`} type="date" required min={todayISO()} value={form.date} onChange={(e) => update({ date: e.target.value })} className="input !pl-9 font-semibold" />
            </div>
          </div>
          <div className="flex-1">
            <span className="label" id={`${variant}-ret-label`}>Return <span className="normal-case text-slate-400">(optional)</span></span>
            {showReturn ? (
              <div className="relative">
                <input aria-labelledby={`${variant}-ret-label`} type="date" min={form.date} value={form.returnDate} onChange={(e) => update({ returnDate: e.target.value })} className="input pr-9 font-semibold" />
                <button type="button" onClick={() => { setShowReturn(false); update({ returnDate: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-500 hover:bg-slate-100" aria-label="Remove return date">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowReturn(true)} className="input flex items-center gap-2 text-left text-ink-500 hover:border-brand-300">
                <Plus className="h-4 w-4 text-brand-600" aria-hidden /> Add return
              </button>
            )}
          </div>
        </div>

        <button type="submit" className={`btn-primary ${isHero ? 'h-[46px] px-6 text-base lg:w-auto' : 'h-[42px]'}`}>
          <Search className="h-5 w-5" aria-hidden /> Search Buses
        </button>
      </div>

      {isHero && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-ink-500">Quick dates:</span>
          {[['Today', 0], ['Tomorrow', 1], ['This weekend', (6 - new Date().getDay() + 7) % 7 || 7]].map(([label, off]) => {
            const d = todayISO(off);
            return (
              <button type="button" key={label} onClick={() => update({ date: d })} className={`chip ${form.date === d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-700 hover:border-slate-300'}`}>
                {label}
              </button>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
