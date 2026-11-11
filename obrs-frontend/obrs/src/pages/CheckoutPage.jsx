import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageCircle, ShieldCheck, TimerOff, BusFront } from 'lucide-react';
import LockTimer from '../components/checkout/LockTimer';
import PassengerForm from '../components/checkout/PassengerForm';
import PromoCode from '../components/checkout/PromoCode';
import PaymentAccordion, { initialPayment, validatePayment } from '../components/checkout/PaymentAccordion';
import { FareBreakdown } from '../components/seats/FareSummary';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { SEAT_STATUS } from '../data/constants';
import { formatClock, formatDate, formatDuration } from '../utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(passengers, seats, contact, payment) {
  const errors = { passengers: [], contact: {}, payment: validatePayment(payment) };
  passengers.forEach((p, i) => {
    const e = {};
    if (p.name.trim().length < 2) e.name = 'Enter the full name';
    const age = Number(p.age);
    if (!age || age < 1 || age > 120) e.age = '1–120';
    if (!p.gender) e.gender = 'Select gender';
    if (seats[i].status === SEAT_STATUS.FEMALE && p.gender !== 'Female') e.gender = 'This seat is reserved for female passengers';
    errors.passengers[i] = e;
  });
  if (!EMAIL_RE.test(contact.email)) errors.contact.email = 'Enter a valid email';
  if (!/^[6-9]\d{9}$/.test(contact.phone)) errors.contact.phone = 'Enter a 10-digit Indian mobile number';
  const hasErrors = errors.passengers.some((e) => Object.keys(e).length)
    || Object.keys(errors.contact).length || Object.keys(errors.payment).length;
  return { errors, hasErrors };
}

function TripSummary({ bus, boarding, dropping, seats }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><BusFront className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <p className="truncate font-bold">{bus.operator}</p>
          <p className="truncate text-xs text-ink-500">{bus.busType}</p>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <p className="text-xs font-semibold text-ink-500">{formatDate(bus.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {formatDuration(bus.duration)}</p>
        <ol className="mt-2 space-y-2 border-l-2 border-dashed border-slate-300 pl-3">
          <li><strong className="tabular-nums">{formatClock(boarding.time)}</strong> {boarding.name}, {bus.from}</li>
          <li><strong className="tabular-nums">{formatClock(dropping.time)}</strong> {dropping.name}, {bus.to}</li>
        </ol>
      </div>
      <p className="text-sm"><span className="text-ink-500">Seats:</span> <strong>{seats.map((s) => s.label).join(', ')}</strong></p>
    </div>
  );
}

export default function CheckoutPage() {
  const booking = useBooking();
  const { bus, seats, boarding, dropping, lock, fare, confirmBooking, releaseHold } = booking;
  const { user } = useAuth();
  const { money } = usePreferences();
  const navigate = useNavigate();

  const [passengers, setPassengers] = useState(() => seats.map((s, i) => ({
    name: i === 0 && user ? user.name : '',
    age: '',
    gender: s.status === SEAT_STATUS.FEMALE ? 'Female' : '',
  })));
  const [contact, setContact] = useState({ email: user?.email ?? '', phone: '', whatsapp: true });
  const [payment, setPayment] = useState(initialPayment);
  const [attempted, setAttempted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [expired, setExpired] = useState(false);

  const onExpire = useCallback(() => setExpired(true), []);

  // Validate live after the first submit attempt so messages clear as the user fixes fields.
  const validation = useMemo(
    () => (seats.length ? validate(passengers, seats, contact, payment) : null),
    [passengers, seats, contact, payment],
  );
  const errors = attempted ? validation?.errors : null;

  if (!bus || !lock) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <BusFront className="h-12 w-12 text-ink-300" aria-hidden />
        <h1 className="text-xl font-extrabold">No seats on hold</h1>
        <p className="text-sm text-ink-500">Search for a bus and pick your seats to start a booking.</p>
        <Link to="/" className="btn-primary mt-2">Search buses</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    if (validation.hasErrors) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setPaying(true);
    try {
      const confirmed = await confirmBooking({ passengers, contact, payment });
      navigate(`/confirmation?pnr=${confirmed.pnr}`, { replace: true });
    } finally {
      setPaying(false);
    }
  };

  const handleExpiredClose = async () => {
    await releaseHold();
    navigate(`/buses?from=${bus.from}&to=${bus.to}&date=${bus.date}`, { replace: true });
  };

  const goBack = async () => {
    await releaseHold();
    navigate(-1);
  };

  return (
    <>
      <LockTimer expiresAt={lock.expiresAt} onExpire={onExpire} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <button type="button" onClick={goBack} className="btn-ghost -ml-3 mb-2 !py-1.5 text-sm"><ArrowLeft className="h-4 w-4" /> Change seats</button>
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Passenger details & payment</h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form id="checkout-form" onSubmit={submit} noValidate className="space-y-6">
            <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="pax-title">
              <h2 id="pax-title" className="text-lg font-bold">Passengers <span className="text-sm font-medium text-ink-500">({seats.length})</span></h2>
              {seats.map((seat, i) => (
                <PassengerForm
                  key={seat.id}
                  index={i}
                  seat={seat}
                  value={passengers[i]}
                  errors={errors?.passengers[i]}
                  onChange={(v) => setPassengers((ps) => ps.map((p, j) => (j === i ? v : p)))}
                />
              ))}
            </section>

            <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="contact-title">
              <div>
                <h2 id="contact-title" className="text-lg font-bold">Contact details</h2>
                <p className="text-sm text-ink-500">Your e-ticket and live trip updates will be sent here.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
                    <input id="email" type="email" autoComplete="email" className="input !pl-9" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} aria-invalid={Boolean(errors?.contact.email)} aria-describedby="email-err" placeholder="you@example.com" />
                  </div>
                  {errors?.contact.email && <p id="email-err" className="mt-1 text-xs text-red-600">{errors.contact.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="label">Mobile number</label>
                  <div className="flex">
                    <span className="inline-flex items-center gap-1 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-ink-700"><Phone className="h-3.5 w-3.5" aria-hidden />+91</span>
                    <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} className="input !rounded-l-none" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '') })} aria-invalid={Boolean(errors?.contact.phone)} aria-describedby="phone-err" placeholder="98765 43210" />
                  </div>
                  {errors?.contact.phone && <p id="phone-err" className="mt-1 text-xs text-red-600">{errors.contact.phone}</p>}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden /> Send my ticket and updates on WhatsApp too
              </label>
            </section>

            <section className="card space-y-4 p-4 sm:p-6" aria-labelledby="pay-title">
              <h2 id="pay-title" className="text-lg font-bold">Payment method</h2>
              <PaymentAccordion value={payment} errors={errors?.payment ?? {}} onChange={setPayment} />
            </section>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start" aria-label="Booking summary">
            <div className="card p-4 sm:p-5"><TripSummary bus={bus} boarding={boarding} dropping={dropping} seats={seats} /></div>
            <div className="card space-y-4 p-4 sm:p-5">
              <PromoCode />
              <FareBreakdown fare={fare} />
              <button type="submit" form="checkout-form" disabled={paying || expired} className="btn-primary w-full !py-3.5 text-base">
                {paying ? <><Spinner /> Processing payment…</> : <><ShieldCheck className="h-5 w-5" aria-hidden /> Pay {money(fare.total)}</>}
              </button>
              <p className="text-center text-xs text-ink-500">By paying you agree to the operator&apos;s cancellation policy.</p>
            </div>
          </aside>
        </div>
      </div>

      <Modal open={expired} title="Your seat hold expired" dismissible={false}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600"><TimerOff className="h-7 w-7" aria-hidden /></span>
          <p className="text-sm text-ink-500">To keep things fair for other travellers, seats are only held for 10 minutes. They may still be available — pick them again to continue.</p>
          <button type="button" onClick={handleExpiredClose} className="btn-primary mt-2 w-full">Choose seats again</button>
        </div>
      </Modal>

      {paying && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm" role="status" aria-live="assertive">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-10 w-10 text-brand-600" />
            <p className="font-semibold">Confirming your booking…</p>
            <p className="text-xs text-ink-500">Please don&apos;t close or refresh this page.</p>
          </div>
        </div>
      )}
    </>
  );
}
