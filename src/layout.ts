import { useSyncExternalStore } from 'react';

/**
 * Dockable workspace layout.
 *
 * Every main panel (catalogue, properties, output dock) can be:
 * - resized by dragging its inner edge while docked,
 * - detached into a floating window, moved by its title bar and resized from its corner,
 * - closed and re-opened from the ribbon or the settings window,
 * - reset to the default arrangement with one button.
 */
export type PanelId = 'catalog' | 'inspector' | 'dock';

export interface PanelState {
  open: boolean;
  floating: boolean;
  /** Docked size: width for side panels, height for the bottom dock. */
  size: number;
  /** Floating window geometry, in CSS pixels from the viewport's top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayoutState = Record<PanelId, PanelState>;

export const PANEL_MIN: Record<PanelId, number> = { catalog: 190, inspector: 230, dock: 130 };
export const PANEL_MAX: Record<PanelId, number> = { catalog: 520, inspector: 560, dock: 620 };

const DEFAULTS: LayoutState = {
  catalog: { open: true, floating: false, size: 280, x: 60, y: 150, width: 300, height: 520 },
  inspector: { open: true, floating: false, size: 300, x: 240, y: 170, width: 340, height: 560 },
  dock: { open: true, floating: false, size: 175, x: 120, y: 320, width: 720, height: 300 },
};

const STORAGE_KEY = 'larp-layout-v1';

const clone = (value: LayoutState): LayoutState => ({
  catalog: { ...value.catalog },
  inspector: { ...value.inspector },
  dock: { ...value.dock },
});

function sanitize(input: unknown): LayoutState {
  const base = clone(DEFAULTS);
  if (!input || typeof input !== 'object') return base;
  for (const id of Object.keys(base) as PanelId[]) {
    const saved = (input as Record<string, unknown>)[id];
    if (!saved || typeof saved !== 'object') continue;
    const entry = saved as Partial<PanelState>;
    const num = (value: unknown, fallback: number, min: number, max: number) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    base[id] = {
      open: typeof entry.open === 'boolean' ? entry.open : base[id].open,
      floating: typeof entry.floating === 'boolean' ? entry.floating : base[id].floating,
      size: num(entry.size, base[id].size, PANEL_MIN[id], PANEL_MAX[id]),
      x: num(entry.x, base[id].x, 0, 4000),
      y: num(entry.y, base[id].y, 0, 4000),
      width: num(entry.width, base[id].width, PANEL_MIN[id], 1400),
      height: num(entry.height, base[id].height, 120, 1400),
    };
  }
  return base;
}

let state: LayoutState = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? sanitize(JSON.parse(saved)) : clone(DEFAULTS);
  } catch {
    return clone(DEFAULTS);
  }
})();

const listeners = new Set<() => void>();
function emit() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private browsing */ }
  listeners.forEach((listener) => listener());
}

export function getLayout() { return state; }
export function useLayout() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getLayout, getLayout);
}

export function setPanel(id: PanelId, patch: Partial<PanelState>) {
  const next = { ...state[id], ...patch };
  // Every command goes through the same clamps, so a stored or dragged value can
  // never collapse a panel or push a floating window off screen.
  if (patch.size !== undefined) next.size = clampPanelSize(id, patch.size);
  if (patch.width !== undefined) next.width = Math.max(PANEL_MIN[id], Math.min(1600, patch.width));
  if (patch.height !== undefined) next.height = Math.max(110, Math.min(1600, patch.height));
  if (patch.x !== undefined) next.x = Math.max(0, Math.round(patch.x));
  if (patch.y !== undefined) next.y = Math.max(0, Math.round(patch.y));
  state = { ...state, [id]: next };
  emit();
}

/** Clamp a docked size to the panel's allowed range. */
export function clampPanelSize(id: PanelId, size: number) {
  return Math.round(Math.min(PANEL_MAX[id], Math.max(PANEL_MIN[id], size)));
}

export function togglePanel(id: PanelId) {
  setPanel(id, { open: !state[id].open });
}

export function dockPanel(id: PanelId) {
  setPanel(id, { floating: false, open: true });
}

export function floatPanel(id: PanelId) {
  const panel = state[id];
  const width = id === 'dock' ? Math.max(560, panel.width) : panel.size;
  // Centred when a window is available (the store is also used by unit tests).
  const viewport = typeof window === 'undefined' ? { innerWidth: 1280, innerHeight: 800 } : window;
  setPanel(id, {
    floating: true,
    open: true,
    x: Math.max(24, Math.round(viewport.innerWidth / 2 - width / 2)),
    y: Math.max(80, Math.round(viewport.innerHeight / 3)),
    width,
    height: id === 'dock' ? Math.max(220, panel.height) : Math.max(320, panel.height),
  });
}

export function resetLayout() {
  state = clone(DEFAULTS);
  emit();
}

/** True when anything differs from the default arrangement (the reset button can be disabled). */
export function isCustomLayout(value: LayoutState = state) {
  return (Object.keys(DEFAULTS) as PanelId[]).some((id) => {
    const a = value[id], b = DEFAULTS[id];
    return a.open !== b.open || a.floating !== b.floating || a.size !== b.size;
  });
}

// Development hook used by the browser test harnesses.
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && typeof window !== 'undefined') {
  (window as unknown as { __larpLayout: unknown }).__larpLayout = { getLayout, setPanel, resetLayout, floatPanel, dockPanel, togglePanel };
}
