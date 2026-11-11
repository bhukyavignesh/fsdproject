import { useEffect, useRef } from 'react';
import { SEAT_STATUS } from '../data/constants';

/**
 * Simulates a seat-status push channel. In production replace the interval with
 * a WebSocket / SSE subscription, e.g. `socket.on('seat:update', onUpdate)`.
 */
export function useLiveSeatUpdates({ enabled, layout, selectedIds, onUpdate, intervalMs = 9000 }) {
  const stateRef = useRef({ layout, selectedIds });
  stateRef.current = { layout, selectedIds };

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      const { layout: l, selectedIds: sel } = stateRef.current;
      if (!l) return;
      const candidates = l.decks
        .flatMap((d) => d.grid.flat())
        .filter((s) => s && s.status === SEAT_STATUS.AVAILABLE && !sel.includes(s.id));
      if (candidates.length < 4 || Math.random() > 0.6) return;
      const seat = candidates[Math.floor(Math.random() * candidates.length)];
      onUpdate({ seatId: seat.id, status: SEAT_STATUS.BOOKED });
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, onUpdate]);
}
