import { Engine, MAX_BOXES } from '../src/sim/engine';
import { DEFAULT_GEN, generateFactory } from '../src/sim/generator';
import { makeItem } from '../src/data/library';
import { SpatialHash } from '../src/sim/spatial';

const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };

/* ------------------------------------------------------------------ */
/*  Spatial hash                                                       */
/* ------------------------------------------------------------------ */

const hash = new SpatialHash<{ id: string }>(2);
const out: { id: string }[] = [];
const wide = { id: 'wide' };            // spans four cells
const near = { id: 'near' };
const far = { id: 'far' };
hash.insert(wide, -1.5, -1.5, 1.5, 1.5);
hash.insert(near, 3.9, 0.1, 4.1, 0.3);
hash.insert(far, 40, 40, 40.2, 40.2);
assert(!hash.empty, 'hash stayed empty after inserts');
const hits = hash.query(0, 0, out).map((h) => h.id).sort();
assert(hits.join(',') === 'wide', `overlapping object should be returned once, got ${hits}`);
assert(hash.query(4, 0, out).map((h) => h.id).join(',') === 'near', 'neighbouring cell missed');
assert(hash.query(1000, 1000, out).length === 0, 'query outside the indexed bounds returned hits');
assert(hash.query(0, 0, out, 4).length >= 2, 'radial query should widen the cell range');
// One object can be present in different indexes; generation counters must not
// collide across instances. Duplicate inserts must still appear just once.
const shared = { id: 'shared' };
const firstIndex = new SpatialHash<typeof shared>(2), secondIndex = new SpatialHash<typeof shared>(2);
firstIndex.insert(shared, 0, 0, 1, 1); secondIndex.insert(shared, 0, 0, 1, 1);
secondIndex.insert(shared, 0, 0, 1, 1);
assert(firstIndex.query(0, 0, []).length === 1, 'first index lost shared object');
assert(secondIndex.query(0, 0, []).length === 1, 'second index lost or duplicated shared object');
secondIndex.clear(); secondIndex.insert(shared, 6, 6, 7, 7);
assert(secondIndex.query(0, 0, []).length === 0 && secondIndex.query(6, 6, []).length === 1, 'cleared index retained stale objects');
hash.clear();
assert(hash.empty && hash.query(0, 0, out).length === 0, 'clear did not empty the hash');

/* ------------------------------------------------------------------ */
/*  Physics index equals the brute-force support scan                  */
/* ------------------------------------------------------------------ */

type RefSupport = { top: number; kind: 1 | 2 | 3 | 4 };
type Probe = {
  boxes: { x: number; y: number; z: number; hx: number; hy: number; hz: number; yaw: number; state: string }[];
  conveyors: Map<string, { top: number; query(px: number, pz: number): { inside: boolean } | null }>;
  rects: { cx: number; cz: number; hw: number; hd: number; yaw: number; top: number }[];
  findSupport(box: unknown): { top: number; kind: 1 | 2 | 3 | 4 };
};

function bruteForce(engine: Probe, box: { x: number; y: number; z: number; hx: number; hy: number; hz: number }): RefSupport {
  const ref: RefSupport = { top: 0, kind: 1 };
  const bottom = box.y - box.hy;
  for (const conv of engine.conveyors.values()) {
    if (bottom < conv.top - 0.14 || bottom > conv.top + 0.1) continue;
    const q = conv.query(box.x, box.z);
    if (q && q.inside && conv.top >= ref.top) { ref.top = conv.top; ref.kind = 2; }
  }
  for (const rect of engine.rects) {
    if (bottom < rect.top - 0.14 || bottom > rect.top + 0.1 || rect.top < ref.top) continue;
    const dx = box.x - rect.cx, dz = box.z - rect.cz;
    const c = Math.cos(rect.yaw), s = Math.sin(rect.yaw);
    if (Math.abs(dx * c - dz * s) <= rect.hw && Math.abs(dx * s + dz * c) <= rect.hd) { ref.top = rect.top; ref.kind = 3; }
  }
  for (const other of engine.boxes) {
    if (other === box || other.state !== 'free') continue;
    const top = other.y + other.hy;
    if (top < ref.top || bottom < top - 0.14 || bottom > top + 0.1) continue;
    const dx = box.x - other.x, dz = box.z - other.z;
    const c = Math.cos(other.yaw), s = Math.sin(other.yaw);
    if (Math.abs(dx * c - dz * s) < other.hx * 0.95 && Math.abs(dx * s + dz * c) < other.hz * 0.95) { ref.top = top; ref.kind = 4; }
  }
  return ref;
}

const factory = generateFactory({ ...DEFAULT_GEN, stages: 2, lanes: 2, staff: 6 });
const engine = new Engine();
engine.sync(factory);
engine.setRunning(true);
for (let i = 0; i < 60 * 25; i += 1) engine.step(1 / 60);
assert(engine.boxes.length > 0, 'the factory produced no products to check');
const probe = engine as unknown as Probe;
let mismatches = 0;
for (const box of engine.boxes) {
  if (box.state !== 'free') continue;
  const actual = probe.findSupport(box);
  const expected = bruteForce(probe, box);
  if (actual.kind !== expected.kind || Math.abs(actual.top - expected.top) > 1e-9) mismatches += 1;
}
assert(mismatches === 0, `${mismatches} products resolved to a different support than the brute-force scan`);
assert(engine.boxes.length <= MAX_BOXES, 'box cap exceeded');
// Long-run stability: the grid, timer and condition buffers must not lose work.
// (The generated line needs about a minute before its first pallet completes.)
for (let i = 0; i < 60 * 70; i += 1) engine.step(1 / 60);
assert(engine.stats.spawned > 0, 'no products were spawned in 95 simulated seconds');
assert(engine.stats.placed > 0, 'the plant never placed a product after the optimisation');
assert(engine.logs.filter((line) => line.level === 'error').length === 0, 'the simulation logged an error');
for (const box of engine.boxes) {
  assert(Number.isFinite(box.x) && Number.isFinite(box.y) && Number.isFinite(box.z), 'a product has a non-finite position');
}

/* ------------------------------------------------------------------ */
/*  Conveyor query: local cell search equals the full segment scan     */
/* ------------------------------------------------------------------ */

const longBelt = makeItem('conveyor', [0, 0, 0], 0, { points: [[-15, 0], [15, 0]], props: { speed: 0.5, active: true } });
const beltEngine = new Engine();
beltEngine.sync([longBelt]);
const belt = [...beltEngine.conveyors.values()][0];
const reference = (px: number, pz: number) => {
  let best = Infinity;
  for (let i = 0; i < belt.x.length - 1; i += 1) {
    const sx = belt.x[i + 1] - belt.x[i], sz = belt.z[i + 1] - belt.z[i];
    const len2 = sx * sx + sz * sz || 1e-9;
    let u = ((px - belt.x[i]) * sx + (pz - belt.z[i]) * sz) / len2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    best = Math.min(best, Math.hypot(px - (belt.x[i] + sx * u), pz - (belt.z[i] + sz * u)));
  }
  return best;
};
for (const [px, pz] of [[0, 0], [7.35, 0.2], [-14.5, -0.1], [0, 3]] as const) {
  const q = belt.query(px, pz);
  const distance = reference(px, pz);
  if (distance > belt.half) {
    assert(q === null || q.inside === false, `off-belt point (${px}, ${pz}) reported as supported`);
  } else {
    assert(q !== null && q.inside, `point (${px}, ${pz}) on the belt was not found`);
  }
}
const insidePoint = belt.query(2.4, 0);
assert(insidePoint !== null && Math.abs(insidePoint.s - 17.4) < 0.6, 'belt arc length at 2.4 m is wrong');

/* ------------------------------------------------------------------ */
/*  Step budget                                                        */
/* ------------------------------------------------------------------ */

const budgetEngine = new Engine();
budgetEngine.sync(generateFactory({ ...DEFAULT_GEN, stages: 2, lanes: 2, staff: 4 }));
budgetEngine.setRunning(true);
// One frame at speed 60 asks for sixty substeps; the budget decides how many run.
budgetEngine.setSpeed(60);
budgetEngine.stepBudgetMs = 1000;
for (let i = 0; i < 5; i += 1) budgetEngine.step(1 / 60); // warm up / JIT
budgetEngine.stepBudgetMs = 1;
const before = budgetEngine.time;
budgetEngine.step(1 / 60);
const tinyAdvance = budgetEngine.time - before;
assert(tinyAdvance >= 1 / 60 - 1e-9, 'a tiny budget skipped the frame entirely');
assert(tinyAdvance < 0.95, `a 1 ms budget still simulated ${tinyAdvance.toFixed(2)} s in one frame`);

const generous = new Engine();
generous.sync(generateFactory({ ...DEFAULT_GEN, stages: 2, lanes: 2, staff: 4 }));
generous.setRunning(true);
generous.setSpeed(60);
generous.stepBudgetMs = 1000;
const wideStart = generous.time;
generous.step(1 / 60);
const wideAdvance = generous.time - wideStart;
assert(wideAdvance > 0.5 && wideAdvance >= tinyAdvance, `a large budget simulated only ${wideAdvance.toFixed(2)} s vs ${tinyAdvance.toFixed(2)} s`);

console.log('spatial index, conveyor cells, support parity and adaptive step budget OK');
process.exit(0);
