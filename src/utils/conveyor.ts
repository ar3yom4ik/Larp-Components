import type { SceneItem } from '../types';

/** Shared width for rendering, support, collisions, navigation and plan view.
 * Older projects have no width; invalid values fall back to the original belt. */
export function conveyorWidth(item: Pick<SceneItem, 'props'>): number {
  const value = Number(item.props.width ?? 0.62);
  return Number.isFinite(value) ? Math.max(0.1, Math.min(100, value)) : 0.62;
}
