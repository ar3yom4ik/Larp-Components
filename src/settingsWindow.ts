import { useSyncExternalStore } from 'react';

export type SettingsSection = 'video' | 'quality' | 'lighting' | 'interface' | 'keybinds' | 'help' | 'data' | 'project';

let state: { open: boolean; section: SettingsSection } = { open: false, section: 'video' };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function openSettings(section?: SettingsSection) {
  state = { open: true, section: section ?? state.section };
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
export function useSettingsWindow() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state, () => state);
}
