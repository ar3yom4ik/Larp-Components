import type { SceneItem } from '../types';

/** Output types actually indexed by the TypeScript logic engine. */
export function canSignalOutput(item: SceneItem): boolean {
  return item.visible !== false && !item.locked && ['button', 'sensor', 'laser', 'plc'].includes(item.kind);
}
/** PLCs consume incoming signals; robot and conveyor IDs are trigger/script endpoints. */
export function canSignalInput(item: SceneItem, sourceId: string): boolean {
  return item.visible !== false && item.id !== sourceId && ['plc', 'robot', 'cobot', 'kuka', 'fanuc', 'conveyor', 'roller'].includes(item.kind);
}
