import { Link, useSearchParams } from 'react-router-dom';
import { Download, Printer, Share2, Ticket } from 'lucide-react';
import ETicket from '../components/ticket/ETicket';
import { useBooking } from '../context/BookingContext';
import { useToast } from '../components/ui/Toast';

function SuccessCheck() {
  return (
    <svg className="h-20 w-20 animate-pop" viewBox="0 0 52 52" aria-hidden>
      <circle className="check-circle" cx="26" cy="26" r="25" fill="none" stroke="#10b981" strokeWidth="3" />
      <path className="check-mark" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-17" />
    </svg>
  );
}

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const { lastBooking, bookings } = useBooking();
  const notify = useToast();
  const pnr = params.get('pnr');
  const booking = bookings.find((b) => b.pnr === pnr) ?? lastBooking;

  if (!booking) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <Ticket className="h-12 w-12 text-ink-300" aria-hidden />
        <h1 className="text-xl font-extrabold">Booking not found</h1>
        <Link to="/dashboard" className="btn-primary">Go to My Bookings</Link>
      </div>
    );
  }

  const share = async () => {
    const text = `My bus ticket ${booking.pnr}: ${booking.bus.from} → ${booking.bus.to}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Bus ticket', text });
      else { await navigator.clipboard.writeText(text); notify('Ticket details copied to clipboard', 'success'); }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="no-print mb-8 flex flex-col items-center text-center">
        <SuccessCheck />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your e-ticket has been sent to <strong className="text-ink-900">{booking.contact.email}</strong>
          {booking.contact.whatsapp && ' and WhatsApp'}.
        </p>
      </div>

      <div className="animate-fade-up"><ETicket booking={booking} /></div>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => window.print()} className="btn-primary"><Download className="h-4 w-4" aria-hidden /> Download PDF</button>
        <button type="button" onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" aria-hidden /> Print</button>
        <button type="button" onClick={share} className="btn-secondary"><Share2 className="h-4 w-4" aria-hidden /> Share</button>
        <Link to="/dashboard" className="btn-ghost">View all bookings</Link>
      </div>
    </div>
  );
}
