import { useSyncExternalStore } from 'react';
import type { GiMode } from './theme';

/**
 * Live description of what the renderer is actually doing.
 *
 * The graphics settings panel shows it so the state is visible instead of guessed:
 * which renderer started, which GI path is running (VXGI, screen-space approximation or
 * none), the real shadow map size and the resulting texel density, and the measured
 * frame time. Values are published from the render loop at a low rate.
 */
export interface GraphicsStatus {
  renderer: 'starting' | 'webgl' | 'webgpu' | 'failed';
  rendererDetail: string;
  /** GI path that is actually running, which can differ from the setting when WebGPU is missing. */
  gi: GiMode | 'starting' | 'failed';
  giDetail: string;
  shadowSize: number;
  shadowExtent: number;
  /** Centimetres covered by one shadow-map texel. */
  shadowTexelCm: number;
  frameMs: number;
  pixelRatio: number;
}

const initial: GraphicsStatus = {
  renderer: 'starting',
  rendererDetail: '',
  gi: 'starting',
  giDetail: '',
  shadowSize: 0,
  shadowExtent: 0,
  shadowTexelCm: 0,
  frameMs: 0,
  pixelRatio: 1,
};

let state: GraphicsStatus = initial;
const listeners = new Set<() => void>();

const same = (a: GraphicsStatus, b: Partial<GraphicsStatus>) =>
  (Object.keys(b) as (keyof GraphicsStatus)[]).every((key) => a[key] === b[key]);

/** Merges a patch, ignoring values that did not change, and notifies subscribers once. */
export function setGraphicsStatus(patch: Partial<GraphicsStatus>) {
  if (same(state, patch)) return;
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export const getGraphicsStatus = () => state;

export function resetGraphicsStatus() {
  state = initial;
  listeners.forEach((fn) => fn());
}

export function useGraphicsStatus(): GraphicsStatus {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getGraphicsStatus,
    getGraphicsStatus,
  );
}

/** Human sentence for the active GI path, used by the settings diagnostics. */
export function describeGi(status: GraphicsStatus, quality: GiMode): string {
  if (status.gi === 'failed') return 'Global illumination could not start on this device.';
  if (status.gi === 'starting') return 'Starting…';
  if (quality === 'vxgi' && status.gi !== 'vxgi') return 'Fallen back: WebGPU VXGI is unavailable, using the screen-space approximation.';
  switch (status.gi) {
    case 'vxgi': return 'Voxel cone-traced global illumination (WebGPU).';
    case 'approx': return 'Bounce lights with screen-space occlusion (approximation).';
    case 'ao': return 'Screen-space ambient occlusion only.';
    default: return 'Direct lighting only.';
  }
}
