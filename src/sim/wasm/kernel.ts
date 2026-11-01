import { KERNEL_BASE64 } from './kernelBytes';
import type { Barrier, WalkObstacle } from '../navigation';

/** Small synchronous Wasm kernel, embedded so the standalone HTML stays offline.
 * Keep the JS implementation as a compatibility fallback for browsers that cannot
 * instantiate WebAssembly (for example due to a restrictive CSP). */
type DistanceKernel = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => number;

export const distanceSqJs: DistanceKernel = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let u = ((x - ax) * dx + (z - az) * dz) / len2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const ex = x - (ax + u * dx), ez = z - (az + u * dz);
  return ex * ex + ez * ez;
};

function loadKernel(): WebAssembly.Exports | null {
  try {
    if (typeof WebAssembly === 'undefined' || typeof atob !== 'function') return null;
    const binary = atob(KERNEL_BASE64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
    return instance.exports;
  } catch {
    return null;
  }
}

const exports = loadKernel();
const wasmDistance = typeof exports?.distance_sq_to_segment === 'function' ? exports.distance_sq_to_segment as DistanceKernel : null;
export const rustKernelAvailable = wasmDistance !== null;
export const distanceSqKernel: DistanceKernel = wasmDistance ?? distanceSqJs;

/** A reusable scene owns Rust-side buffers; dispose it after use. No production
 * behavior is switched until full-engine parity and browser performance are proven. */
export function createRustNavigationScene(barriers: Barrier[], obstacles: WalkObstacle[]) {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.point_is_free !== 'function') throw new Error('Rust navigation kernel unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const query = exports.point_is_free as (x: number, z: number, tolerance: number, barriers: number, barrierCount: number, obstacles: number, obstacleCount: number) => number;
  const n = barriers.length * 5, m = obstacles.length * 3;
  const bp = alloc(n);
  let op = 0;
  try {
    op = alloc(m);
    // Allocation can grow memory; create each view only after both allocations.
    const b = new Float64Array(memory.buffer, bp, n);
    for (let i=0;i<barriers.length;i++) {
      const v=barriers[i]; b.set([v.a[0],v.a[1],v.b[0],v.b[1],v.clearance ?? 0.34],i*5);
    }
    const o = new Float64Array(memory.buffer, op, m);
    for (let i=0;i<obstacles.length;i++) { const v=obstacles[i]; o.set([v.x,v.z,v.radius],i*3); }
  } catch (error) { if (op) free(op,m); free(bp,n); throw error; }
  let disposed = false;
  return {
    pointIsFree(x: number, z: number, tolerance = 0) {
      if (disposed) throw new Error('Rust navigation scene has been disposed');
      return query(x,z,tolerance,bp,barriers.length,op,obstacles.length) !== 0;
    },
    dispose() { if (!disposed) { disposed = true; free(bp,n); free(op,m); } },
  };
}
