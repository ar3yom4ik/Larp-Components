import { useSyncExternalStore } from 'react';

export type SettingsSection = 'video' | 'quality' | 'lighting' | 'interface' | 'keybinds' | 'help' | 'data' | 'project';

/** Pixels the user has dragged the settings window away from its centred position. */
export interface SettingsOffset { x: number; y: number }
export interface SettingsSize { width: number; height: number }

interface SettingsWindowState {
  open: boolean;
  section: SettingsSection;
  /** null means "centred"; any other value is remembered between sessions. */
  offset: SettingsOffset | null;
  /** null uses the responsive default size. */
  size: SettingsSize | null;
  /** When off, the page behind the window is not dimmed, so the scene stays visible. */
  dim: boolean;
}

const STORAGE_KEY = 'larp-settings-window-v1';

function load(): { offset: SettingsOffset | null; size: SettingsSize | null; dim: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { offset: null, size: null, dim: true };
    const parsed = JSON.parse(raw) as { offset?: SettingsOffset | null; size?: SettingsSize | null; dim?: boolean };
    const offset = parsed.offset && Number.isFinite(parsed.offset.x) && Number.isFinite(parsed.offset.y)
      ? { x: Math.max(-2400, Math.min(2400, parsed.offset.x)), y: Math.max(-1600, Math.min(1600, parsed.offset.y)) }
      : null;
    const size = parsed.size && Number.isFinite(parsed.size.width) && Number.isFinite(parsed.size.height)
      ? { width: Math.max(240, Math.min(4000, parsed.size.width)), height: Math.max(160, Math.min(2400, parsed.size.height)) }
      : null;
    return { offset, size, dim: parsed.dim !== false };
  } catch {
    return { offset: null, size: null, dim: true };
  }
}

const saved = load();
let state: SettingsWindowState = { open: false, section: 'video', offset: saved.offset, size: saved.size, dim: saved.dim };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ offset: state.offset, size: state.size, dim: state.dim }));
  } catch {
    // Private mode or a full quota: the window still works for this session.
  }
}

export function openSettings(section?: SettingsSection) {
  state = { ...state, open: true, section: section ?? state.section };
  emit();
}
export function closeSettings() {
  if (!state.open) return;
  state = { ...state, open: false };
  emit();
}
export function setSettingsSection(section: SettingsSection) {
  if (state.section === section) return;
  state = { ...state, section };
  emit();
}
export function setSettingsOffset(offset: SettingsOffset | null) {
  state = { ...state, offset };
  persist();
  emit();
}
export function setSettingsSize(size: SettingsSize | null) {
  state = { ...state, size };
  persist();
  emit();
}
export function setSettingsDim(dim: boolean) {
  if (state.dim === dim) return;
  state = { ...state, dim };
  persist();
  emit();
}
export function useSettingsWindow() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state, () => state);
}
