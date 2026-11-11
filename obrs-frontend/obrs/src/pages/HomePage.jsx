import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgePercent, ChevronLeft, ChevronRight, Copy, ShieldCheck, MapPinned, Headphones, Users, BusFront } from 'lucide-react';
import SearchWidget from '../components/search/SearchWidget';
import { OFFERS, POPULAR_ROUTES } from '../data/constants';
import { useSearch } from '../context/SearchContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../components/ui/Toast';
import { todayISO } from '../utils/format';

const TRUST = [
  { icon: ShieldCheck, title: 'Secure payments', text: 'PCI-DSS compliant checkout' },
  { icon: Users, title: 'Women-safe seats', text: 'Reserved seating & SOS' },
  { icon: MapPinned, title: 'Live bus tracking', text: 'Share your trip in one tap' },
  { icon: Headphones, title: '24×7 support', text: 'Real humans, any language' },
];

function OffersCarousel() {
  const track = useRef(null);
  const notify = useToast();
  const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard blocked */ }
    notify(`Code ${code} copied — apply it at checkout.`, 'success');
  };

  return (
    <section id="offers" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="offers-title">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 id="offers-title" className="text-2xl font-extrabold tracking-tight">Offers for you</h2>
          <p className="text-sm text-ink-500">Tap a code to copy it.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} className="btn-secondary !p-2" aria-label="Previous offers"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => scroll(1)} className="btn-secondary !p-2" aria-label="Next offers"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      <div ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {OFFERS.map((o, i) => (
          <article key={i} className={`relative w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-card sm:w-[calc(50%-.5rem)] lg:w-[calc(33.333%-.7rem)] ${o.tone}`}>
            <BadgePercent className="absolute -right-4 -top-4 h-28 w-28 opacity-15" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Limited offer</p>
            <h3 className="mt-1 text-xl font-extrabold">{o.title}</h3>
            <p className="mt-1 text-sm opacity-90">{o.subtitle}</p>
            <button type="button" onClick={() => copy(o.code)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/60 bg-white/15 px-3 py-1.5 text-sm font-bold tracking-wider backdrop-blur hover:bg-white/25">
              {o.code} <Copy className="h-3.5 w-3.5" aria-hidden />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PopularRoutes() {
  const { setQuery } = useSearch();
  const { money } = usePreferences();
  const navigate = useNavigate();
  const go = (r) => {
    const date = todayISO(1);
    setQuery({ from: r.from, to: r.to, date, returnDate: '' });
    navigate(`/buses?from=${r.from}&to=${r.to}&date=${date}`);
  };
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="routes-title">
      <h2 id="routes-title" className="mb-5 text-2xl font-extrabold tracking-tight">Popular routes</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POPULAR_ROUTES.map((r) => (
          <li key={`${r.from}-${r.to}`}>
            <button type="button" onClick={() => go(r)} className="card group flex w-full items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><BusFront className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{r.from} → {r.to}</span>
                <span className="text-xs text-ink-500">{r.buses} buses daily · from <strong className="text-ink-900">{money(r.fareFrom)}</strong></span>
              </span>
              <ArrowRight className="h-5 w-5 text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-600" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 pb-28 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 35%), radial-gradient(circle at 85% 0%, #ffd7a8 0, transparent 30%)' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> 12,400+ buses running today
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Your seat, your route.<br className="hidden sm:block" /> Booked in under a minute.
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/85">Compare operators, pick the exact berth you want on a live seat map, and get your e-ticket on WhatsApp.</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 sm:px-6">
        <SearchWidget variant="hero" />
      </div>

      <section className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4" aria-label="Why book with us">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
            <Icon className="h-6 w-6 shrink-0 text-brand-600" aria-hidden />
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-ink-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <OffersCarousel />
      <PopularRoutes />
    </>
  );
}
