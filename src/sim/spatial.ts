/**
 * Small uniform spatial hash used by the simulation to avoid O(n²) scans.
 *
 * It stores references, never copies. Query results are written into a
 * caller-owned array, which keeps the physics loop allocation-free.
 *
 * Every value must be an object (identity is used to de-duplicate hits inside one query).
 * A module-wide stamp de-duplicates hits without allocating a set per query.
 */
/** Values may carry a scratch stamp; it is private to this module's bookkeeping. */
interface Stamped { __spatialStamp?: number }
// A single sequence prevents two indexes containing the same object from
// accidentally treating one another's stamps as their own.
let queryGeneration = 0;

export class SpatialHash<T extends object> {
  private buckets = new Map<number, T[]>();
  private minX = Infinity;
  private minZ = Infinity;
  private maxX = -Infinity;
  private maxZ = -Infinity;

  constructor(private cellSize = 2) {}

  clear() {
    this.buckets.clear();
    this.minX = this.minZ = Infinity;
    this.maxX = this.maxZ = -Infinity;
  }

  insert(value: T, minX: number, minZ: number, maxX: number, maxZ: number) {
    if (minX < this.minX) this.minX = minX;
    if (minZ < this.minZ) this.minZ = minZ;
    if (maxX > this.maxX) this.maxX = maxX;
    if (maxZ > this.maxZ) this.maxZ = maxZ;
    const x0 = Math.floor(minX / this.cellSize), x1 = Math.floor(maxX / this.cellSize);
    const z0 = Math.floor(minZ / this.cellSize), z1 = Math.floor(maxZ / this.cellSize);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cz = z0; cz <= z1; cz += 1) {
        // Bucket ids stay small and unique for the coordinate ranges a factory can occupy.
        const key = (cx + 4096) * 8192 + (cz + 4096);
        let list = this.buckets.get(key);
        if (!list) { list = []; this.buckets.set(key, list); }
        list.push(value);
      }
    }
  }

  /** True when the hash holds nothing at all. */
  get empty() {
    return this.buckets.size === 0;
  }

  /**
   * Values whose bucket overlaps the square around (x, z). Each value appears once.
   * The result array is reused; do not keep it across calls.
   */
  query(x: number, z: number, out: T[], radius = 0): T[] {
    out.length = 0;
    if (!this.buckets.size) return out;
    // Outside the indexed area nothing can match, which keeps big empty scenes cheap.
    if (x < this.minX - radius || x > this.maxX + radius || z < this.minZ - radius || z > this.maxZ + radius) return out;
    const g = ++queryGeneration;
    const x0 = Math.floor((x - radius) / this.cellSize), x1 = Math.floor((x + radius) / this.cellSize);
    const z0 = Math.floor((z - radius) / this.cellSize), z1 = Math.floor((z + radius) / this.cellSize);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cz = z0; cz <= z1; cz += 1) {
        const list = this.buckets.get((cx + 4096) * 8192 + (cz + 4096));
        if (!list) continue;
        for (let i = 0; i < list.length; i += 1) {
          const value = list[i] as T & Stamped;
          // A numeric stamp on the value is far cheaper than a WeakMap lookup here:
          // this query runs thousands of times per simulated second.
          if (value.__spatialStamp === g) continue;
          value.__spatialStamp = g;
          out.push(value);
        }
      }
    }
    return out;
  }
}
