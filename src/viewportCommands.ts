import type { CameraPreset } from './types';

/**
 * Small command bus for viewport actions that are triggered from outside the 3D view —
 * keyboard shortcuts, the ribbon and the help overlay.
 *
 * The camera lives inside `<Canvas>`, while shortcuts are handled in `App.tsx`. Emitting
 * a command keeps the two decoupled: the viewport subscribes once, every other caller
 * only needs to say what should happen.
 */
export type ViewportCommand =
  | { type: 'fit' }
  | { type: 'fit-selected' }
  | { type: 'view'; preset: CameraPreset }
  | { type: 'center-selected' }
  | { type: 'zoom'; direction: 1 | -1 }
  | { type: 'toggle-grid' }
  | { type: 'toggle-fullscreen' };

type Handler = (command: ViewportCommand) => void;

const handlers = new Set<Handler>();

/** Subscribe; returns the unsubscribe function. */
export function onViewportCommand(handler: Handler) {
  handlers.add(handler);
  return () => { handlers.delete(handler); };
}

export function sendViewportCommand(command: ViewportCommand) {
  handlers.forEach((handler) => handler(command));
}
