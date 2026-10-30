import { useSyncExternalStore } from 'react';

/**
 * DEV-only switch for the Cornell benchmark room (see components/CornellBenchmark.tsx).
 * Toggled from Project settings; it is never persisted, so a reload always starts
 * with the normal factory scene.
 */
let enabled = false;
const listeners = new Set<() => void>();

export function setCornellRoom(next: boolean) {
  if (next === enabled) return;
  enabled = next;
  listeners.forEach((listener) => listener());
}

export function useCornellRoom(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
    () => false,
  );
}

if (import.meta.env.DEV) {
  (window as unknown as { __larpCornell: typeof setCornellRoom }).__larpCornell = setCornellRoom;
}
