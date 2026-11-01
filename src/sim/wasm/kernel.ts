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

/** Experimental feeder-only bridge; all other subsystems still run in TypeScript.
 * Scratch buffers are reused across frames, and views are reacquired after allocation. */
export function createRustFeederStepper() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.step_feeders !== 'function') throw new Error('Rust feeder kernel unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const run = exports.step_feeders as (feeders: number, count: number, boxes: number, boxCount: number, dt: number, maxBoxes: number) => void;
  let fp = 0, fc = 0, bp = 0, bc = 0, disposed = false;
  return {
    step(feeders: Iterable<import('../engine').FeederRT>, boxes: readonly import('../engine').Box[], dt: number, spawn: (feeder: import('../engine').FeederRT) => void, maxBoxes: number) {
      if (disposed) throw new Error('Rust feeder stepper has been disposed');
      const list = Array.from(feeders), nf = list.length * 8, nb = boxes.length * 4;
      if (nf > fc || !fp) { if (fp) free(fp,fc); fc = Math.max(8,nf); fp = alloc(fc); }
      if (nb > bc || !bp) { if (bp) free(bp,bc); bc = Math.max(4,nb); bp = alloc(bc); }
      const fs = new Float64Array(memory.buffer,fp,nf), bs = new Float64Array(memory.buffer,bp,nb);
      for (let i=0;i<list.length;i++) {
        const f=list[i]; fs.set([f.x,f.z,f.interval,f.timer,f.active?1:0,f.supply,f.requireSupply?1:0,0],i*8);
      }
      for (let i=0;i<boxes.length;i++) {
        const b=boxes[i]; bs.set([b.x,b.y,b.z,b.state === 'dead'?0:1],i*4);
      }
      run(fp,list.length,bp,boxes.length,dt,maxBoxes);
      for (let i=0;i<list.length;i++) {
        const f=list[i]; f.timer=fs[i*8+3]; f.supply=fs[i*8+5];
        if (fs[i*8+7] !== 0) spawn(f);
      }
    },
    dispose() { if (!disposed) { disposed=true; if(fp) free(fp,fc); if(bp) free(bp,bc); } },
  };
}

/** Experimental machine cycle clock. The host still handles machine selection and products. */
export function createRustMachineClock() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.advance_machine_clock !== 'function') throw new Error('Rust machine clock unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const run = exports.advance_machine_clock as (state: number, dt: number) => void;
  const ptr = alloc(4);
  let disposed = false;
  return {
    advance(machine: import('../engine').MachineRT, dt: number) {
      if (disposed) throw new Error('Rust machine clock has been disposed');
      const state = new Float64Array(memory.buffer, ptr, 4);
      state.set([machine.busyTime, machine.remaining, machine.progress, machine.cycle]);
      run(ptr, dt);
      machine.busyTime = state[0]; machine.remaining = state[1]; machine.progress = state[2];
    },
    dispose() { if (!disposed) { disposed = true; free(ptr, 4); } },
  };
}
