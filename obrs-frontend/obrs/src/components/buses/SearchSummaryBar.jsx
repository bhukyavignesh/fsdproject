import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import SearchWidget from '../search/SearchWidget';
import { useSearch } from '../../context/SearchContext';
import { formatDate, todayISO, cx } from '../../utils/format';

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function SearchSummaryBar({ resultCount, loading }) {
  const { query, setQuery } = useSearch();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const goToDate = (date) => {
    setQuery({ date });
    navigate(`/buses?from=${query.from}&to=${query.to}&date=${date}`, { replace: true });
  };
  const canGoBack = query.date > todayISO();

  return (
    <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {editing ? (
          <div className="animate-fade-up">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost !px-2 !py-1 text-xs"><X className="h-4 w-4" /> Close</button>
            </div>
            <SearchWidget variant="compact" onSearched={() => setEditing(false)} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-base font-extrabold sm:text-lg">
                <span className="truncate">{query.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span className="truncate">{query.to}</span>
              </h1>
              <p className="text-xs text-ink-500" aria-live="polite">
                {formatDate(query.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                {query.returnDate && ` · Return ${formatDate(query.returnDate)}`}
                {' · '}{loading ? 'Searching…' : `${resultCount} buses found`}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200">
                <button type="button" disabled={!canGoBack} onClick={() => goToDate(shiftDate(query.date, -1))} className="p-2 text-ink-700 hover:bg-slate-50 disabled:opacity-30" aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
                {[0, 1, 2].map((off) => {
                  const d = shiftDate(query.date, off - (canGoBack ? 1 : 0));
                  if (d < todayISO()) return null;
                  const active = d === query.date;
                  return (
                    <button key={d} type="button" onClick={() => goToDate(d)} aria-current={active ? 'date' : undefined} className={cx('hidden px-3 py-1.5 text-xs font-semibold sm:block', active ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-slate-50')}>
                      {formatDate(d, { weekday: 'short', day: 'numeric' })}
                    </button>
                  );
                })}
                <button type="button" onClick={() => goToDate(shiftDate(query.date, 1))} className="p-2 text-ink-700 hover:bg-slate-50" aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => setEditing(true)} className="btn-secondary !py-2"><Pencil className="h-4 w-4" aria-hidden /> Modify</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
