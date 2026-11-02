import type { SceneItem, Vec3 } from '../types';
import { isRobotKind } from './kinds';
import { itemLocalToWorld } from './transform';

export const DEFAULT_WIRE_COLOR = '#4da9d8';

/** Sensors, buttons and PLCs are evaluated by the logic stepper. */
export function isLogicSource(item: SceneItem): boolean {
  return ['button', 'sensor', 'laser', 'plc'].includes(item.kind);
}

/** Robots publish a host-managed moving/holding signal as well. */
export function isSignalSource(item: SceneItem): boolean {
  return isLogicSource(item) || isRobotKind(item.kind);
}

/** Output ports can only be edited on visible, unlocked sources. */
export function canSignalOutput(item: SceneItem): boolean {
  return item.visible !== false && !item.locked && isSignalSource(item);
}

/** PLCs and feeders consume signals; robots and conveyors expose trigger/script endpoints. */
export function canSignalInput(item: SceneItem, sourceId: string): boolean {
  return item.visible !== false && item.id !== sourceId && ['plc', 'robot', 'cobot', 'kuka', 'fanuc', 'conveyor', 'roller', 'feeder'].includes(item.kind);
}

/** The first destination uses the legacy field; subsequent branches live on
 * the item. Filtering here also tolerates old or partially edited projects. */
export function signalTargets(item: SceneItem): string[] {
  const first = typeof item.props.connectedTo === 'string' ? item.props.connectedTo : '';
  const extra = Array.isArray(item.signalTargets) ? item.signalTargets : [];
  return [...new Set([first, ...extra].filter((id): id is string => typeof id === 'string' && !!id && id !== item.id))];
}

export function signalTargetsPatch(item: SceneItem, targets: string[]): Partial<SceneItem> {
  const clean = [...new Set(targets.filter((id) => id && id !== item.id))];
  return { props: { ...item.props, connectedTo: clean[0] ?? '' }, signalTargets: clean.length > 1 ? clean.slice(1) : undefined };
}

/** Old projects have no wire colour, and imported projects may contain invalid values. */
export function signalWireColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_WIRE_COLOR;
}

/** Attachment points are in model-local coordinates; account for each instance's
 * position, rotation and scale so wires stay attached when components are edited. */
export function signalAnchor(item: SceneItem, end: 'source' | 'target'): Vec3 {
  let local: Vec3;
  if (item.kind === 'button') local = [0.16, 0.85, 0];
  else if (item.kind === 'sensor') local = [0, 1.08, 0.1];
  else if (item.kind === 'laser') { const range = Number(item.props.range); local = [Math.max(0.5, Number.isFinite(range) && range > 0 ? range : 3) / 2, 0.95, 0]; }
  else if (item.kind === 'plc') local = [0.45, 0.9, 0];
  else if (item.kind === 'feeder') local = [0.43, 2.1, 0];
  else if (item.kind === 'conveyor' || item.kind === 'roller') local = [0, 0.8, 0.31];
  else if (['robot', 'cobot', 'kuka', 'fanuc'].includes(item.kind)) local = [0.4, 0.55, 0];
  else local = [0, end === 'source' ? 0.7 : 0.8, 0];
  return itemLocalToWorld(item, local, item.kind !== 'conveyor' && item.kind !== 'roller');
}
