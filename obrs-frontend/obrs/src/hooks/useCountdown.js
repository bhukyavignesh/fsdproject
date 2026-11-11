import { useEffect, useRef, useState } from 'react';

/** Ticks once per second until `expiresAt` (epoch ms). Fires `onExpire` exactly once. */
export function useCountdown(expiresAt, onExpire) {
  const [remaining, setRemaining] = useState(() => (expiresAt ? expiresAt - Date.now() : 0));
  const firedRef = useRef(false);
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    if (!expiresAt) return undefined;
    const tick = () => {
      const left = expiresAt - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        cbRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}
