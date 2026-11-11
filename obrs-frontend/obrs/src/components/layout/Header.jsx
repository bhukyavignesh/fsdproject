import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Globe, Menu, X, UserRound, LogOut, Ticket, Building2, ChevronDown, BadgePercent, Headphones } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useSearch } from '../../context/SearchContext';
import { formatDate } from '../../utils/format';

function PrefSelects({ className = '' }) {
  const { currency, setCurrency, language, setLanguage } = usePreferences();
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Globe className="h-4 w-4 text-ink-500" aria-hidden />
      <label className="sr-only" htmlFor="lang">Language</label>
      <select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <option value="en">EN</option>
        <option value="hi">हिं</option>
      </select>
      <label className="sr-only" htmlFor="currency">Currency</label>
      <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <option value="INR">₹ INR</option>
        <option value="USD">$ USD</option>
      </select>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="btn-secondary !py-2">
        <UserRound className="h-4 w-4" aria-hidden /> {t('login')}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-sm font-semibold hover:bg-slate-50">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{user.initials}</span>
        <span className="hidden max-w-[8rem] truncate lg:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4 text-ink-500" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lift">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
          <Link role="menuitem" to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"><Ticket className="h-4 w-4" /> {t('bookings')}</Link>
          <Link role="menuitem" to="/operator" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"><Building2 className="h-4 w-4" /> {t('operator')}</Link>
          <button role="menuitem" type="button" onClick={() => { logout(); setOpen(false); navigate('/'); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const { query } = useSearch();
  const { t } = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => setMobileOpen(false), [pathname]);

  const navClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-brand-600' : 'text-ink-700 hover:bg-slate-100'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        {!isHome && (
          <Link to="/" className="hidden min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-ink-700 hover:border-slate-300 md:flex">
            <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <span className="truncate font-medium">{query.from} → {query.to}</span>
            <span className="text-ink-500">· {formatDate(query.date)}</span>
          </Link>
        )}

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLink to="/#offers" className={() => navClass({ isActive: false })}><BadgePercent className="mr-1 inline h-4 w-4" />{t('offers')}</NavLink>
          <NavLink to="/dashboard" className={navClass}>{t('bookings')}</NavLink>
          <NavLink to="/operator" className={navClass}>{t('operator')}</NavLink>
          <PrefSelects className="ml-2 border-l border-slate-200 pl-3" />
          <div className="ml-2"><UserMenu /></div>
        </nav>

        <button type="button" className="ml-auto rounded-lg p-2 md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="animate-fade-up border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            <NavLink to="/dashboard" className={navClass}>{t('bookings')}</NavLink>
            <NavLink to="/operator" className={navClass}>{t('operator')}</NavLink>
            <a href="#help" className={navClass({ isActive: false })}><Headphones className="mr-1 inline h-4 w-4" />{t('help')}</a>
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <PrefSelects />
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  );
}
