import { useEffect, useReducer } from 'react';

/** useReducer that hydrates from and syncs to Web Storage. */
export function usePersistentReducer(reducer, initialState, key, storage = window.localStorage) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = storage.getItem(key);
      return raw ? { ...init, ...JSON.parse(raw) } : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    try { storage.setItem(key, JSON.stringify(state)); } catch { /* quota / private mode */ }
  }, [key, state, storage]);

  return [state, dispatch];
}
