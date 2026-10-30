import { useSyncExternalStore } from 'react';

/**
 * Every keyboard shortcut in the app. App.tsx dispatches on these ids, the Keybinds settings
 * page lists them, and the bindings are stored in localStorage and included in settings export.
 * Binding strings look like "Ctrl+Shift+Z", "Space", "Delete", "Escape" or "V".
 */
export interface KeyAction {
  id: string;
  label: string;
  group: 'Edit' | 'Tools' | 'Simulation' | 'View' | 'Help';
  key: string;
}

export const KEY_ACTIONS: KeyAction[] = [
  { id: 'undo', label: 'Undo', group: 'Edit', key: 'Ctrl+Z' },
  { id: 'redo', label: 'Redo', group: 'Edit', key: 'Ctrl+Shift+Z' },
  { id: 'copy', label: 'Copy', group: 'Edit', key: 'Ctrl+C' },
  { id: 'paste', label: 'Paste', group: 'Edit', key: 'Ctrl+V' },
  { id: 'duplicate', label: 'Duplicate', group: 'Edit', key: 'Ctrl+D' },
  { id: 'delete', label: 'Delete selected', group: 'Edit', key: 'Delete' },
  { id: 'save', label: 'Save project', group: 'Edit', key: 'Ctrl+S' },
  { id: 'deselect', label: 'Deselect / close panel', group: 'Edit', key: 'Escape' },
  { id: 'toolSelect', label: 'Select tool', group: 'Tools', key: 'V' },
  { id: 'toolMove', label: 'Move tool', group: 'Tools', key: 'M' },
  { id: 'toolRotate', label: 'Rotate tool', group: 'Tools', key: 'R' },
  { id: 'snap', label: 'Toggle grid snap', group: 'Tools', key: 'G' },
  { id: 'search', label: 'Search components', group: 'Tools', key: 'Ctrl+K' },
  { id: 'playPause', label: 'Play / pause simulation', group: 'Simulation', key: 'Space' },
  { id: 'settings', label: 'Open settings', group: 'View', key: 'Ctrl+,' },
  { id: 'help', label: 'Open help and shortcuts', group: 'Help', key: 'F1' },
];

const STORAGE_KEY = 'larp-keybinds';
let overrides: Record<string, string> = {};
let capturing = false;
let version = 0;
const listeners = new Set<() => void>();

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    const ids = new Set(KEY_ACTIONS.map((action) => action.id));
    for (const [id, key] of Object.entries(saved)) if (ids.has(id) && typeof key === 'string' && key) overrides[id] = key;
  }
} catch { /* keybinds are optional */ }

const emit = () => {
  version += 1;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn());
};

export function bindingFor(id: string): string {
  return overrides[id] ?? KEY_ACTIONS.find((action) => action.id === id)?.key ?? '';
}

export function allBindings(): Record<string, string> {
  return Object.fromEntries(KEY_ACTIONS.map((action) => [action.id, bindingFor(action.id)]));
}

/** Assigns a key. If another action already uses it, that action is cleared so the key stays unique. */
export function setBinding(id: string, key: string) {
  const next = { ...overrides };
  for (const action of KEY_ACTIONS) if (action.id !== id && bindingFor(action.id) === key) next[action.id] = '';
  next[id] = key;
  overrides = next;
  emit();
}

export function resetBinding(id: string) {
  const { [id]: _removed, ...rest } = overrides;
  overrides = rest;
  emit();
}

export function resetAllBindings() {
  overrides = {};
  emit();
}

/** Replaces all bindings with an imported set. Unknown ids and invalid values are ignored. */
export function importBindings(input: unknown): number {
  if (!input || typeof input !== 'object') return 0;
  const ids = new Set(KEY_ACTIONS.map((action) => action.id));
  const next: Record<string, string> = {};
  for (const [id, key] of Object.entries(input as Record<string, unknown>)) {
    if (ids.has(id) && typeof key === 'string' && isValidBinding(key)) next[id] = key;
  }
  overrides = next;
  emit();
  return Object.keys(next).length;
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS']);
const NAMED: Record<string, string> = { ' ': 'Space', Escape: 'Escape', Delete: 'Delete', Backspace: 'Backspace', Enter: 'Enter', Tab: 'Tab', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };

/** Converts a keyboard event to a binding string, or null for modifier-only presses. */
export function bindingFromEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const name = NAMED[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey && (name.length > 1 || /[A-Z]/.test(name))) parts.push('Shift');
  parts.push(name);
  return parts.join('+');
}

export function eventMatches(event: KeyboardEvent, id: string): boolean {
  const binding = bindingFor(id);
  return !!binding && bindingFromEvent(event) === binding;
}

export function isValidBinding(key: string): boolean {
  if (typeof key !== 'string' || !key || key.length > 40) return false;
  const parts = key.split('+');
  const name = parts[parts.length - 1];
  return name.length > 0 && parts.slice(0, -1).every((part) => ['Ctrl', 'Shift', 'Alt'].includes(part));
}

/** While the settings page is waiting for a new key, global shortcuts must not fire. */
export function setCapturing(value: boolean) { capturing = value; }
export function isCapturing() { return capturing; }

export function useKeybindVersion(): number {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => version,
    () => 0,
  );
}
