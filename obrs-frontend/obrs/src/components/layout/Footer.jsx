import { Link } from 'react-router-dom';
import Logo from './Logo';

const COLUMNS = [
  { title: 'Company', links: ['About us', 'Careers', 'Press', 'Blog'] },
  { title: 'Support', links: ['Help centre', 'Cancel ticket', 'Refund status', 'Contact'] },
  { title: 'Partners', links: ['Operator portal', 'Agent signup', 'API access', 'Advertise'] },
];

export default function Footer() {
  return (
    <footer id="help" className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">Book intercity buses across 3,500+ operators with live seat maps, women-safe seating and instant e-tickets.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <Link to={l === 'Operator portal' ? '/operator' : '/'} className="text-sm text-ink-500 hover:text-brand-600">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-ink-500">© {new Date().getFullYear()} RouteRed Travels Pvt. Ltd. · Demo frontend</div>
    </footer>
  );
}
