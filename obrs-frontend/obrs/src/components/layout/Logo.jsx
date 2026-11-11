import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label="RouteRed home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Bus className="h-5 w-5" aria-hidden />
      </span>
      <span className={`text-lg ${light ? 'text-white' : 'text-ink-900'}`}>
        Route<span className="text-brand-600">Red</span>
      </span>
    </Link>
  );
}
