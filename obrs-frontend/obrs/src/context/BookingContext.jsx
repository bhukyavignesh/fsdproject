import { createContext, useCallback, useContext, useMemo } from 'react';
import { usePersistentReducer } from '../hooks/usePersistentReducer';
import { computeFare } from '../utils/fare';
import * as api from '../services/api';

/**
 * Active booking flow state: chosen bus, seats, stops, temporary seat lock,
 * promo, and the last confirmed ticket. Draft lives in sessionStorage so a
 * refresh on /checkout keeps the lock; history lives in localStorage.
 */
const initialDraft = {
  bus: null,
  seats: [],
  boarding: null,
  dropping: null,
  lock: null, // { lockId, expiresAt }
  promo: null, // { code, discount, message }
  lastBooking: null,
};

function draftReducer(state, action) {
  switch (action.type) {
    case 'START_HOLD':
      return { ...initialDraft, lastBooking: state.lastBooking, ...action.payload };
    case 'SET_PROMO':
      return { ...state, promo: action.promo };
    case 'CLEAR_PROMO':
      return { ...state, promo: null };
    case 'RELEASE':
      return { ...initialDraft, lastBooking: state.lastBooking };
    case 'CONFIRMED':
      return { ...initialDraft, lastBooking: action.booking };
    default:
      return state;
  }
}

function historyReducer(state, action) {
  if (action.type === 'ADD') return { items: [action.booking, ...state.items].slice(0, 50) };
  if (action.type === 'CANCEL') {
    return { items: state.items.map((b) => (b.pnr === action.pnr ? { ...b, status: 'CANCELLED' } : b)) };
  }
  return state;
}

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [draft, dispatch] = usePersistentReducer(draftReducer, initialDraft, 'obrs.draft', window.sessionStorage);
  const [history, dispatchHistory] = usePersistentReducer(historyReducer, { items: [] }, 'obrs.history');

  const holdSeats = useCallback(async ({ bus, seats, boarding, dropping }) => {
    const lock = await api.lockSeats(bus.id, seats.map((s) => s.id));
    // Strip heavy fields we don't need downstream.
    const { boardingPoints, droppingPoints, ...busSummary } = bus;
    dispatch({ type: 'START_HOLD', payload: { bus: busSummary, seats, boarding, dropping, lock } });
    return lock;
  }, [dispatch]);

  const releaseHold = useCallback(async () => {
    if (draft.lock) await api.releaseSeats(draft.lock.lockId);
    dispatch({ type: 'RELEASE' });
  }, [draft.lock, dispatch]);

  const applyPromo = useCallback(async (code) => {
    const { seatFare } = computeFare(draft.seats);
    const res = await api.validatePromo(code, seatFare);
    if (res.valid) dispatch({ type: 'SET_PROMO', promo: res });
    return res;
  }, [draft.seats, dispatch]);

  const removePromo = useCallback(() => dispatch({ type: 'CLEAR_PROMO' }), [dispatch]);

  const confirmBooking = useCallback(async ({ passengers, contact, payment }) => {
    const fare = computeFare(draft.seats, draft.promo);
    const booking = await api.createBooking({
      bus: draft.bus,
      seats: draft.seats,
      boarding: draft.boarding,
      dropping: draft.dropping,
      passengers,
      contact,
      payment: { method: payment.method },
      promo: draft.promo,
      fare,
    });
    dispatch({ type: 'CONFIRMED', booking });
    dispatchHistory({ type: 'ADD', booking });
    return booking;
  }, [draft, dispatch, dispatchHistory]);

  const cancelBooking = useCallback((pnr) => dispatchHistory({ type: 'CANCEL', pnr }), [dispatchHistory]);

  const value = useMemo(() => ({
    ...draft,
    fare: computeFare(draft.seats, draft.promo),
    hasActiveHold: Boolean(draft.lock && draft.lock.expiresAt > Date.now()),
    bookings: history.items,
    holdSeats, releaseHold, applyPromo, removePromo, confirmBooking, cancelBooking,
  }), [draft, history.items, holdSeats, releaseHold, applyPromo, removePromo, confirmBooking, cancelBooking]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
