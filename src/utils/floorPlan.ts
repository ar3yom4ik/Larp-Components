import type { ComponentKind, SceneItem } from '../types';
import { samplePath } from '../sim/spline';
import { isRobotKind } from '../utils/kinds';

/**
 * One shared plan-view description of a factory, used by the AI Factory preview,
 * the corner floor map and the full floor-map window, so all three look the same.
 */
export interface PlanPath { id: string; points: [number, number][]; color: string; width: number; dashed?: boolean }
export interface PlanShape {
  id: string; kind: 'rect' | 'circle'; x: number; z: number; w: number; h: number;
  rotation: number; fill: string; stroke?: string; label?: string; opacity?: number;
}
export interface PlanGeometry {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  paths: PlanPath[];
  shapes: PlanShape[];
}

/** Footprint in metres: [along X, along Z] before rotation. */
const FOOTPRINT: Partial<Record<ComponentKind, [number, number]>> = {
  cnc: [2.4, 1.9], press: [2.2, 1.8], weld: [1.9, 1.9], packaging: [2.6, 1.9], paint: [2.0, 2.0],
  assembly: [2.0, 1.6], cutter: [2.2, 1.5], kiln: [2.6, 2.2], inspection: [1.7, 1.5],
  feeder: [1.2, 1.2], crates: [1.2, 0.8], collector: [1.4, 1.2], cabinet: [1.0, 0.6], rack: [2.6, 1.2],
  amr: [1.0, 0.7], forklift: [1.6, 0.9], wall: [0.6, 0.2], button: [0.4, 0.4],
  sensor: [0.3, 0.3], laser: [0.3, 0.3], plc: [0.7, 0.5], light: [0.3, 0.3],
};

const ROBOT_COLOR = '#6DBE45';
const CONVEYOR_COLOR = '#4DA3E8';
const CRATE_COLOR = '#b88a55';
const FEEDER_COLOR = '#E0A030';
const MACHINE_COLOR = '#e8e8e8';
const WORKER_COLOR = '#35c4d4';
const FENCE_COLOR = '#F2B705';

const MACHINE_KINDS: ComponentKind[] = ['cnc', 'press', 'weld', 'packaging', 'paint', 'assembly', 'cutter', 'kiln', 'inspection'];

/** World-space polyline of a spline item (position + rotation applied). */
export function worldPath(item: SceneItem, step = 0.4): [number, number][] {
  const points = item.points && item.points.length >= 2 ? item.points : ([[-1, 0], [1, 0]] as [number, number][]);
  const rotation = (item.rotation * Math.PI) / 180;
  const path = samplePath(points, step);
  return path.x.map((lx, index) => [
    item.position[0] + lx * Math.cos(rotation) + path.z[index] * Math.sin(rotation),
    item.position[2] - lx * Math.sin(rotation) + path.z[index] * Math.cos(rotation),
  ] as [number, number]);
}

export function buildFloorPlan(items: SceneItem[], options: { padding?: number; color?: (item: SceneItem) => string | undefined } = {}): PlanGeometry {
  const padding = options.padding ?? 3;
  const paths: PlanPath[] = [];
  const shapes: PlanShape[] = [];
  const xs: number[] = [];
  const zs: number[] = [];

  const add = (x: number, z: number) => { xs.push(x); zs.push(z); };

  for (const item of items) {
    if (item.visible === false || item.kind === 'light') continue;
    const accent = options.color?.(item) || item.color;

    if ((item.kind === 'conveyor' || item.kind === 'roller') && item.points) {
      const points = worldPath(item);
      points.forEach(([x, z]) => add(x, z));
      paths.push({ id: item.id, points, color: CONVEYOR_COLOR, width: 0.62 });
      continue;
    }
    if (item.kind === 'fence') {
      const points = worldPath(item, 1.5);
      points.forEach(([x, z]) => add(x, z));
      paths.push({ id: item.id, points, color: FENCE_COLOR, width: 0.12, dashed: true });
      continue;
    }

    const [w, h] = FOOTPRINT[item.kind] ?? [1.1, 1.1];
    const scale = Math.max(0.2, Math.min(3, item.scale || 1));
    add(item.position[0] - (w * scale) / 2, item.position[2] - (h * scale) / 2);
    add(item.position[0] + (w * scale) / 2, item.position[2] + (h * scale) / 2);

    if (isRobotKind(item.kind)) {
      shapes.push({ id: item.id, kind: 'circle', x: item.position[0], z: item.position[2], w: w * scale, h: h * scale, rotation: item.rotation, fill: accent || ROBOT_COLOR, stroke: '#d9f5c3' });
    } else if (item.kind === 'operator' || item.kind === 'mobile-robot') {
      shapes.push({ id: item.id, kind: 'circle', x: item.position[0], z: item.position[2], w: 0.55, h: 0.55, rotation: item.rotation, fill: accent || WORKER_COLOR, stroke: '#ffffff' });
    } else if (item.kind === 'feeder') {
      shapes.push({ id: item.id, kind: 'rect', x: item.position[0], z: item.position[2], w: w * scale, h: h * scale, rotation: item.rotation, fill: accent || FEEDER_COLOR });
    } else if (item.kind === 'crates') {
      shapes.push({ id: item.id, kind: 'rect', x: item.position[0], z: item.position[2], w: w * scale, h: h * scale, rotation: item.rotation, fill: accent || CRATE_COLOR });
    } else {
      const fill = accent || (MACHINE_KINDS.includes(item.kind) ? MACHINE_COLOR : '#c8ced4');
      shapes.push({ id: item.id, kind: 'rect', x: item.position[0], z: item.position[2], w: w * scale, h: h * scale, rotation: item.rotation, fill, label: item.kind });
    }
  }

  if (!xs.length) { xs.push(-6, 6); zs.push(-4, 4); }
  const bounds = {
    minX: Math.min(...xs) - padding, maxX: Math.max(...xs) + padding,
    minZ: Math.min(...zs) - padding, maxZ: Math.max(...zs) + padding,
  };
  return { bounds, paths, shapes };
}

/** Legend entries shared by the map views. */
export const PLAN_LEGEND: { color: string; label: string; round?: boolean }[] = [
  { color: CONVEYOR_COLOR, label: 'Conveyor' },
  { color: ROBOT_COLOR, label: 'Robot', round: true },
  { color: MACHINE_COLOR, label: 'Machine' },
  { color: FEEDER_COLOR, label: 'Feeder' },
  { color: CRATE_COLOR, label: 'Pallet' },
  { color: WORKER_COLOR, label: 'Worker', round: true },
  { color: FENCE_COLOR, label: 'Fence' },
];
