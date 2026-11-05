import type { Box } from '../sim/engine';

type InstanceBox = Pick<Box, 'x' | 'y' | 'z' | 'yaw' | 'tilt' | 'ax' | 'az' | 'hx' | 'hy' | 'hz' | 'color'>;
/** Caches visual inputs by instance slot, so unchanged products do not upload GPU buffers. */
export class InstanceSlotCache {
  private readonly matrices: Float64Array;
  private readonly colors: Float64Array;
  private readonly boosts: Float64Array;
  matrixMin = Infinity; matrixMax = -1; colorMin = Infinity; colorMax = -1;
  constructor(capacity: number) {
    this.matrices = new Float64Array(capacity * 15).fill(NaN);
    this.colors = new Float64Array(capacity).fill(NaN);
    this.boosts = new Float64Array(capacity).fill(NaN);
  }
  beginFrame() { this.matrixMin = this.colorMin = Infinity; this.matrixMax = this.colorMax = -1; }
  matrixChanged(index: number, box: InstanceBox, fade: number, belt: readonly [number, number, number] | undefined) {
    const a = this.matrices, i = index * 15;
    const bx = belt?.[0] ?? 0, by = belt?.[1] ?? 0, bz = belt?.[2] ?? 0, hasBelt = belt ? 1 : 0;
    if (a[i] === box.x && a[i+1] === box.y && a[i+2] === box.z && a[i+3] === box.yaw &&
        a[i+4] === box.hx && a[i+5] === box.hy && a[i+6] === box.hz && a[i+7] === box.tilt &&
        a[i+8] === box.ax && a[i+9] === box.az && a[i+10] === fade && a[i+11] === hasBelt &&
        a[i+12] === bx && a[i+13] === by && a[i+14] === bz) return false;
    a[i] = box.x; a[i+1] = box.y; a[i+2] = box.z; a[i+3] = box.yaw;
    a[i+4] = box.hx; a[i+5] = box.hy; a[i+6] = box.hz; a[i+7] = box.tilt;
    a[i+8] = box.ax; a[i+9] = box.az; a[i+10] = fade; a[i+11] = hasBelt;
    a[i+12] = bx; a[i+13] = by; a[i+14] = bz;
    this.matrixMin = Math.min(this.matrixMin, index); this.matrixMax = Math.max(this.matrixMax, index);
    return true;
  }
  colorChanged(index: number, color: number, boost: number) {
    if (this.colors[index] === color && this.boosts[index] === boost) return false;
    this.colors[index] = color; this.boosts[index] = boost;
    this.colorMin = Math.min(this.colorMin, index); this.colorMax = Math.max(this.colorMax, index);
    return true;
  }
}
