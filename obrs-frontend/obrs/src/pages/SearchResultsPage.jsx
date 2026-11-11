import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, X } from 'lucide-react';
import SearchSummaryBar from '../components/buses/SearchSummaryBar';
import FilterSidebar from '../components/buses/FilterSidebar';
import BusCard, { BusCardSkeleton } from '../components/buses/BusCard';
import { useSearch } from '../context/SearchContext';
import { searchBuses } from '../services/api';
import { applyFilters, countActiveFilters, sortBuses } from '../utils/filterBuses';
import { cx } from '../utils/format';

const SORT_OPTIONS = [
  { id: 'departure', label: 'Departure' },
  { id: 'price', label: 'Cheapest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'duration', label: 'Fastest' },
  { id: 'seats', label: 'Most seats' },
];

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const { query, setQuery, filters, setFilter, sort, setSort, resetFilters } = useSearch();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // URL is the source of truth for the search query (shareable/bookmarkable).
  useEffect(() => {
    const from = params.get('from');
    const to = params.get('to');
    const date = params.get('date');
    if (from && to && date && (from !== query.from || to !== query.to || date !== query.date)) {
      setQuery({ from, to, date, returnDate: params.get('return') ?? '' });
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setExpandedId(null);
    searchBuses(query).then((list) => {
      if (!alive) return;
      setBuses(list);
      if (list.length) {
        const fares = list.map((b) => b.minFare);
        setFilter('price', [Math.floor(Math.min(...fares) / 50) * 50, Math.ceil(Math.max(...fares) / 50) * 50]);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [query.from, query.to, query.date, setFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceBounds = useMemo(() => {
    if (!buses.length) return [0, 5000];
    const fares = buses.map((b) => b.minFare);
    return [Math.floor(Math.min(...fares) / 50) * 50, Math.ceil(Math.max(...fares) / 50) * 50];
  }, [buses]);

  const results = useMemo(() => sortBuses(applyFilters(buses, filters), sort), [buses, filters, sort]);
  const activeCount = countActiveFilters(filters, priceBounds);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      <SearchSummaryBar resultCount={results.length} loading={loading} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="card sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto p-4">
            <FilterSidebar buses={buses} priceBounds={priceBounds} />
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-fade-up flex-col bg-white">
              <div className="flex items-center justify-end border-b border-slate-100 p-3">
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close filters"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4"><FilterSidebar buses={buses} priceBounds={priceBounds} /></div>
              <div className="border-t border-slate-100 p-3">
                <button type="button" onClick={() => setDrawerOpen(false)} className="btn-primary w-full">Show {results.length} buses</button>
              </div>
            </div>
          </div>
        )}

        <section aria-label="Bus results" className="min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDrawerOpen(true)} className="btn-secondary shrink-0 !py-2 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
              {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{activeCount}</span>}
            </button>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" role="radiogroup" aria-label="Sort by">
              <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-500 sm:inline">Sort</span>
              {SORT_OPTIONS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={sort === o.id} onClick={() => setSort(o.id)} className={cx('chip shrink-0', sort === o.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-200 bg-white text-ink-700 hover:border-slate-300')}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {loading && Array.from({ length: 4 }, (_, i) => <BusCardSkeleton key={i} />)}

          {!loading && results.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <SearchX className="h-10 w-10 text-ink-300" aria-hidden />
              <h2 className="text-lg font-bold">No buses match your filters</h2>
              <p className="max-w-sm text-sm text-ink-500">Try widening the price range or removing a few filters.</p>
              {activeCount > 0 && <button type="button" onClick={() => resetFilters(priceBounds)} className="btn-primary">Clear filters</button>}
            </div>
          )}

          {!loading && results.map((bus) => (
            <BusCard key={bus.id} bus={bus} expanded={expandedId === bus.id} onToggle={() => setExpandedId((id) => (id === bus.id ? null : bus.id))} />
          ))}
        </section>
      </div>
    </>
  );
}
