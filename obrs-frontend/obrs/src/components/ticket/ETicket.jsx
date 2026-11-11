import { BusFront, MapPin, Navigation } from 'lucide-react';
import QrCode from '../ui/QrCode';
import { usePreferences } from '../../context/PreferencesContext';
import { formatClock, formatDate, formatDuration } from '../../utils/format';

function MapSnippet({ point, city }) {
  // Placeholder for an embedded map (Google Maps / Mapbox static image with the stop's lat/lng).
  return (
    <div className="relative h-32 overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 130" preserveAspectRatio="none" aria-hidden>
        <path d="M0 90 C60 70 90 110 150 80 S250 40 300 60" stroke="#cbd5e1" strokeWidth="10" fill="none" />
        <path d="M120 0 L140 130" stroke="#e2e8f0" strokeWidth="8" />
        <path d="M0 30 L300 20" stroke="#e2e8f0" strokeWidth="6" />
        <path d="M220 0 C210 50 240 90 230 130" stroke="#e2e8f0" strokeWidth="6" fill="none" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <MapPin className="h-8 w-8 fill-brand-600 text-white drop-shadow" aria-hidden />
      </div>
      <a href={`https://maps.google.com/?q=${encodeURIComponent(`${point.name}, ${city}`)}`} target="_blank" rel="noreferrer" className="no-print absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold shadow">
        <Navigation className="h-3 w-3" aria-hidden /> Directions
      </a>
      <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium">{point.name}</span>
    </div>
  );
}

export default function ETicket({ booking }) {
  const { money } = usePreferences();
  const { bus, seats, passengers, boarding, dropping, fare, pnr, contact } = booking;

  return (
    <article id="printable-ticket" className="overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-slate-200" aria-label={`E-ticket ${pnr}`}>
      <header className="flex items-center justify-between bg-ink-900 px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-2">
          <BusFront className="h-5 w-5 text-brand-400" aria-hidden />
          <span className="font-extrabold">RouteRed e-Ticket</span>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">{booking.status}</span>
      </header>

      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div><p className="label !mb-0.5">PNR</p><p className="font-mono text-lg font-extrabold tracking-wider">{pnr}</p></div>
            <div><p className="label !mb-0.5">Operator</p><p className="font-bold">{bus.operator}</p><p className="text-xs text-ink-500">{bus.busType}</p></div>
            <div><p className="label !mb-0.5">Journey date</p><p className="font-bold">{formatDate(bus.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-extrabold tabular-nums">{formatClock(boarding.time)}</p>
              <p className="text-sm font-semibold">{bus.from}</p>
              <p className="text-xs text-ink-500">{boarding.name}</p>
            </div>
            <div className="flex flex-1 flex-col items-center text-xs text-ink-500">
              {formatDuration(bus.duration)}
              <div className="my-1 h-px w-full border-t-2 border-dashed border-slate-300" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tabular-nums">{formatClock(dropping.time)}</p>
              <p className="text-sm font-semibold">{bus.to}</p>
              <p className="text-xs text-ink-500">{dropping.name}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <caption className="sr-only">Passengers</caption>
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-500"><th className="pb-2 font-semibold">Passenger</th><th className="pb-2 font-semibold">Age / Gender</th><th className="pb-2 text-right font-semibold">Seat</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {passengers.map((p, i) => (
                <tr key={seats[i].id}><td className="py-2 font-semibold">{p.name}</td><td className="py-2 text-ink-500">{p.age} · {p.gender}</td><td className="py-2 text-right font-mono font-bold">{seats[i].label}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center gap-2 md:border-l md:border-dashed md:border-slate-300 md:pl-6">
          <QrCode value={pnr} />
          <p className="text-center text-[11px] text-ink-500">Show this QR to the<br />conductor while boarding</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200" aria-hidden />
        <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200" aria-hidden />
        <div className="border-t-2 border-dashed border-slate-200" />
      </div>

      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
        <div>
          <p className="label">Boarding point</p>
          <MapSnippet point={boarding} city={bus.from} />
          <p className="mt-2 text-xs text-ink-500">Report 15 minutes before {formatClock(boarding.time)} · {boarding.address}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="label">Payment</p>
          <div className="flex justify-between"><span className="text-ink-500">Fare paid</span><strong>{money(fare.total)}</strong></div>
          {fare.discount > 0 && <div className="flex justify-between"><span className="text-ink-500">You saved</span><strong className="text-emerald-600">{money(fare.discount)}</strong></div>}
          <div className="flex justify-between"><span className="text-ink-500">Paid via</span><strong className="uppercase">{booking.payment.method}</strong></div>
          <div className="flex justify-between"><span className="text-ink-500">Sent to</span><strong className="truncate pl-4">{contact.email}</strong></div>
          <div className="flex justify-between"><span className="text-ink-500">Mobile</span><strong>+91 {contact.phone}</strong></div>
        </div>
      </div>
    </article>
  );
}
