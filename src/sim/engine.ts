import type { GripperKind, RobotProgram, SceneItem } from "../types";
import { samplePath, type P2 } from "./spline";
import { getProduct, MACHINE_KINDS, palletSize } from "../data/products";
import { distanceToSegment, navigate, pointIsFree, projectToFree, type Barrier, type WalkObstacle } from "./navigation";
import { SpatialHash } from "./spatial";
import { isLogicSource, isSignalSource, signalTargets } from "../utils/signalPorts";
import { itemLocalToWorld, rotateVector, rotationMatrix, unrotateVector } from "../utils/transform";
import { RigidBodyWorld } from "./rigidBodies";
import { upperFloorDimensions } from "../utils/upperFloor";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                               */
/* ------------------------------------------------------------------ */

export type V3 = [number, number, number];
export const DT = 1 / 60;
const G = 9.81;
export const MAX_BOXES = 180;
export const BELT_TOP = 0.66;
export const BELT_HALF = 0.31;
export const PALLET_TOP = 0.15;
export const BOX_SIZE: V3 = [0.34, 0.26, 0.34];
export const TABLE_TOP = 0.95;
export const TABLE_LOCAL: [number, number] = [0, 1.45];
const DEG = Math.PI / 180;

export interface RobotSpec {
  shoulder: number;
  L1: number;
  L2: number;
  Lw: number;
  base: number;
}

export const ROBOT_SPECS: Record<"robot" | "cobot", RobotSpec> = {
  robot: { shoulder: 0.95, L1: 1.2, L2: 1.1, Lw: 0.55, base: 0.5 },
  cobot: { shoulder: 0.78, L1: 0.95, L2: 0.85, Lw: 0.4, base: 0.34 },
};

const num = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function wrapQuarter(d: number) { return Math.atan2(Math.sin(d), Math.cos(d)); }

interface Footprint { x: number; z: number; hx: number; hz: number; yaw: number }
function contactXZ(a: Footprint, b: Footprint) {
  const ac = Math.cos(a.yaw), as = Math.sin(a.yaw), bc = Math.cos(b.yaw), bs = Math.sin(b.yaw);
  let depth = Infinity, nx = 0, nz = 0;
  // Keep the original axis order and arithmetic, without allocating four pairs
  // for every product contact in the simulation hot path.
  for (let i = 0; i < 4; i += 1) {
    const x = i === 0 ? ac : i === 1 ? as : i === 2 ? bc : bs;
    const z = i === 0 ? -as : i === 1 ? ac : i === 2 ? -bs : bc;
    const ra = a.hx * Math.abs(x * ac - z * as) + a.hz * Math.abs(x * as + z * ac);
    const rb = b.hx * Math.abs(x * bc - z * bs) + b.hz * Math.abs(x * bs + z * bc);
    const distance = (b.x - a.x) * x + (b.z - a.z) * z;
    const overlap = ra + rb - Math.abs(distance);
    if (overlap <= 0.002) return null;
    if (overlap < depth) { depth = overlap; nx = x * Math.sign(distance || 1); nz = z * Math.sign(distance || 1); }
  }
  return { depth, nx, nz };
}

export function toWorld(px: number, pz: number, rotRad: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rotRad);
  const s = Math.sin(rotRad);
  return [px + lx * c + lz * s, pz - lx * s + lz * c];
}

/* ------------------------------------------------------------------ */
/*  Runtime types                                                     */
/* ------------------------------------------------------------------ */

export interface Box {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  tilt: number;
  tiltV: number;
  ax: number;
  az: number;
  hx: number;
  hy: number;
  hz: number;
  r: number;
  state: "free" | "held" | "inside" | "dying" | "dead";
  claim: number;
  support: 0 | 1 | 2 | 3 | 4;
  palletId: string | null;
  palletT: number;
  processed: boolean;
  color: number;
  fade: number;
  age: number;
  yaw0: number;
  waist0: number;
  lostCounted: boolean;
  convId: string;
  convS: number;
  convLat: number;
  productId: string;
  inspected?: boolean;
  lastMachine?: string;
  counted?: boolean;
  assembly?: boolean;
}

interface Query {
  s: number;
  lat: number;
  inside: boolean;
  /** World-space support height and horizontal fraction of 3D belt speed. */
  y: number;
  speedFactor: number;
  tx: number;
  tz: number;
}

export class ConveyorRT {
  id: string;
  name: string;
  speed: number;
  active: boolean;
  stopper: boolean;
  x: number[] = [];
  y: number[] = [];
  z: number[] = [];
  sideSlope: number[] = [];
  s: number[] = [];
  tx: number[] = [];
  tz: number[] = [];
  length = 1;
  minX = 0;
  maxX = 0;
  minZ = 0;
  maxZ = 0;
  top = BELT_TOP;
  half = BELT_HALF;
  /** Exact legacy fast path for level, unbanked belts. */
  level = true;

  constructor(item: SceneItem) {
    this.id = item.id;
    this.name = item.name;
    this.speed = num(item.props.speed, 0.6);
    this.active = item.props.active !== false;
    this.stopper = item.props.stopper === true;
    const local = (item.points && item.points.length >= 2 ? item.points : [[-2, 0], [2, 0]]) as P2[];
    const path = samplePath(local, 0.1, item.pointHeights);
    const matrix = rotationMatrix(item.rotationX ?? 0, item.rotation, item.rotationZ ?? 0);
    this.length = path.length;
    this.s = path.s;
    for (let i = 0; i < path.x.length; i += 1) {
      // Belt group is unscaled in the viewport, including for old projects.
      const world = itemLocalToWorld(item, [path.x[i], BELT_TOP + path.y[i], path.z[i]], false);
      this.x.push(world[0]); this.y.push(world[1]); this.z.push(world[2]);
      const side = rotateVector(matrix, [-path.tz[i], 0, path.tx[i]]);
      this.sideSlope.push(side[1] / (Math.hypot(side[0], side[2]) || 1));
    }
    this.top = this.y[0]; // legacy convenience; use pointAt/query for a sloped path
    this.level = Math.abs(item.rotationX ?? 0) < 1e-12 && Math.abs(item.rotationZ ?? 0) < 1e-12 && path.y.every((height) => Math.abs(height - path.y[0]) < 1e-12);
    for (let i = 0; i < path.x.length; i += 1) {
      const a = Math.max(0, i - 1), b = Math.min(path.x.length - 1, i + 1);
      const dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a];
      const horizontal = Math.hypot(dx, dz) || 1;
      this.tx.push(dx / horizontal); this.tz.push(dz / horizontal);
    }
    this.minX = Math.min(...this.x) - 0.6;
    this.maxX = Math.max(...this.x) + 0.6;
    this.minZ = Math.min(...this.z) - 0.6;
    this.maxZ = Math.max(...this.z) + 0.6;
    // A 20 m belt is sampled into two hundred segments; looking up the few segments
    // under a product instead of all of them keeps `findSupport` cheap.
    const cell = 1;
    for (let i = 0; i < this.x.length - 1; i += 1) {
      const pad = this.half + 0.08;
      const x0 = Math.floor((Math.min(this.x[i], this.x[i + 1]) - pad) / cell);
      const x1 = Math.floor((Math.max(this.x[i], this.x[i + 1]) + pad) / cell);
      const z0 = Math.floor((Math.min(this.z[i], this.z[i + 1]) - pad) / cell);
      const z1 = Math.floor((Math.max(this.z[i], this.z[i + 1]) + pad) / cell);
      for (let cx = x0; cx <= x1; cx += 1) for (let cz = z0; cz <= z1; cz += 1) {
        const key = (cx + 4096) * 8192 + (cz + 4096);
        const list = this.segments.get(key);
        if (list) list.push(i); else this.segments.set(key, [i]);
      }
    }
  }

  /** Segment indices per one-metre cell; see the constructor. */
  private segments = new Map<number, number[]>();

  query(px: number, pz: number, height?: number): Query | null {
    if (px < this.minX || px > this.maxX || pz < this.minZ || pz > this.maxZ) return null;
    const cell = 1;
    const local = this.segments.get((Math.floor(px / cell) + 4096) * 8192 + (Math.floor(pz / cell) + 4096));
    if (!local) return null;
    const n = this.x.length;
    let best = Infinity;
    let bi = 0;
    let bu = 0;
    let braw = 0;
    for (let k = 0; k < local.length; k += 1) {
      const i = local[k];
      if (i >= n - 1) continue;
      const sx = this.x[i + 1] - this.x[i];
      const sz = this.z[i + 1] - this.z[i];
      const len2 = sx * sx + sz * sz || 1e-9;
      const raw = ((px - this.x[i]) * sx + (pz - this.z[i]) * sz) / len2;
      const u = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      const qx = this.x[i] + sx * u;
      const qz = this.z[i] + sz * u;
      const d2 = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
      // Prefer the actual storey when one path crosses itself at different heights,
      // but do not bias ordinary sloping belts away from their nearest XZ point.
      let score = d2;
      if (!this.level && height !== undefined) {
        const y = this.y[i] + (this.y[i + 1] - this.y[i]) * u;
        const verticalGap = Math.max(0, Math.abs(y - height) - 0.18);
        score += Math.min(0.0001, verticalGap * verticalGap * 0.01);
      }
      if (score < best) {
        best = score;
        bi = i;
        bu = u;
        braw = raw;
      }
    }
    if (best === Infinity) return null;
    const segLen = this.s[bi + 1] - this.s[bi];
    const s = this.s[bi] + bu * segLen;
    const tx = this.tx[bi] + (this.tx[bi + 1] - this.tx[bi]) * bu;
    const tz = this.tz[bi] + (this.tz[bi + 1] - this.tz[bi]) * bu;
    const tl = Math.hypot(tx, tz) || 1;
    const ntx = tx / tl;
    const ntz = tz / tl;
    const qx = this.x[bi] + (this.x[bi + 1] - this.x[bi]) * bu;
    const qz = this.z[bi] + (this.z[bi + 1] - this.z[bi]) * bu;
    const lat = (px - qx) * -ntz + (pz - qz) * ntx;
    let inside = Math.abs(lat) <= this.half;
    if (bi === 0 && braw < 0) inside = false;
    if (bi === n - 2 && braw > 1) inside = false;
    if (this.level) return { s, lat, inside, y: this.top, speedFactor: 1, tx: ntx, tz: ntz };
    const centerY = this.y[bi] + (this.y[bi + 1] - this.y[bi]) * bu;
    const sideSlope = this.sideSlope[bi] + (this.sideSlope[bi + 1] - this.sideSlope[bi]) * bu;
    const horizontalLength = Math.hypot(this.x[bi + 1] - this.x[bi], this.z[bi + 1] - this.z[bi]);
    const verticalLength = this.y[bi + 1] - this.y[bi];
    // On a flat segment retain exactly the legacy horizontal belt speed;
    // sampled chord length is slightly shorter than the arc on curves.
    const speedFactor = Math.abs(verticalLength) < 1e-12 ? 1 : horizontalLength / (Math.hypot(horizontalLength, verticalLength) || 1);
    return { s, lat, inside, y: centerY + lat * sideSlope, speedFactor, tx: ntx, tz: ntz };
  }

  pointAt(d: number) {
    const dist = Math.max(0, Math.min(this.length, d));
    let i = 0;
    while (i < this.s.length - 2 && this.s[i + 1] < dist) i += 1;
    const seg = this.s[i + 1] - this.s[i] || 1e-6;
    const u = Math.max(0, Math.min(1, (dist - this.s[i]) / seg));
    const x = this.x[i] + (this.x[i + 1] - this.x[i]) * u;
    const z = this.z[i] + (this.z[i + 1] - this.z[i]) * u;
    const tx = this.tx[i];
    const tz = this.tz[i];
    const y = this.y[i] + (this.y[i + 1] - this.y[i]) * u;
    return { x, y, z, yaw: Math.atan2(-tz, tx) };
  }
}

interface Rect {
  id: string;
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  yaw: number;
  top: number;
  palletId: string | null;
  collectorId?: string | null;
  /** Oriented surface basis; used by vertical ray/support tests on tilted equipment. */
  surface?: { center: V3; axisX: V3; axisZ: V3; normal: V3 };
  walkable?: boolean;
}

function surfaceRect(item: SceneItem, localCenter: V3, hw: number, hd: number, palletId: string | null = null, collectorId: string | null = null, walkable = false): Rect {
  const center = itemLocalToWorld(item, localCenter);
  const rect: Rect = { id: item.id, cx: center[0], cz: center[2], hw, hd, yaw: item.rotation * DEG, top: center[1], palletId, collectorId, walkable };
  if (Math.abs(item.rotationX ?? 0) < 1e-12 && Math.abs(item.rotationZ ?? 0) < 1e-12) return rect;
  const matrix = rotationMatrix(item.rotationX ?? 0, item.rotation, item.rotationZ ?? 0);
  rect.surface = { center, axisX: rotateVector(matrix, [1, 0, 0]), axisZ: rotateVector(matrix, [0, 0, 1]), normal: rotateVector(matrix, [0, 1, 0]) };
  return rect;
}

/** Intersect a vertical ray with a rotated rectangular face. Faces pointing
 * down or nearly vertical cannot support an upright workpiece. */
function surfaceHeight(rect: Rect, x: number, z: number): number | null {
  const surface = rect.surface;
  if (!surface) {
    const dx = x - rect.cx, dz = z - rect.cz, c = Math.cos(rect.yaw), s = Math.sin(rect.yaw);
    return Math.abs(dx * c - dz * s) <= rect.hw && Math.abs(dx * s + dz * c) <= rect.hd ? rect.top : null;
  }
  const { center, axisX, axisZ, normal } = surface;
  if (normal[1] < 0.05) return null;
  const dx = x - center[0], dz = z - center[2];
  const dy = -(normal[0] * dx + normal[2] * dz) / normal[1];
  const lx = dx * axisX[0] + dy * axisX[1] + dz * axisX[2];
  const lz = dx * axisZ[0] + dy * axisZ[1] + dz * axisZ[2];
  return Math.abs(lx) <= rect.hw && Math.abs(lz) <= rect.hd ? center[1] + dy : null;
}

export class PalletRT {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
  cols: number;
  rows: number;
  layers: number;
  cursor = 0;
  shipped = 0;
  productId: string;
  gap: number;
  width: number;
  depth: number;
  private item: SceneItem;
  private products: readonly SceneItem[];

  constructor(item: SceneItem, prev?: PalletRT, products: readonly SceneItem[] = []) {
    this.id = item.id;
    this.name = item.name;
    this.item = item;
    this.products = products;
    this.x = item.position[0];
    this.y = item.position[1];
    this.z = item.position[2];
    this.scale = item.scale;
    this.yaw = item.rotation * DEG;
    this.cols = Math.max(1, Math.round(num(item.props.cols, 3)));
    this.rows = Math.max(1, Math.round(num(item.props.rows, 2)));
    this.layers = Math.max(1, Math.round(num(item.props.layers, 4)));
    this.productId = String(item.props.product || "carton");
    this.gap = num(item.props.gap, 0.04);
    [this.width, this.depth] = palletSize(item.props, products).map((v) => v * this.scale) as [number, number];
    if (prev) {
      this.cursor = prev.cursor;
      this.shipped = prev.shipped;
    }
  }

  get capacity() {
    return this.cols * this.rows * this.layers;
  }

  slot(i: number, productId = this.productId) {
    const size = getProduct(productId, this.products).size;
    const per = this.cols * this.rows;
    const layer = Math.floor(i / per) % this.layers;
    const idx = i % per;
    const col = idx % this.cols;
    const row = Math.floor(idx / this.cols);
    const lx = (col - (this.cols - 1) / 2) * (size[0] + this.gap);
    const lz = (row - (this.rows - 1) / 2) * (size[2] + this.gap);
    const [x, y, z] = itemLocalToWorld(this.item, [lx, PALLET_TOP + (layer * size[1] + 0.002) / this.scale, lz]);
    return { x, y, z, yaw: this.yaw };
  }
}

export class MachineRT {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  cycle: number;
  busy = false;
  progress = 0;
  busyTime = 0;
  cycles = 0;
  kind: SceneItem["kind"];
  inputProduct: string;
  outputProduct: string;
  part: Box | null = null;
  remaining = 0;
  requiredParts = 1;
  assemblyParts: Box[] = [];
  paintColor = "#d6534c";
  scale: number;
  private tablePoint: { x: number; y: number; z: number; yaw: number };

  constructor(item: SceneItem, prev?: MachineRT) {
    this.id = item.id;
    this.name = item.name;
    this.x = item.position[0];
    this.z = item.position[2];
    this.yaw = item.rotation * DEG;
    this.scale = item.scale;
    const [tx, ty, tz] = itemLocalToWorld(item, [TABLE_LOCAL[0], TABLE_TOP, TABLE_LOCAL[1]]);
    this.tablePoint = { x: tx, y: ty + 0.002, z: tz, yaw: this.yaw };
    this.cycle = num(item.props.cycleTime, 6);
    this.kind = item.kind;
    this.inputProduct = String(item.props.inputProduct || "any");
    this.outputProduct = String(item.props.outputProduct || "machined");
    this.requiredParts = Math.max(1, Math.round(num(item.props.requiredParts, 1)));
    this.paintColor = String(item.props.paintColor || "#d6534c");
    if (prev) {
      this.busy = prev.busy;
      this.progress = prev.progress;
      this.busyTime = prev.busyTime;
      this.cycles = prev.cycles;
      this.part = prev.part;
      this.remaining = prev.remaining;
      this.assemblyParts = prev.assemblyParts;
      this.requiredParts = prev.requiredParts;
      this.paintColor = prev.paintColor;
    }
  }

  table() { return this.tablePoint; }
}

export interface FeederRT {
  id: string;
  x: number;
  /** World-space drop height; optional for older experimental stepper callers. */
  y?: number;
  z: number;
  yaw: number;
  interval: number;
  timer: number;
  active: boolean;
  productId: string;
  supply: number;
  requireSupply: boolean;
}

/** Runtime-only bookkeeping for one feeder with incoming signal wires. */
interface FeederSignalState {
  observed: Map<string, number>;
  pending: Map<string, number>;
}

export class HumanRT {
  id: string;
  x: number;
  y: number;
  baseY: number;
  z: number;
  yaw = 0;
  origin: [number, number];
  route: P2[] = [];
  targetKey = "";
  stage = 0;
  dwell = 0;
  phase = 0;
  walking = false;
  status = "idle";
  completed = 0;
  held: Box | null = null;
  claim: number;
  stuck = 0;
  /** Cached reachable version of the requested station point (see `walkHuman`). */
  projectionKey = "";
  projection: [number, number] | null = null;
  constructor(item: SceneItem, claim: number) {
    this.id = item.id; this.x = item.position[0]; this.y = this.baseY = item.position[1]; this.z = item.position[2];
    this.origin = [this.x, this.z]; this.yaw = item.rotation * DEG; this.claim = -claim;
  }
}

interface Cmd {
  ok: boolean;
  idle?: boolean;
  update(dt: number): boolean;
}

interface Job {
  gen: Generator<Cmd, unknown, unknown>;
  resolve: (value: unknown) => void;
}

export interface RobotKinematics {
  reach(local: V3, spec: RobotSpec): boolean;
  solve(local: V3, spec: RobotSpec): { waist: number; shoulder: number; elbow: number; wrist: number };
}

export class RobotRT {
  kinematics: RobotKinematics | null = null;
  id: number;
  itemId: string;
  name: string;
  kind: "robot" | "cobot";
  spec: RobotSpec;
  x = 0;
  y = 0;
  z = 0;
  rot = 0;
  scale = 1;
  private basis = rotationMatrix(0, 0, 0);
  tip: V3 = [0, 1, 0];
  joints = { waist: 0, shoulder: 0, elbow: 0, wrist: 0 };
  grip = 0;
  gripTarget = 0;
  held: Box | null = null;
  holdYaw: number | null = null;
  vmax = 2;
  vNow = 0;
  cur: Cmd | null = null;
  job: Job | null = null;
  queue: Job[] = [];
  status: "idle" | "moving" | "waiting" | "error" | "stopped" = "stopped";
  busyT = 0;
  cycles = 0;
  lastCycle = 0;
  lastCycleAt = 0;
  script = "";
  runId = 0;
  needsStart = true;
  error: string | null = null;
  warned = false;
  program?: RobotProgram;
  gripper: GripperKind = "vacuum";
  payload = 12;
  outputMode: "moving" | "operation-end" = "moving";
  outputPulse = 0;

  constructor(id: number, item: SceneItem) {
    this.id = id;
    this.itemId = item.id;
    this.name = item.name;
    this.gripper = (item.props.gripper as GripperKind) || "vacuum";
    this.payload = num(item.props.payload, 12);
    this.program = item.program;
    this.kind = item.kind === "cobot" ? "cobot" : "robot";
    this.spec = ROBOT_SPECS[this.kind];
    this.applyItem(item, true);
    this.tip = this.homeTip();
    this.solve();
  }

  applyItem(item: SceneItem, initial = false) {
    const localTip = initial ? null : this.toLocal(this.tip);
    this.x = item.position[0];
    this.y = item.position[1];
    this.z = item.position[2];
    this.rot = item.rotation * DEG;
    this.scale = item.scale || 1;
    this.basis = rotationMatrix(item.rotationX ?? 0, item.rotation, item.rotationZ ?? 0);
    // Keep the tool at the same model-local pose during scene edits.
    if (localTip) this.tip = this.toWorld(localTip);
    this.name = item.name;
    this.gripper = (item.props.gripper as GripperKind) || "vacuum";
    this.payload = num(item.props.payload, 12);
    this.program = item.program;
    const outputMode = item.props.outputMode === "operation-end" ? "operation-end" : "moving";
    if (outputMode !== this.outputMode) this.outputPulse = 0;
    this.outputMode = outputMode;
    this.vmax = (0.5 + 2.2 * (num(item.props.speed, 70) / 100)) * (this.kind === "cobot" ? 0.7 : 1);
  }

  toLocal(p: V3): V3 {
    return unrotateVector(this.basis, [(p[0] - this.x) / this.scale, (p[1] - this.y) / this.scale, (p[2] - this.z) / this.scale]);
  }

  toWorld(local: V3): V3 {
    const p = rotateVector(this.basis, local);
    return [this.x + p[0] * this.scale, this.y + p[1] * this.scale, this.z + p[2] * this.scale];
  }

  homeTip(): V3 {
    return this.toWorld([(this.spec.L1 + this.spec.L2) * 0.52, this.spec.shoulder + 0.5, 0]);
  }

  reach(p: V3): boolean {
    const [lx, ly, lz] = this.toLocal(p);
    if (this.kinematics) return this.kinematics.reach([lx, ly, lz], this.spec);
    const r = Math.hypot(lx, lz);
    const { shoulder, L1, L2, Lw } = this.spec;
    const dy = ly + Lw - shoulder;
    const d = Math.hypot(r, dy);
    return r >= 0.3 && ly >= 0 && d <= L1 + L2 - 0.03 && d >= Math.abs(L1 - L2) + 0.08;
  }

  solve() {
    const [lx, ly, lz] = this.toLocal(this.tip);
    if (this.kinematics) {
      Object.assign(this.joints, this.kinematics.solve([lx, ly, lz], this.spec));
      return;
    }
    const { shoulder, L1, L2, Lw } = this.spec;
    const r = Math.hypot(lx, lz);
    const wy = ly + Lw - shoulder;
    const dRaw = Math.hypot(r, wy);
    const d = Math.max(Math.abs(L1 - L2) + 0.05, Math.min(L1 + L2 - 0.01, dRaw));
    const phi = Math.atan2(wy, r);
    const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
    const alpha = Math.acos(cosA);
    const th1 = phi + alpha;
    const ex = L1 * Math.cos(th1);
    const ey = L1 * Math.sin(th1);
    const wxr = d * Math.cos(phi);
    const wyr = d * Math.sin(phi);
    const th2 = Math.atan2(wyr - ey, wxr - ex);
    this.joints.waist = Math.atan2(-lz, lx);
    this.joints.shoulder = th1;
    this.joints.elbow = th2 - th1;
    this.joints.wrist = -Math.PI / 2 - th2;
  }
}

interface LogLine {
  id: number;
  t: number;
  level: "info" | "ok" | "warn" | "error";
  text: string;
}

interface Timer {
  at: number;
  fn: () => void;
  owner: RobotRT | null;
  runId: number;
}

/* ------------------------------------------------------------------ */
/*  Script guard                                                      */
/* ------------------------------------------------------------------ */

/** Injects a loop guard so that a missing `await` can never freeze the browser. */
export function guardLoops(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  const isId = (ch: string | undefined) => !!ch && /[A-Za-z0-9_$]/.test(ch);
  const matchParen = (start: number) => {
    let depth = 0;
    let j = start;
    let quote = "";
    for (; j < n; j += 1) {
      const ch = src[j];
      if (quote) {
        if (ch === "\\") j += 1;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) return j;
      }
    }
    return -1;
  };
  const splitTop = (text: string) => {
    const parts: string[] = [];
    let depth = 0;
    let quote = "";
    let cur = "";
    for (let k = 0; k < text.length; k += 1) {
      const ch = text[k];
      if (quote) {
        cur += ch;
        if (ch === "\\") {
          cur += text[k + 1] ?? "";
          k += 1;
        } else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        cur += ch;
      } else if ("([{".includes(ch)) {
        depth += 1;
        cur += ch;
      } else if (")]}".includes(ch)) {
        depth -= 1;
        cur += ch;
      } else if (ch === ";" && depth === 0) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    parts.push(cur);
    return parts;
  };

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === "\\") j += 1;
        j += 1;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const kw = src.startsWith("while", i) ? "while" : src.startsWith("for", i) ? "for" : "";
    if (kw && !isId(src[i - 1]) && !isId(src[i + kw.length])) {
      let j = i + kw.length;
      while (j < n && /\s/.test(src[j])) j += 1;
      if (src[j] === "(") {
        const close = matchParen(j);
        if (close > j) {
          const inner = src.slice(j + 1, close);
          if (kw === "while") {
            out += `while (__g(), (${inner}))`;
            i = close + 1;
            continue;
          }
          const parts = splitTop(inner);
          if (parts.length === 3) {
            const cond = parts[1].trim();
            out += `for (${parts[0]}; __g(), (${cond || "true"}); ${parts[2]})`;
            i = close + 1;
            continue;
          }
        }
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Engine                                                            */
/* ------------------------------------------------------------------ */

type Listener = () => void;

/** Experimental injection point for side-by-side backend testing. */
export interface FeederStepper {
  step(feeders: Iterable<FeederRT>, boxes: readonly Box[], dt: number, spawn: (feeder: FeederRT) => void, maxBoxes: number): void;
}

/** Experimental machine clock; product transitions remain host-owned. */
export interface MachineClock {
  advance(machine: MachineRT, dt: number): void;
}

export interface MachineStepper {
  step(machine: MachineRT, candidates: readonly Box[], dt: number): {action: number; first: Box | null; consumed: Box[]};
}

export interface LogicStepper {
  step(items: readonly SceneItem[], boxes: readonly Box[], triggers: ReadonlyMap<string, SceneItem[]>, signals: Map<string, boolean>): void;
}

export interface ProductSupport {
  top: number; kind: number; conveyor: boolean; lat: number; tx: number; tz: number;
  along: number; speed: number; blocked: boolean; stopper: boolean; length: number;
}
export interface ProductIntegrator { integrate(box: Box, support: ProductSupport, dt: number): boolean }

export interface Navigator {
  navigate(start: P2, end: P2, barriers: Barrier[], obstacles: WalkObstacle[]): P2[];
}

interface MergeRoute {
  source: ConveyorRT;
  target: ConveyorRT;
  /** First point of the connector's final overlap with the target. */
  handoff: number;
  entry: number;
  group: MergeGroup;
}
interface MergeGroup {
  target: ConveyorRT;
  reservation: { route: MergeRoute; box: Box } | null;
  candidates: Box[];
  targetBoxes: Box[];
}

export class Engine {
  private _robotKinematics: RobotKinematics | null = null;
  get robotKinematics() { return this._robotKinematics; }
  set robotKinematics(value: RobotKinematics | null) {
    this._robotKinematics = value;
    this.robots.forEach((robot) => { robot.kinematics = value; });
  }
  productIntegrator: ProductIntegrator | null = null;
  navigator: Navigator | null = null;
  logicStepper: LogicStepper | null = null;
  machineStepper: MachineStepper | null = null;
  machineClock: MachineClock | null = null;
  /** Null uses the original TypeScript feeder implementation. */
  feederStepper: FeederStepper | null = null;
  items: SceneItem[] = [];
  /** Authored poses stay separate from transient simulation poses and reset cleanly. */
  private authoredItems: SceneItem[] = [];
  readonly rigidBodies = new RigidBodyWorld();
  private rigidTick = 0;
  private rigidWasAwake = false;
  getPhysicsPose(id: string) { return this.rigidBodies.pose(id); }
  getLiveItem(id: string) { return this.itemById.get(id); }
  running = false;
  speed = 1;
  time = 0;
  private acc = 0;
  private nextBox = 1;
  private nextRobot = 1;
  private guard = 0;

  boxes: Box[] = [];
  conveyors = new Map<string, ConveyorRT>();
  pallets = new Map<string, PalletRT>();
  machines = new Map<string, MachineRT>();
  feeders = new Map<string, FeederRT>();
  robots = new Map<string, RobotRT>();
  humans = new Map<string, HumanRT>();
  collectors = new Map<string, { count: number; capacity: number }>();
  signalState = new Map<string, boolean>();
  /** Per-source rising-edge counters also let the renderer see short pulses
   * that begin and end between two rendered frames. */
  signalActivations = new Map<string, number>();
  private feederSignals = new Map<string, FeederSignalState>();
  private robotSignals = new Map<string, FeederSignalState>();
  barriers: Barrier[] = [];
  walkBarriers: Barrier[] = [];
  walkObstacles: WalkObstacle[] = [];
  rects: Rect[] = [];
  timers: Timer[] = [];
  conds: { pred: () => boolean; fn: () => void; owner: RobotRT | null; runId: number }[] = [];
  private condBuffer: typeof this.conds = [];
  private timerBuffer: Timer[] = [];
  private dueBuffer: Timer[] = [];

  stats = { spawned: 0, placed: 0, pallets: 0, lost: 0, collected: 0, events: [] as number[] };
  logs: LogLine[] = [];
  logVersion = 0;
  private logId = 1;
  private listeners = new Set<Listener>();
  structureVersion = 0;
  private conveyorSignatures = new Map<string, string>();
  /** Only generated merge connectors participate; ordinary belts keep the old path. */
  private mergeRoutes = new Map<string, MergeRoute>();
  private mergeGroups = new Map<string, MergeGroup>();
  private mergePresent = new Set<Box>();

  /* ----- derived lookup tables, rebuilt by `sync` -----
     The stepping code runs up to sixty times per second, so every list scan it used to
     do per robot or per worker is replaced by a map or a spatial hash here. */

  /** Wall-clock budget for one `step` call; the renderer lowers it when frames slip. */
  stepBudgetMs = 6;
  /** CPU time of the last `step`, for diagnostics. */
  lastStepMs = 0;
  private itemById = new Map<string, SceneItem>();
  private logicItems: SceneItem[] = [];
  private triggers = new Map<string, SceneItem[]>();
  private walkSources: SceneItem[] = [];
  private cratesItem: SceneItem | undefined;
  private humanStations = new Map<string, { version: number; task: string; speed: number; source: SceneItem | undefined; dest: SceneItem | undefined }>();
  private supportIndex = new SpatialHash<{ conv: ConveyorRT | null; rect: Rect | null }>(4);
  private barrierIndex = new SpatialHash<Barrier>(2);
  private boxIndex = new SpatialHash<Box>(2);
  private supportScratch: { conv: ConveyorRT | null; rect: Rect | null }[] = [];
  private hasWalkableFloors = false;
  private boxScratch: Box[] = [];
  private boxScratchContact: Box[] = [];
  private grabScratch: Box[] = [];
  private pickupScratch: Box[] = [];
  private walkScratch: Barrier[] = [];
  private obstacleScratch: WalkObstacle[] = [];
  private obstacleIndex = new SpatialHash<WalkObstacle>(2);
  private barrierScratch: Barrier[] = [];
  private otherScratch: HumanRT[] = [];

  /* ----- logging ----- */

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getLogVersion = () => this.logVersion;

  log(text: string, level: LogLine["level"] = "info") {
    this.logs.push({ id: this.logId++, t: this.time, level, text });
    if (this.logs.length > 400) this.logs.splice(0, this.logs.length - 400);
    this.logVersion += 1;
    this.listeners.forEach((fn) => fn());
  }

  clearLog() {
    this.logs = [];
    this.logVersion += 1;
    this.listeners.forEach((fn) => fn());
  }

  /* ----- scene sync ----- */

  sync(items: SceneItem[], physicsUpdate = false) {
    if (!physicsUpdate) { this.authoredItems = items; this.rigidBodies.sync(items); }
    if (this.rigidBodies.dynamicCount) items = items.map((item) => {
      const pose = this.rigidBodies.pose(item.id);
      return pose ? { ...item, ...pose } : item;
    });
    const previousItems = this.itemById;
    const previousSignals = this.signalState;
    this.items = items;
    // A moving person does not change the static navigation topology; keep
    // routes cached. Moving machinery can change it and must invalidate them.
    if (!physicsUpdate || items.some((item) => item.visible !== false && item.props.physicsMode === "dynamic" && item.kind !== "operator" && item.kind !== "mobile-robot")) this.structureVersion += 1;
    const conveyors = new Map<string, ConveyorRT>();
    const pallets = new Map<string, PalletRT>();
    const machines = new Map<string, MachineRT>();
    const feeders = new Map<string, FeederRT>();
    const robots = new Map<string, RobotRT>();
    const humans = new Map<string, HumanRT>();
    const barriers: Barrier[] = [];
    const rects: Rect[] = [];

    for (const item of items) {
      if (item.visible === false) continue;
      switch (item.kind) {
        case "conveyor":
        case "roller": {
          const signature = JSON.stringify([item.position, item.rotation, item.rotationX, item.rotationZ, item.points, item.pointHeights, item.props]);
          const previous = this.conveyors.get(item.id);
          conveyors.set(item.id, previous && this.conveyorSignatures.get(item.id) === signature ? previous : new ConveyorRT(item));
          this.conveyorSignatures.set(item.id, signature);
          break;
        }
        case "crates": {
          const pallet = new PalletRT(item, this.pallets.get(item.id), items);
          pallets.set(item.id, pallet);
          rects.push(surfaceRect(item, [0, PALLET_TOP, 0], pallet.width / 2, pallet.depth / 2, item.id));
          break;
        }
        case "cnc":
        case "press":
        case "weld":
        case "packaging":
        case "paint":
        case "cutter":
        case "inspection":
        case "assembly":
        case "kiln":
        case "lathe":
        case "grinder": {
          const prev = this.machines.get(item.id);
          const machine = prev ? Object.assign(prev, new MachineRT(item, prev)) : new MachineRT(item);
          machines.set(item.id, machine);
          rects.push(surfaceRect(item, [TABLE_LOCAL[0], TABLE_TOP, TABLE_LOCAL[1]], 0.4 * machine.scale, 0.32 * machine.scale));
          break;
        }
        case "feeder": {
          const prev = this.feeders.get(item.id);
          const [x, y, z] = itemLocalToWorld(item, [0, 1.12, 0]);
          feeders.set(item.id, {
            id: item.id,
            x,
            y,
            z,
            yaw: item.rotation * DEG,
            interval: Math.max(0.5, num(item.props.interval, 4)),
            timer: prev ? prev.timer : 0.6,
            active: item.props.active !== false,
            productId: String(item.props.product || "carton"),
            supply: prev?.supply ?? 20,
            requireSupply: item.props.requireSupply === true,
          });
          break;
        }
        case "robot":
        case "cobot":
        case "kuka":
        case "fanuc": {
          let rt = this.robots.get(item.id);
          if (!rt) {
            rt = new RobotRT(this.nextRobot++, item);
            rt.script = item.script ?? "";
          } else {
            const programChanged = JSON.stringify(rt.program) !== JSON.stringify(item.program);
            rt.applyItem(item);
            if ((item.script ?? "") !== rt.script || programChanged) {
              rt.script = item.script ?? "";
              this.stopProgram(rt);
              rt.needsStart = true;
              rt.tip = rt.homeTip();
            }
          }
          rt.kinematics = this._robotKinematics;
          robots.set(item.id, rt);
          break;
        }
        case "operator":
        case "mobile-robot": {
          const previous = this.humans.get(item.id);
          const human = previous ?? new HumanRT(item, this.nextRobot++);
          if (previous && !physicsUpdate && item.props.physicsMode !== "dynamic" && (human.origin[0] !== item.position[0] || human.origin[1] !== item.position[2])) {
            human.x = item.position[0]; human.z = item.position[2]; human.route = []; human.targetKey = "";
          }
          if (!physicsUpdate) {
            if (human.baseY !== item.position[1]) { human.y += item.position[1] - human.baseY; human.baseY = item.position[1]; }
            human.origin = [item.position[0], item.position[2]];
          }
          humans.set(item.id, human);
          break;
        }
        case "collector": {
          const width = Math.max(0.4, num(item.props.width, 1)), depth = Math.max(0.4, num(item.props.depth, 0.8));
          const prev = this.collectors.get(item.id);
          this.collectors.set(item.id, { count: prev?.count ?? 0, capacity: Math.max(1, num(item.props.capacity, 500)) });
          rects.push(surfaceRect(item, [0, 0.08, 0], width * item.scale / 2, depth * item.scale / 2, null, item.id));
          break;
        }
        case "platform": {
          const {width, depth, height} = upperFloorDimensions(item);
          rects.push(surfaceRect(item, [0, height, 0], width * item.scale / 2, depth * item.scale / 2, null, null, true));
          break;
        }
        case "stairs": {
          const {width, length, height, steps} = upperFloorDimensions(item);
          const run = length / steps, rise = height / steps;
          for (let i = 0; i < steps; i++) rects.push(surfaceRect(item, [-length / 2 + (i + 0.5) * run, (i + 1) * rise, 0], run * item.scale / 2, width * item.scale / 2, null, null, true));
          break;
        }
        case "fence": {
          if (Math.abs(item.rotationX ?? 0) > 1e-6 || Math.abs(item.rotationZ ?? 0) > 1e-6) break;
          const pts = item.points ?? [[-1.5, 0], [1.5, 0]];
          for (let i = 0; i < pts.length - 1; i += 1) {
            if (item.props.gateOpen === true && i === Number(item.props.gateSegment ?? 0)) continue;
            const a = toWorld(item.position[0], item.position[2], item.rotation * DEG, pts[i][0], pts[i][1]);
            const b = toWorld(item.position[0], item.position[2], item.rotation * DEG, pts[i + 1][0], pts[i + 1][1]);
            barriers.push({ a, b });
          }
          break;
        }
        default:
          break;
      }
    }
    this.robots.forEach((robot, id) => { if (!robots.has(id)) this.stopProgram(robot); });
    this.machines.forEach((machine, id) => { if (!machines.has(id) && machine.part) { machine.part.state = "free"; machine.part.claim = 0; } });
    this.conveyorSignatures.forEach((_, id) => { if (!conveyors.has(id)) this.conveyorSignatures.delete(id); });
    this.humans.forEach((human, id) => {
      if (!humans.has(id) && human.held) { human.held.state = "free"; human.held.claim = 0; }
    });
    // Move resting products with their support when the layout is edited.
    for (const b of this.boxes) {
      const old = b.palletId ? this.pallets.get(b.palletId) : null;
      const next = b.palletId ? pallets.get(b.palletId) : null;
      if (old && next) {
        const dx = b.x - old.x, dz = b.z - old.z;
        const lx = dx * Math.cos(old.yaw) - dz * Math.sin(old.yaw);
        const lz = dx * Math.sin(old.yaw) + dz * Math.cos(old.yaw);
        [b.x, b.z] = toWorld(next.x, next.z, next.yaw, lx, lz);
        b.y += next.y - old.y + PALLET_TOP * (next.scale - old.scale);
      } else if (b.state === "free" && b.support === 2) {
        const oldBelt = this.conveyors.get(b.convId), nextBelt = conveyors.get(b.convId);
        if (oldBelt && nextBelt && oldBelt !== nextBelt) {
          const from = oldBelt.pointAt(b.convS), to = nextBelt.pointAt(b.convS);
          const oldYaw = from.yaw, nextYaw = to.yaw;
          const dx = b.x - from.x, dz = b.z - from.z;
          const lx = dx * Math.cos(oldYaw) - dz * Math.sin(oldYaw);
          const lz = dx * Math.sin(oldYaw) + dz * Math.cos(oldYaw);
          [b.x, b.z] = toWorld(to.x, to.z, nextYaw, lx, lz);
          b.y += to.y - from.y;
        }
      }
    }
    this.conveyors = conveyors;
    this.pallets = pallets;
    this.machines = machines;
    this.feeders = feeders;
    this.robots = robots;
    for (const collector of this.collectors.values()) collector.capacity = Math.max(collector.capacity, 1);
    // Scene edits (including wire colour/position changes) must not silently
    // release a live button or erase a sensor state. Explicit button property
    // changes still take effect, as do newly loaded/reshown items.
    this.signalState = new Map();
    for (const item of items.filter(isSignalSource)) {
      const previous = previousItems.get(item.id);
      const changedButton = item.kind === "button" && previous?.props.signal !== item.props.signal;
      const keepLive = previous?.kind === item.kind && previous.visible !== false && item.visible !== false && !changedButton;
      const value = item.visible === false ? false : keepLive && previousSignals.has(item.id)
        ? previousSignals.get(item.id) === true : item.props.signal === true;
      this.signalState.set(item.id, value);
      if (value && previousSignals.get(item.id) !== true) this.noteSignalActivation(item.id);
    }
    const currentIds = new Set(items.map((item) => item.id));
    for (const id of this.signalActivations.keys()) if (!currentIds.has(id)) this.signalActivations.delete(id);
    this.humans = humans;
    for (const id of this.collectors.keys()) if (!items.some((i) => i.id === id)) this.collectors.delete(id);
    this.barriers = barriers;
    // Pedestrian footprints are separate from product-physics barriers: products
    // must travel on the belt, but people must walk around its entire spline.
    const walkBarriers: Barrier[] = barriers.map((b) => ({ ...b, clearance: 0.36 }));
    conveyors.forEach((belt) => {
      const stride = 4;
      for (let i = 0; i < belt.x.length - 1; i += stride) {
        const j = Math.min(belt.x.length - 1, i + stride);
        walkBarriers.push({ a: [belt.x[i], belt.z[i]], b: [belt.x[j], belt.z[j]], clearance: belt.half + 0.29 });
      }
    });
    const walkObstacles: WalkObstacle[] = items.filter((i) => i.visible !== false && (MACHINE_KINDS.has(i.kind) || ["rack", "crates", "collector", "cabinet", "robot", "cobot", "kuka", "fanuc"].includes(i.kind))).map((i) => ({
      x: i.position[0], z: i.position[2], radius: MACHINE_KINDS.has(i.kind) ? 1.12 : i.kind === "rack" ? 1.2 : i.kind === "crates" ? 0.76 : i.kind === "cabinet" ? 0.65 : 0.67,
    }));
    this.walkBarriers = walkBarriers; this.walkObstacles = walkObstacles;
    // Existing/imported projects may spawn people inside equipment or on top
    // of one another. Also performed after reset, which restores the origins.
    this.placeHumansSafely();
    this.rects = rects;
    this.hasWalkableFloors = rects.some((rect) => rect.walkable);
    this.rebuildIndices(conveyors, rects, barriers);
    this.syncFeederSignals();
    this.syncRobotSignals();
    if (this.running) this.startPrograms();
  }

  /**
   * Rebuild every lookup the substep loop uses: id map, logic items, trigger lists,
   * worker source candidates and the spatial hashes for supports and barriers.
   * Called once per scene change rather than once per frame.
   */
  private rebuildIndices(conveyors: Map<string, ConveyorRT>, rects: Rect[], barriers: Barrier[]) {
    this.itemById = new Map();
    for (const item of this.items) this.itemById.set(item.id, item);
    const logic: SceneItem[] = [];
    const triggers = new Map<string, SceneItem[]>();
    for (const item of this.items) {
      if (!isSignalSource(item)) continue;
      if (item.visible !== false && isLogicSource(item)) logic.push(item);
      // A hidden source is inactive, but its feeder remains signal-controlled
      // rather than unexpectedly reverting to automatic production.
      for (const target of signalTargets(item)) {
        const targetKind = this.itemById.get(target)?.kind;
        if (item.visible === false && targetKind !== "feeder" && !["robot", "cobot", "kuka", "fanuc"].includes(targetKind ?? "")) continue;
        const list = triggers.get(target);
        if (list) list.push(item); else triggers.set(target, [item]);
      }
    }
    this.logicItems = logic;
    this.triggers = triggers;
    this.rebuildMergeRoutes(conveyors);
    this.walkSources = this.items.filter((i) => i.visible !== false && ["feeder", "conveyor", "roller", "cnc", "press", "weld", "packaging"].includes(i.kind));
    this.cratesItem = this.items.find((i) => i.visible !== false && i.kind === "crates");
    this.humanStations.clear();

    this.supportIndex.clear();
    conveyors.forEach((conv) => {
      this.supportIndex.insert({ conv, rect: null }, conv.minX, conv.minZ, conv.maxX, conv.maxZ);
    });
    for (const rect of rects) {
      const c = Math.abs(Math.cos(rect.yaw)), s = Math.abs(Math.sin(rect.yaw));
      const extentX = rect.surface ? rect.hw * Math.abs(rect.surface.axisX[0]) + rect.hd * Math.abs(rect.surface.axisZ[0]) : rect.hw * c + rect.hd * s;
      const extentZ = rect.surface ? rect.hw * Math.abs(rect.surface.axisX[2]) + rect.hd * Math.abs(rect.surface.axisZ[2]) : rect.hw * s + rect.hd * c;
      this.supportIndex.insert({ conv: null, rect }, rect.cx - extentX, rect.cz - extentZ, rect.cx + extentX, rect.cz + extentZ);
    }

    this.obstacleIndex.clear();
    for (const obstacle of this.walkObstacles) {
      this.obstacleIndex.insert(obstacle, obstacle.x - obstacle.radius, obstacle.z - obstacle.radius, obstacle.x + obstacle.radius, obstacle.z + obstacle.radius);
    }

    this.barrierIndex.clear();
    for (const barrier of barriers) {
      const pad = (barrier.clearance ?? 0.34) + 0.5;
      this.barrierIndex.insert(
        barrier,
        Math.min(barrier.a[0], barrier.b[0]) - pad,
        Math.min(barrier.a[1], barrier.b[1]) - pad,
        Math.max(barrier.a[0], barrier.b[0]) + pad,
        Math.max(barrier.a[1], barrier.b[1]) + pad,
      );
    }
  }

  /** Resolve merge metadata to the actual, currently touching conveyor paths.
   * Moving/removing a belt cannot teleport parts to a disconnected target. */
  private rebuildMergeRoutes(conveyors: Map<string, ConveyorRT>) {
    this.mergeRoutes.clear();
    this.mergeGroups.clear();
    for (const item of this.items) {
      const targetId = typeof item.props.mergeTargetId === "string" ? item.props.mergeTargetId : "";
      const source = conveyors.get(item.id), target = conveyors.get(targetId);
      if (!source || !target || source === target) continue;
      const last = source.x.length - 1;
      const end = target.query(source.x[last], source.z[last], source.y[last]);
      if (!end?.inside || Math.abs(end.y - source.y[last]) > 0.05) continue;
      let first = last;
      while (first > 0) {
        const q = target.query(source.x[first - 1], source.z[first - 1], source.y[first - 1]);
        if (!q?.inside || Math.abs(q.y - source.y[first - 1]) > 0.05) break;
        first--;
      }
      let group = this.mergeGroups.get(target.id);
      if (!group) { group = { target, reservation: null, candidates: [], targetBoxes: [] }; this.mergeGroups.set(target.id, group); }
      this.mergeRoutes.set(source.id, { source, target, handoff: source.s[first], entry: end.s, group });
    }
  }

  /** Select one oldest waiting product at a time per merge target. Products on
   * the main conveyor get clearance first; queues stop before the junction. */
  private prepareMergeReservations() {
    if (!this.mergeGroups.size) return;
    this.mergePresent.clear();
    for (const box of this.boxes) if (box.state === "free") this.mergePresent.add(box);
    for (const group of this.mergeGroups.values()) {
      group.candidates.length = 0;
      group.targetBoxes.length = 0;
      const reservation = group.reservation;
      if (!reservation) continue;
      const { box, route } = reservation;
      const onTarget = box.support === 2 && box.convId === group.target.id;
      const current = onTarget ? group.target.query(box.x, box.z, box.y - box.hy) : null;
      if (!this.mergePresent.has(box) || !route.source.active || !group.target.active ||
          (box.support !== 2 || (box.convId !== route.source.id && box.convId !== group.target.id)) ||
          (current && current.s > route.entry + box.r + 0.35)) group.reservation = null;
    }
    for (const box of this.boxes) {
      if (box.state !== "free" || box.support !== 2) continue;
      this.mergeGroups.get(box.convId)?.targetBoxes.push(box);
      const route = this.mergeRoutes.get(box.convId);
      if (!route || route.group.reservation || !route.source.active || !route.target.active) continue;
      const q = route.source.query(box.x, box.z, box.y - box.hy);
      if (q?.inside && q.s >= route.handoff - box.r - 0.45) route.group.candidates.push(box);
    }
    for (const group of this.mergeGroups.values()) {
      if (group.reservation || !group.candidates.length) continue;
      // Pick the oldest waiting product *before* testing clearance. Otherwise
      // a stream of smaller products can repeatedly fit a gap that is just too
      // small for the older product, starving an entire input indefinitely.
      let chosen = group.candidates[0];
      for (const box of group.candidates) if (box.id < chosen.id) chosen = box;
      const route = this.mergeRoutes.get(chosen.convId)!;
      // A small upstream look-ahead leaves time for a side-entry product to
      // reach the junction before a main-line product arrives there.
      const occupied = group.targetBoxes.some((other) => {
        if (other === chosen) return false;
        const q = group.target.query(other.x, other.z, other.y - other.hy);
        if (!q?.inside) return false;
        const distance = q.s-route.entry;
        const clearance = chosen.r+other.r+0.18;
        return distance > -clearance-Math.max(0.5,group.target.speed*0.5) && distance < clearance;
      });
      if (!occupied) group.reservation = {box:chosen,route};
    }
  }

  /** Extra virtual stop line for the unselected heads and for main-line parts
   * approaching a reserved side entry. Uses the existing conveyor stopper in
   * both TypeScript and the optional Rust product integrator. */
  private mergeStopLength(box: Box, conveyor: ConveyorRT, q: Query): number | null {
    const route = this.mergeRoutes.get(conveyor.id);
    if (route && route.group.reservation?.box !== box) return Math.max(0, route.handoff - 0.18);
    const reservation = this.mergeGroups.get(conveyor.id)?.reservation;
    if (reservation && reservation.box !== box && q.s < reservation.route.entry) return Math.max(0, reservation.route.entry - reservation.box.r - 0.06);
    return null;
  }

  private noteSignalActivation(id: string) {
    this.signalActivations.set(id, (this.signalActivations.get(id) ?? 0) + 1);
  }

  private writeSignal(id: string, value: boolean) {
    if (value && this.signalState.get(id) !== true) this.noteSignalActivation(id);
    this.signalState.set(id, value);
  }

  /** Preserve pending edges across unrelated scene edits, and discard edges
   * from disconnected sources. Connecting an already-high source requests one
   * part; past pulses from before the connection are not replayed. */
  private syncFeederSignals() {
    const next = new Map<string, FeederSignalState>();
    for (const feeder of this.feeders.values()) {
      const sources = this.triggers.get(feeder.id);
      if (!sources?.length) continue;
      const previous = this.feederSignals.get(feeder.id);
      if (!previous) feeder.timer = 0;
      const state: FeederSignalState = { observed: new Map(), pending: new Map() };
      for (const source of sources) {
        const revision = this.signalActivations.get(source.id) ?? 0;
        if (previous?.observed.has(source.id)) {
          state.observed.set(source.id, previous.observed.get(source.id)!);
          const pending = previous.pending.get(source.id) ?? 0;
          if (pending && source.visible !== false && feeder.active) state.pending.set(source.id, pending);
        } else {
          state.observed.set(source.id, revision);
          if (source.visible !== false && feeder.active && this.signalState.get(source.id) === true) state.pending.set(source.id, 1);
        }
      }
      next.set(feeder.id, state);
    }
    this.feederSignals = next;
  }

  pendingFeederSignals(id: string) {
    const state = this.feederSignals.get(id);
    return state ? [...state.pending.values()].reduce((sum, count) => sum + count, 0) : 0;
  }


  /** Each direct robot input queues rising edges, just like a signal feeder.
   * Hidden/disconnected sources never turn a wired robot into automatic mode. */
  private syncRobotSignals() {
    const next = new Map<string, FeederSignalState>();
    for (const robot of this.robots.values()) {
      const sources = this.triggers.get(robot.itemId);
      if (!sources?.length) continue;
      const previous = this.robotSignals.get(robot.itemId);
      const state: FeederSignalState = { observed: new Map(), pending: new Map() };
      for (const source of sources) {
        const revision = this.signalActivations.get(source.id) ?? 0;
        if (previous?.observed.has(source.id)) {
          state.observed.set(source.id, previous.observed.get(source.id)!);
          const pending = previous.pending.get(source.id) ?? 0;
          if (pending && source.visible !== false) state.pending.set(source.id, pending);
        } else {
          state.observed.set(source.id, revision);
          if (source.visible !== false && this.signalState.get(source.id) === true) state.pending.set(source.id, 1);
        }
      }
      next.set(robot.itemId, state);
    }
    this.robotSignals = next;
  }

  private captureRobotSignals() {
    for (const [id, state] of this.robotSignals) for (const source of this.triggers.get(id) ?? []) {
      const revision = this.signalActivations.get(source.id) ?? 0;
      const previous = state.observed.get(source.id) ?? revision;
      if (source.visible !== false && revision > previous) state.pending.set(source.id, (state.pending.get(source.id) ?? 0) + revision - previous);
      state.observed.set(source.id, revision);
    }
  }

  pendingRobotSignals(id: string) {
    const state = this.robotSignals.get(id);
    return state ? [...state.pending.values()].reduce((sum, count) => sum + count, 0) : 0;
  }

  private consumeRobotSignal(id: string): boolean {
    const state = this.robotSignals.get(id);
    if (!state) return false;
    for (const source of this.triggers.get(id) ?? []) {
      const count = state.pending.get(source.id) ?? 0;
      if (count > 0) { if (count === 1) state.pending.delete(source.id); else state.pending.set(source.id, count - 1); return true; }
    }
    return false;
  }

  /** Keep initial and reset positions out of equipment and other people. */
  private placeHumansSafely() {
    const occupied: WalkObstacle[] = [];
    this.humans.forEach((human) => {
      const all = [...this.walkObstacles, ...occupied];
      const oldX = human.x, oldZ = human.z;
      if (!pointIsFree(oldX, oldZ, this.walkBarriers, all)) {
        [human.x, human.z] = projectToFree([oldX, oldZ], [oldX + 1, oldZ + 1], this.walkBarriers, all);
        // Extremely dense or malformed geometry may exceed the local search.
        // Fall back outside the obstacle bounds instead of leaving an overlap.
        if (!pointIsFree(human.x, human.z, this.walkBarriers, all)) {
          const right = Math.max(oldX, ...this.walkBarriers.flatMap((b) => [b.a[0] + (b.clearance ?? 0.34), b.b[0] + (b.clearance ?? 0.34)]), ...all.map((o) => o.x + o.radius)) + 1;
          human.x = right; human.z = oldZ;
        }
        human.route = []; human.targetKey = ""; human.stuck = 0;
      }
      occupied.push({ x: human.x, z: human.z, radius: 0.55 });
    });
  }

  /* ----- control ----- */

  setRunning(on: boolean) {
    if (on === this.running) return;
    this.running = on;
    if (on) this.startPrograms();
    else if (this.rigidBodies.dynamicCount) this.sync(this.authoredItems, true);
  }

  setSpeed(speed: number) {
    this.speed = Number.isFinite(speed) ? Math.max(0.01, speed) : 1;
  }

  reset() {
    this.rigidBodies.reset(this.authoredItems);
    this.rigidTick = 0;
    this.rigidWasAwake = false;
    this.sync(this.authoredItems, true);
    this.boxes = [];
    this.time = 0;
    this.acc = 0;
    this.timers = [];
    this.conds = [];
    this.stats = { spawned: 0, placed: 0, pallets: 0, lost: 0, collected: 0, events: [] };
    this.pallets.forEach((pallet) => {
      pallet.cursor = 0;
      pallet.shipped = 0;
    });
    this.machines.forEach((machine) => {
      machine.busy = false;
      machine.progress = 0;
      machine.busyTime = 0;
      machine.cycles = 0;
      machine.part = null;
      machine.remaining = 0;
    });
    this.feeders.forEach((feeder) => { feeder.timer = 0.6; feeder.supply = 20; });
    this.collectors.forEach((collector) => { collector.count = 0; });
    this.signalState = new Map(this.items.filter(isSignalSource).map((i) => [i.id, i.visible !== false && i.props.signal === true]));
    for (const [id, value] of this.signalState) if (value) this.noteSignalActivation(id);
    this.feederSignals.clear();
    this.robotSignals.clear();
    this.robots.forEach((robot) => { robot.outputPulse = 0; });
    for (const group of this.mergeGroups.values()) group.reservation = null;
    this.syncFeederSignals();
    this.syncRobotSignals();
    this.conveyors.forEach((conv) => {
      const item = this.items.find((i) => i.id === conv.id);
      conv.speed = num(item?.props.speed, 0.6); conv.active = item?.props.active !== false;
    });
    this.humans.forEach((human) => { human.x = human.origin[0]; human.y = human.baseY; human.z = human.origin[1]; human.completed = 0; human.stage = 0; human.dwell = 0; human.route = []; human.targetKey = ""; human.stuck = 0; human.walking = false; human.held = null; });
    this.placeHumansSafely();
    this.robots.forEach((robot) => {
      this.stopProgram(robot);
      robot.tip = robot.homeTip();
      robot.grip = 0;
      robot.gripTarget = 0;
      robot.busyT = 0;
      robot.cycles = 0;
      robot.lastCycle = 0;
      robot.lastCycleAt = 0;
      robot.needsStart = true;
      robot.error = null;
      robot.status = "stopped";
      robot.solve();
    });
    this.log("Simulation reset", "info");
    if (this.running) this.startPrograms();
  }

  private stopProgram(robot: RobotRT) {
    robot.runId += 1;
    robot.cur = null;
    robot.job = null;
    robot.queue = [];
    robot.vNow = 0;
    robot.error = null;
    if (robot.held) {
      robot.held.state = "free";
      robot.held.claim = 0;
      robot.held = null;
    }
    robot.gripTarget = 0;
    this.boxes.forEach((box) => {
      if (box.claim === robot.id) box.claim = 0;
    });
    this.timers = this.timers.filter((timer) => timer.owner !== robot);
    this.conds = this.conds.filter((cond) => cond.owner !== robot);
  }

  startPrograms() {
    this.robots.forEach((robot) => {
      if (!robot.needsStart) return;
      robot.needsStart = false;
      this.launch(robot);
    });
  }

  /** Returns an error message when the script does not compile, otherwise null. */
  check(code: string): string | null {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function noop() {}).constructor as new (...args: string[]) => unknown;
      new AsyncFunction("robot", "world", "log", "__g", guardLoops(code));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  private launch(robot: RobotRT) {
    robot.warned = false;
    if (robot.program) {
      robot.status = "waiting";
      robot.job = { gen: this.visualGen(robot), resolve: () => { robot.status = "stopped"; } };
      this.log(`${robot.name}: visual program started`, "info");
      return;
    }
    const source = robot.script.trim();
    if (!source) {
      robot.status = "idle";
      return;
    }
    const myRun = robot.runId;
    const dead = () => robot.runId !== myRun;
    const hang = () => new Promise<never>(() => undefined);
    const run = <T,>(gen: Generator<Cmd, T, unknown>): Promise<T> => {
      if (dead()) return hang();
      return new Promise<T>((resolve) => {
        robot.queue.push({ gen: gen as Generator<Cmd, unknown, unknown>, resolve: resolve as (v: unknown) => void });
      });
    };
    const after = (seconds: number, fn: () => void) => {
      this.timers.push({ at: this.time + seconds, fn, owner: robot, runId: myRun });
    };

    const lookup = <T extends { name: string }>(map: Map<string, T>, label: string, query: string): T => {
      const q = String(query).toLowerCase();
      const all = [...map.values()];
      const found = map.get(query) ?? all.find((entry) => entry.name.toLowerCase() === q) ?? all.find((entry) => entry.name.toLowerCase().includes(q));
      if (!found) {
        throw new Error(`No ${label} named "${query}". Available: ${all.map((entry) => `"${entry.name}"`).join(", ") || "none"}`);
      }
      return found;
    };

    const robotApi = {
      name: robot.name,
      get tip() {
        return [...robot.tip] as V3;
      },
      get holding() {
        return !!robot.held;
      },
      get speed() {
        return robot.vmax;
      },
      set speed(value: number) {
        robot.vmax = Math.max(0.1, Math.min(4, Number(value) || 1));
      },
      home: () => run(this.homeGen(robot)),
      moveTo: (x: number, y: number, z: number) => run(this.moveGen(robot, [x, y, z])),
      waitForPart: (zone: { x: number; y?: number; z: number; r?: number }) => run(this.waitPartGen(robot, zone)),
      waitForSignal: (target?: string) => run(this.waitSignalGen(robot, target || robot.itemId)),
      pick: (box: Box) => run(this.pickGen(robot, box)),
      place: (slot: { x: number; y: number; z: number; yaw?: number }) => run(this.placeGen(robot, slot)),
      wait: (seconds: number) => run(this.waitGen(Number(seconds) || 0)),
      grip: () => run(this.gripGen(robot, true)),
      release: () => run(this.gripGen(robot, false)),
    };

    const worldApi = {
      get time() {
        return engineRef.time;
      },
      conveyor: (name: string) => {
        const id = lookup(this.conveyors, "conveyor", name).id;
        const get = () => this.conveyors.get(id)!;
        return {
          name: get().name,
          get length() {
            return get().length;
          },
          end: (back = 0.35, r = 0.55) => {
            const p = get().pointAt(get().length - back);
            void p;
            return { get x() { return get().pointAt(get().length - back).x; }, get y() { return get().pointAt(get().length - back).y; }, get z() { return get().pointAt(get().length - back).z; }, r };
          },
          startPoint: (distance = 0.4) => this.liveConveyorPoint(id, distance),
          at: (distance: number) => this.liveConveyorPoint(id, distance),
          setSpeed: (value: number) => {
            get().speed = Number(value) || 0;
          },
          run: (on: boolean) => {
            get().active = !!on;
          },
        };
      },
      pallet: (name: string) => {
        const id = lookup(this.pallets, "pallet", name).id;
        const get = () => this.pallets.get(id)!;
        return {
          name: get().name,
          get capacity() {
            return get().capacity;
          },
          get count() {
            return get().cursor;
          },
          nextSlot: () => {
            const pallet = get();
            const index = pallet.cursor++;
            const productId = robot.held?.productId;
            return { get x() { return get().slot(index, productId).x; }, get y() { return get().slot(index, productId).y; }, get z() { return get().slot(index, productId).z; }, get yaw() { return get().yaw; } };
          },
          isFull: () => get().cursor >= get().capacity,
          swap: () =>
            dead()
              ? hang()
              : new Promise<boolean>((resolve) => {
                  const pallet = get();
                  this.log(`${pallet.name} full - waiting for pick-up`, "info");
                  after(1.8, () => {
                    this.boxes.forEach((box) => {
                      if (box.palletId === pallet.id && box.state === "free") {
                        box.state = "dying";
                        box.fade = 1;
                      }
                    });
                    const current = get();
                    current.cursor = 0;
                    current.shipped += 1;
                    this.stats.pallets += 1;
                    this.log(`${pallet.name} shipped (${pallet.capacity} boxes)`, "ok");
                    resolve(true);
                  });
                }),
        };
      },
      machine: (name: string) => {
        const id = lookup(this.machines, "machine", name).id;
        const get = () => this.machines.get(id)!;
        const partOn = () => {
          const machine = get();
          const t = machine.table();
          return (
            this.boxes.find(
              (box) => box.state === "free" && Math.hypot(box.x - t.x, box.z - t.z) < 0.45 && Math.abs(box.y - box.hy - (t.y - 0.002)) < 0.08,
            ) ?? null
          );
        };
        return {
          name: get().name,
          get busy() {
            return get().busy;
          },
          table: () => ({ get x() { return get().table().x; }, get y() { return get().table().y; }, get z() { return get().table().z; }, get yaw() { return get().yaw; } }),
          hasPart: () => !!partOn(),
          part: () => partOn(),
          process: (seconds?: number) => {
            const machine = get();
            const part = partOn() ?? machine.part;
            if (dead()) return hang();
            if (!part || !this.process(machine, part, seconds)) return Promise.resolve(false);
            return new Promise<boolean>((resolve) => {
              this.conds.push({ pred: () => !machine.busy, fn: () => resolve(true), owner: robot, runId: myRun });
            });
          },
        };
      },
      signal: (targetId: string) => this.signalFor(targetId),
      laser: (name: string) => {
        const id = lookup(new Map(this.items.filter((i) => i.kind === "laser").map((i) => [i.id, { ...i, name: i.name }])), "laser", name).id;
        return { get blocked() { return engineRef.signalState.get(id) === true; }, get signal() { return engineRef.signalState.get(id) === true; } };
      },
      press: (targetId: string, on = true) => this.setButton(targetId, !!on),
      wait: (seconds: number) =>
        dead() ? hang() : new Promise<void>((resolve) => after(Math.max(0, Number(seconds) || 0), resolve)),
      waitUntil: (pred: () => boolean) =>
        dead()
          ? hang()
          : new Promise<void>((resolve) => {
              this.conds.push({ pred, fn: resolve, owner: robot, runId: myRun });
            }),
    };
    const engineRef = this;
    const logFn = (...args: unknown[]) => this.log(`[${robot.name}] ${args.map((a) => String(a)).join(" ")}`, "info");
    const guardFn = () => {
      this.guard += 1;
      if (this.guard > 40000) {
        this.guard = 0;
        throw new Error("Loop ran too long without `await` - add `await robot.wait(0.1)` inside the loop");
      }
      return true;
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function noop() {}).constructor as new (...args: string[]) => (
        ...args: unknown[]
      ) => Promise<unknown>;
      const fn = new AsyncFunction("robot", "world", "log", "__g", `"use strict";\n${guardLoops(robot.script)}`);
      robot.status = "idle";
      this.log(`${robot.name}: program started`, "info");
      fn(robotApi, worldApi, logFn, guardFn).then(
        () => {
          if (!dead()) {
            robot.status = "stopped";
            this.log(`${robot.name}: program finished`, "info");
          }
        },
        (error: unknown) => {
          if (dead()) return;
          robot.status = "error";
          robot.error = error instanceof Error ? error.message : String(error);
          this.log(`${robot.name}: ${robot.error}`, "error");
        },
      );
    } catch (error) {
      robot.status = "error";
      robot.error = error instanceof Error ? error.message : String(error);
      this.log(`${robot.name}: ${robot.error}`, "error");
    }
  }

  private liveConveyorPoint(id: string, distance: number) {
    const engine = this;
    return {
      get x() { return engine.conveyors.get(id)?.pointAt(distance).x ?? 0; },
      get y() { return engine.conveyors.get(id)?.pointAt(distance).y ?? BELT_TOP; },
      get z() { return engine.conveyors.get(id)?.pointAt(distance).z ?? 0; },
      get yaw() { return engine.conveyors.get(id)?.pointAt(distance).yaw ?? 0; },
    };
  }

  canGrip(robot: RobotRT, box: Box) {
    const product = getProduct(box.productId, this.items);
    return product.mass <= robot.payload && (robot.gripper !== "magnetic" || product.magnetic === true);
  }

  private approach(robot: RobotRT, point: V3, clearance: number): V3 {
    for (let extra = Math.max(0.05, clearance); extra >= 0.04; extra -= 0.04) {
      const p: V3 = [point[0], point[1] + extra, point[2]];
      if (robot.reach(p)) return p;
    }
    return point;
  }

  /** Closest unclaimed product within `radius`, using the substep index. */
  private findFreeNear(x: number, z: number, radius: number, uninspectedOnly = false, height?: number): Box | null {
    const nearby = this.boxIndex.query(x, z, this.pickupScratch, radius);
    let best: Box | null = null;
    let bestD = Infinity;
    for (let i = 0; i < nearby.length; i += 1) {
      const b = nearby[i];
      if (b.state !== "free" || b.claim !== 0) continue;
      if (uninspectedOnly && b.inspected) continue;
      if (height !== undefined && Math.abs(b.y - b.hy - height) > 0.2) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < radius && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  private machinePart(machine: MachineRT) {
    const t = machine.table();
    const nearby = this.boxIndex.query(t.x, t.z, this.grabScratch, 0.45);
    for (let i = 0; i < nearby.length; i += 1) {
      const b = nearby[i];
      if (b.state === "free" && Math.hypot(b.x - t.x, b.z - t.z) < 0.45 && Math.abs(b.y - b.hy - (t.y - 0.002)) < 0.09) return b;
    }
    return null;
  }

  process(machine: MachineRT, box: Box, seconds?: number) {
    if (machine.busy) return machine.part === box;
    if (box.lastMachine === machine.id || (machine.inputProduct !== "any" && box.productId !== machine.inputProduct)) return false;
    machine.part = box; machine.remaining = Math.max(0.5, seconds ?? machine.cycle);
    machine.busy = true; machine.progress = 0;
    box.state = "inside"; box.claim = 0;
    return true;
  }

  private updateMachine(machine: MachineRT, dt: number) {
    if (this.machineStepper) {
      const t = machine.table();
      const candidates = machine.busy ? [] : machine.kind === "assembly" ? this.boxes : this.boxIndex.query(t.x, t.z, this.grabScratch, 0.45);
      const {action, first, consumed} = this.machineStepper.step(machine, candidates, dt);
      if ((action === 1 || action === 2) && first) {
        if (action === 2) {
          consumed.forEach((p) => { p.state = "dying"; p.fade = 1; });
          first.y = t.y + first.hy; first.x = t.x; first.z = t.z; first.assembly = true;
        }
        if (machine.busy) { machine.part = first; first.state = "inside"; first.claim = 0; }
      } else if ((action === 3 || action === 4) && machine.part) {
        const box = machine.part;
        box.x = t.x; box.z = t.z;
        if (action === 4) { this.finishMachineProduct(machine, box); machine.part = null; }
      }
      return;
    }
    if (!machine.busy) {
      if (machine.kind === "assembly") {
        const t = machine.table();
        const parts = this.boxes.filter((b) => b.state === "free" && b.claim === 0 && b.lastMachine !== machine.id && Math.hypot(b.x - t.x, b.z - t.z) < 0.48 && Math.abs(b.y - b.hy - (t.y - 0.002)) < 0.12);
        if (parts.length >= machine.requiredParts) {
          const first = parts[0]; parts.slice(1).forEach((p) => { p.state = "dying"; p.fade = 1; });
          first.y = t.y + first.hy; first.x = t.x; first.z = t.z; first.assembly = true;
          this.process(machine, first);
        }
        return;
      }
      const box = this.machinePart(machine);
      if (box && box.claim === 0 && box.lastMachine !== machine.id) this.process(machine, box);
      return;
    }
    if (this.machineClock) this.machineClock.advance(machine, dt);
    else {
      machine.busyTime += dt; machine.remaining -= dt;
      machine.progress = Math.min(1, 1 - machine.remaining / machine.cycle);
    }
    const box = machine.part;
    if (!box) { machine.busy = false; return; }
    const table = machine.table();
    box.x = table.x; box.z = table.z;
    if (machine.remaining <= 0) {
      this.finishMachineProduct(machine, box);
      machine.busy = false; machine.cycles += 1; machine.part = null;
    }
  }

  private finishMachineProduct(machine: MachineRT, box: Box) {
    const product = getProduct(machine.outputProduct, this.items);
    box.productId = product.id; box.color = machine.kind === "paint" ? parseInt(machine.paintColor.replace("#", ""), 16) : product.color;
    [box.hx, box.hy, box.hz] = product.size.map((v) => v / 2) as V3;
    box.r = Math.max(product.size[0], product.size[2]) * 0.55;
    box.y = machine.table().y + box.hy; box.vx = box.vy = box.vz = 0;
    box.state = "free"; box.processed = true; box.lastMachine = machine.id;
    if (machine.kind === "inspection") box.inspected = true;
  }

  /** Native visual workflows share the exact same IK pick/place primitives as code. */
  private *visualGen(robot: RobotRT): Generator<Cmd, unknown, unknown> {
    const config = robot.program!;
    yield* this.homeGen(robot);
    const source = () => {
      const c = this.conveyors.get(config.sourceId);
      const m = this.machines.get(config.sourceId);
      if (c) return { ...c.pointAt(c.length - 0.3), r: 0.65 };
      if (m) return { ...m.table(), r: 0.45 };
      return null;
    };
    const destination = (productId = robot.held?.productId ?? "carton") => {
      const pallet = this.pallets.get(config.targetId);
      const conveyor = this.conveyors.get(config.targetId);
      const machine = this.machines.get(config.targetId);
      return pallet ? pallet.slot(pallet.cursor, productId) : conveyor ? conveyor.pointAt(0.48) : machine?.table() ?? null;
    };
    const machineTarget = () => this.machines.get(config.machineId ?? "");
    do {
      let box: Box | null = null;
      yield this.waiter(() => {
        const zone = source();
        if (!zone) { robot.error = "Choose a source in the visual program"; return false; }
        const found = this.findPart(robot, zone);
        if (!found) { robot.error = null; return false; }
        if (!this.triggerGate(robot.itemId, config.sourceId)) { robot.error = null; return false; }
        const target = config.mode === "tend" ? machineTarget()?.table() : destination(found.productId);
        if (!target || !robot.reach([target.x, target.y + found.hy * 2, target.z])) {
          robot.error = "Destination is outside robot reach. Move it closer to continue.";
          return false;
        }
        this.triggerGate(robot.itemId, config.sourceId, true);
        robot.error = null; box = found; found.claim = robot.id;
        return true;
      });
      if (!box || !(yield* this.pickGen(robot, box))) continue;

      if (config.mode === "tend" || config.mode === "paint" || config.mode === "assemble") {
        const machine = machineTarget();
        if (!machine) continue;
        const live = this.liveMachinePoint(machine.id);
        const rounds = config.mode === "assemble" ? machine.requiredParts : 1;
        for (let n = 0; n < rounds; n += 1) {
          if (n > 0) {
            let extra: Box | null = null;
            yield this.waiter(() => { const z = source(); if (!z || !this.triggerGate(robot.itemId, config.sourceId)) return false; extra = this.findPart(robot, z); if (extra) { this.triggerGate(robot.itemId, config.sourceId, true); extra.claim = robot.id; } return !!extra; });
            if (!extra || !(yield* this.pickGen(robot, extra))) break;
          }
          if (!(yield* this.placeGen(robot, live))) break;
        }
        if (config.mode === "assemble") {
          yield this.waiter(() => { const current = this.machines.get(machine.id); return !!current && !current.busy && !!this.machinePart(current)?.processed; });
          const assembled = this.machinePart(machine);
          if (!assembled || !(yield* this.pickGen(robot, assembled))) continue;
        } else {
          yield this.waiter(() => {
          const current = this.machines.get(machine.id);
          return !!current && !current.busy && !!this.machinePart(current)?.processed;
          });
          const finished = this.machinePart(machine);
          if (!finished || !(yield* this.pickGen(robot, finished))) continue;
        }
      }

      // Targets are getters: moving a conveyor or pallet updates an in-flight task.
      const dest = {
        get x() { return destination()?.x ?? robot.tip[0]; },
        get y() { return destination()?.y ?? 0; },
        get z() { return destination()?.z ?? robot.tip[2]; },
        get yaw() { return destination()?.yaw ?? 0; },
      };
      yield this.waiter(() => {
        const pos = destination();
        const reachable = !!pos && robot.reach([pos.x, pos.y + (robot.held?.hy ?? 0.13) * 2, pos.z]);
        robot.error = reachable ? null : "Destination is outside robot reach. Move it closer to continue.";
        if (!reachable) return false;
        const halfHeight = robot.held?.hy ?? 0.13;
        const footprint = { x: dest.x, z: dest.z, hx: robot.held?.hx ?? 0.17, hz: robot.held?.hz ?? 0.17, yaw: dest.yaw };
        return !this.boxes.some((b) => b !== robot.held && b.state === "free" && Math.abs(b.y - (dest.y + halfHeight)) < b.hy + halfHeight - 0.012 && !!contactXZ(b, footprint));
      });
      const success = yield* this.placeGen(robot, dest);
      const pallet = this.pallets.get(config.targetId);
      if (success && pallet) {
        pallet.cursor += 1;
        if (pallet.cursor >= pallet.capacity) {
          yield* this.waitGen(1.8);
          const current = this.pallets.get(pallet.id);
          this.boxes.forEach((b) => { if (b.palletId === pallet.id && b.state === "free") { b.state = "dying"; b.fade = 1; } });
          if (current) { current.shipped += 1; current.cursor = 0; }
          this.stats.pallets += 1;
          this.log(`${pallet.name}: pallet shipped`, "ok");
        }
      }
      if (config.delay > 0) yield* this.waitGen(config.delay);
    } while (config.repeat);
    return true;
  }

  private liveMachinePoint(id: string) {
    const engine = this;
    return {
      get x() { return engine.machines.get(id)?.table().x ?? 0; },
      get y() { return engine.machines.get(id)?.table().y ?? TABLE_TOP + 0.002; },
      get z() { return engine.machines.get(id)?.table().z ?? 0; },
      get yaw() { return engine.machines.get(id)?.yaw ?? 0; },
    };
  }

  private walkHuman(human: HumanRT, x: number, z: number, speed: number, dt: number) {
    // After a conflict, project the destination as well as the route around
    // other people; otherwise a permanently occupied station causes deadlock.
    const stuck = human.stuck > 0.7;
    const others = this.otherHumans(human);
    // Projecting a station point scans every belt and fence edge, and the requested
    // point is the same for seconds on end, so the result is cached per station and
    // scene version instead of being recomputed on all sixty substeps per second.
    const projectionKey = `${this.structureVersion}|${stuck ? 1 : 0}|${x.toFixed(2)}|${z.toFixed(2)}`;
    let target = human.projection;
    if (human.projectionKey !== projectionKey || !target) {
      const dynamic: WalkObstacle[] = stuck ? others.map((other) => ({ x: other.x, z: other.z, radius: 0.6 })) : [];
      target = projectToFree([x, z], [human.x, human.z], this.walkBarriers, dynamic.length ? [...this.walkObstacles, ...dynamic] : this.walkObstacles);
      human.projectionKey = projectionKey;
      human.projection = target;
    }
    if (Math.hypot(target[0] - human.x, target[1] - human.z) < 0.2) { human.walking = false; human.stuck = 0; return true; }
    const key = `${target[0].toFixed(1)},${target[1].toFixed(1)},${this.structureVersion}`;
    if (human.targetKey !== key) {
      human.targetKey = key;
      const dynamic: WalkObstacle[] = stuck ? others.map((other) => ({ x: other.x, z: other.z, radius: 0.6 })) : [];
      human.route = (this.navigator?.navigate ?? navigate)([human.x, human.z], target, this.walkBarriers, dynamic.length ? [...this.walkObstacles, ...dynamic] : this.walkObstacles);
    }
    const p = human.route[0];
    if (!p) {
      // No path means wait/replan, never a direct line through machinery.
      human.walking = false; human.status = "waiting for clear route"; human.stuck += dt;
      if (human.stuck > 1.2) { human.targetKey = ""; human.stuck = 0.8; }
      return false;
    }
    const dx = p[0] - human.x, dz = p[1] - human.z, d = Math.hypot(dx, dz);
    if (d < 0.11) { human.route.shift(); return false; }
    const step = Math.min(Math.max(0, speed) * dt, d), angle = Math.atan2(dz, dx);
    const canMove = (nx: number, nz: number) => {
      // Only obstacles within a metre can affect one 1/60 s step, so the walk test looks
      // at the local cells instead of every fence and belt in the plant.
      const localBarriers = this.barrierIndex.query(nx, nz, this.walkScratch, 0.9);
      const localObstacles = this.obstacleIndex.query(nx, nz, this.obstacleScratch, 0.2);
      if (!pointIsFree(nx, nz, localBarriers, localObstacles, 0.015)) return false;
      return others.every((other) => {
        const before = Math.hypot(human.x - other.x, human.z - other.z), after = Math.hypot(nx - other.x, nz - other.z);
        return after >= 0.53 || (before < 0.53 && after > before + 0.00001);
      });
    };
    // Both walkers use the same right-hand rule relative to their direction;
    // candidate steps are checked against both people AND static obstacles.
    let moved = false;
    for (const offset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, 3 * Math.PI / 4, -3 * Math.PI / 4]) {
      const nx = human.x + Math.cos(angle + offset) * step, nz = human.z + Math.sin(angle + offset) * step;
      if (!canMove(nx, nz)) continue;
      human.x = nx; human.z = nz; human.yaw = Math.atan2(Math.cos(angle + offset), Math.sin(angle + offset));
      human.stuck = offset === 0 ? Math.max(0, human.stuck - dt * 2) : human.stuck + dt;
      moved = true; break;
    }
    if (!moved) human.stuck += dt;
    if (human.stuck > 0.8) { human.targetKey = ""; human.stuck = 0.75; }
    human.walking = moved;
    if (moved) human.phase += dt * speed * 8;
    return false;
  }

  /** Reusable list of the other walkers, so `walkHuman` does not allocate per call. */
  private otherHumans(human: HumanRT) {
    const out = this.otherScratch;
    out.length = 0;
    for (const other of this.humans.values()) if (other !== human) out.push(other);
    return out;
  }

  private updateHuman(human: HumanRT, dt: number) {
    const item = this.itemById.get(human.id);
    if (!item) return;
    // Task, walking speed and station lookups only change when the scene is re-synced.
    let station = this.humanStations.get(human.id);
    if (!station || station.version !== this.structureVersion) {
      station = {
        version: this.structureVersion,
        task: String(item.props.task || "patrol"),
        speed: num(item.props.walkSpeed, 1),
        source: this.itemById.get(String(item.props.sourceId)) ?? this.walkSources[0],
        dest: this.itemById.get(String(item.props.targetId)) ?? this.cratesItem,
      };
      this.humanStations.set(human.id, station);
    }
    const task = station.task;
    const speed = station.speed;
    const source = station.source;
    const dest = station.dest;
    if (!["carry", "tend"].includes(task) && human.held) { human.held.state = "free"; human.held.claim = 0; human.held = null; }
    if (task === "idle") { human.walking = false; human.status = "idle"; return; }
    human.status = task;
    if (task === "patrol" || !source) {
      const points = item.points ?? [[0, 0], [3, 0], [3, 2], [0, 2]];
      const p = points[human.stage % points.length];
      if (this.walkHuman(human, human.origin[0] + p[0], human.origin[1] + p[1], speed, dt)) {
        human.dwell += dt;
        if (human.dwell > 1) { human.stage += 1; human.completed += 1; human.dwell = 0; }
      }
      return;
    }
    if (task === "tend") {
      const machine = this.machines.get(String(item.props.machineId || ""));
      const output = this.conveyors.get(String(item.props.targetId));
      const inputBelt = this.conveyors.get(source.id);
      if (!machine || !output || !inputBelt) { human.status = "missing station"; return; }
      const pickPoint = inputBelt.pointAt(inputBelt.length - 0.35);
      const table = machine.table();
      if (human.stage === 0) {
        if (!this.walkHuman(human, pickPoint.x, pickPoint.z + 0.55, speed, dt)) return;
        const part = this.findFreeNear(pickPoint.x, pickPoint.z, 0.7, false, pickPoint.y);
        if (!part) { human.status = "waiting"; return; }
        human.held = part; part.state = "held"; part.claim = human.claim; human.stage = 1; human.status = "carrying";
      } else if (human.stage === 1) {
        const part = human.held; if (!part) { human.stage = 0; return; }
        part.x = human.x; part.z = human.z; part.y = human.y + 1.0;
        if (!this.walkHuman(human, table.x, table.z + 0.45, speed * 0.85, dt)) return;
        part.x = table.x; part.z = table.z; part.y = table.y + part.hy;
        part.state = "free"; part.claim = 0; human.held = null; human.stage = 2; human.dwell = 0;
        this.process(machine, part);
      } else if (human.stage === 2) {
        human.status = "processing"; human.dwell += dt;
        if (!machine.busy && machine.part === null && human.dwell > 0.5) {
          const done = this.machinePart(machine);
          if (done) { human.held = done; done.state = "held"; done.claim = human.claim; human.stage = 3; }
        }
      } else {
        const part = human.held; if (!part) { human.stage = 0; return; }
        part.x = human.x; part.z = human.z; part.y = human.y + 1.0;
        const out = output.pointAt(0.5);
        if (!this.walkHuman(human, out.x, out.z + 0.4, speed * 0.85, dt)) return;
        part.x = out.x; part.z = out.z; part.y = out.y + part.hy + 0.002; part.state = "free"; part.claim = 0;
        human.held = null; human.stage = 0; human.completed += 1; human.status = "walking";
      }
      return;
    }
    if (task === "operate") {
      const machine = this.machines.get(source.id) ?? this.machines.get(String(item.props.targetId));
      if (!machine) return;
      const t = machine.table();
      if (!this.walkHuman(human, t.x + 0.7, t.z + 0.7, speed, dt)) return;
      human.walking = false; human.dwell += dt;
      if (human.dwell > 1.2) {
        const part = this.machinePart(machine);
        if (part && !machine.busy) { this.process(machine, part); human.completed += 1; }
        human.dwell = 0;
      }
      return;
    }
    if (task === "replenish") {
      const feeder = this.feeders.get(source.id) ?? [...this.feeders.values()][0];
      if (!feeder) return;
      if (this.walkHuman(human, feeder.x, feeder.z + 0.9, speed, dt)) {
        human.walking = false; human.dwell += dt;
        if (human.dwell > 3) { feeder.supply += 20; human.completed += 1; human.dwell = 0; }
      }
      return;
    }
    const conveyor = this.conveyors.get(source.id);
    const table = this.machines.get(source.id)?.table();
    const pickup = conveyor ? conveyor.pointAt(conveyor.length - 0.35) : table ?? { x: source.position[0], z: source.position[2] };
    if (!human.held) {
      const targetPallet = dest ? this.pallets.get(dest.id) : null;
      if (targetPallet && targetPallet.cursor >= targetPallet.capacity) { human.walking = false; return; }
      if (!this.walkHuman(human, pickup.x, pickup.z + 0.65, speed, dt)) return;
      human.walking = false;
      const b = this.findFreeNear(pickup.x, pickup.z, 0.7, task === "inspect", 'y' in pickup ? pickup.y : undefined);
      if (!b) return;
      human.dwell += dt;
      if (human.dwell < 1.5) return;
      human.dwell = 0;
      if (task === "inspect") { b.inspected = true; human.completed += 1; return; }
      if (!dest) return;
      human.held = b; b.state = "held"; b.claim = human.claim; b.palletId = null;
    }
    const b = human.held;
    if (!b || !dest) return;
    b.x = human.x + Math.sin(human.yaw) * 0.32; b.z = human.z + Math.cos(human.yaw) * 0.32; b.y = human.y + 0.94;
    b.vx = b.vy = b.vz = 0; b.tilt = 0;
    const pallet = this.pallets.get(dest.id);
    const out = this.conveyors.get(dest.id);
    const target = pallet ? pallet.slot(pallet.cursor, b.productId) : out ? out.pointAt(0.5) : this.machines.get(dest.id)?.table();
    if (!target) return;
    if (this.walkHuman(human, target.x, target.z + 0.45, speed * 0.8, dt)) {
      b.x = target.x; b.z = target.z; b.y = target.y + b.hy + 0.003;
      b.state = "free"; b.claim = 0; b.support = 0;
      human.held = null; human.completed += 1;
      if (pallet) {
        pallet.cursor += 1;
        if (pallet.cursor >= pallet.capacity) {
          this.timers.push({ at: this.time + 1.8, owner: null, runId: 0, fn: () => {
            const current = this.pallets.get(pallet.id);
            if (!current || current.cursor < current.capacity) return;
            this.boxes.forEach((b) => { if (b.palletId === current.id && b.state === "free") { b.state = "dying"; b.fade = 1; } });
            current.cursor = 0; current.shipped += 1; this.stats.pallets += 1;
          } });
        }
      }
    }
  }

  /* ----- robot command generators ----- */

  private servo(robot: RobotRT, target: () => V3 | null, tol: number, vscale = 1, timeout = 12): Cmd {
    let t = 0;
    const cmd: Cmd = {
      ok: true,
      update: (dt: number) => {
        t += dt;
        const tg = target();
        if (!tg) {
          cmd.ok = false;
          return true;
        }
        if (!robot.reach(tg)) {
          if (robot.program) {
            robot.error = "Destination is outside robot reach. Move it closer to continue.";
            t = 0;
            return false;
          }
          cmd.ok = false;
          if (!robot.warned) {
            robot.warned = true;
            this.log(`${robot.name}: target (${tg.map((v) => v.toFixed(2)).join(", ")}) is out of reach`, "warn");
          }
          return true;
        }
        const dx = tg[0] - robot.tip[0];
        const dy = tg[1] - robot.tip[1];
        const dz = tg[2] - robot.tip[2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist <= tol) return true;
        const vmax = robot.vmax * vscale;
        const desired = Math.min(vmax, dist * 5 + 0.12);
        robot.vNow = Math.min(desired, robot.vNow + vmax * 5 * dt);
        const step = Math.min(dist, Math.max(robot.vNow, 0.05) * dt);
        const candidate: V3 = [robot.tip[0] + dx / dist * step, robot.tip[1] + dy / dist * step, robot.tip[2] + dz / dist * step];
        if (robot.reach(candidate)) robot.tip = candidate;
        else {
          const r0 = Math.hypot(robot.tip[0] - robot.x, robot.tip[2] - robot.z);
          const r1 = Math.hypot(tg[0] - robot.x, tg[2] - robot.z);
          const a0 = Math.atan2(robot.tip[2] - robot.z, robot.tip[0] - robot.x);
          const a1 = Math.atan2(tg[2] - robot.z, tg[0] - robot.x);
          const da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
          const u = Math.min(1, step / Math.max(dist, Math.abs(da) * r0));
          const r = r0 + (r1 - r0) * u, a = a0 + da * u;
          const around: V3 = [robot.x + Math.cos(a) * r, robot.tip[1] + dy * u, robot.z + Math.sin(a) * r];
          if (robot.reach(around)) robot.tip = around;
        }
        if (t > timeout) {
          cmd.ok = false;
          this.log(`${robot.name}: motion timed out`, "warn");
          return true;
        }
        return false;
      },
    };
    return cmd;
  }

  private waiter(done: () => boolean, timeout = Infinity): Cmd {
    let t = 0;
    const cmd: Cmd = {
      ok: true,
      idle: true,
      update: (dt: number) => {
        t += dt;
        if (done()) return true;
        if (t > timeout) {
          cmd.ok = false;
          return true;
        }
        return false;
      },
    };
    return cmd;
  }

  private *waitGen(seconds: number): Generator<Cmd, boolean, unknown> {
    let t = 0;
    yield this.waiter(() => {
      t += DT;
      return t >= seconds;
    });
    return true;
  }

  private *homeGen(robot: RobotRT): Generator<Cmd, boolean, unknown> {
    const home = robot.homeTip();
    const up: V3 = [robot.tip[0], Math.max(robot.tip[1], home[1]), robot.tip[2]];
    yield this.servo(robot, () => up, 0.02);
    const move = this.servo(robot, () => home, 0.02);
    yield move;
    return move.ok;
  }

  private *moveGen(robot: RobotRT, target: V3): Generator<Cmd, boolean, unknown> {
    const move = this.servo(robot, () => target, 0.01);
    yield move;
    return move.ok;
  }

  private *gripGen(robot: RobotRT, close: boolean): Generator<Cmd, boolean, unknown> {
    if (close && !robot.held) {
      const candidate = this.boxes.find(
        (box) =>
          box.state === "free" &&
          (box.claim === 0 || box.claim === robot.id) &&
          Math.hypot(box.x - robot.tip[0], box.z - robot.tip[2]) < 0.2 &&
          Math.abs(box.y + box.hy - robot.tip[1]) < 0.12,
      );
      if (candidate) this.attach(robot, candidate);
    } else if (!close && robot.held) {
      this.detach(robot);
    }
    robot.gripTarget = close ? 1 : 0;
    let t = 0;
    yield this.waiter(() => {
      t += DT;
      return t > 0.22;
    });
    return close ? !!robot.held : true;
  }

  private attach(robot: RobotRT, box: Box) {
    box.state = "held";
    box.claim = robot.id;
    box.yaw0 = box.yaw;
    box.waist0 = robot.joints.waist;
    box.vx = box.vy = box.vz = 0;
    box.support = 0;
    box.tilt = 0;
    box.palletId = null;
    robot.held = box;
    robot.holdYaw = null;
  }

  private detach(robot: RobotRT) {
    const box = robot.held;
    if (!box) return;
    box.state = "free";
    box.claim = 0;
    box.vx = box.vy = box.vz = 0;
    robot.held = null;
    robot.holdYaw = null;
  }

  private findPart(robot: RobotRT, zone: { x: number; y?: number; z: number; r?: number }): Box | null {
    const radius = zone.r ?? 0.55;
    let best: Box | null = null;
    let bestD = Infinity;
    const nearby = this.boxIndex.query(zone.x, zone.z, this.grabScratch, radius);
    for (let i = 0; i < nearby.length; i += 1) {
      const box = nearby[i];
      if (box.state !== "free" || (box.claim !== 0 && box.claim !== robot.id) || box.support === 0 || !this.canGrip(robot, box)) continue;
      if (Math.hypot(box.vx, box.vz) > 0.9) continue;
      if (typeof zone.y === "number" && Math.abs(box.y - box.hy - zone.y) > 0.2) continue;
      const d = Math.hypot(box.x - zone.x, box.z - zone.z);
      if (d <= radius && d < bestD && robot.reach(this.approach(robot, [box.x, box.y + box.hy, box.z], 0.35))) {
        best = box;
        bestD = d;
      }
    }
    return best;
  }

  private *waitSignalGen(robot: RobotRT, targetId: string): Generator<Cmd, boolean, unknown> {
    const engine = this;
    yield this.waiter(() => targetId === robot.itemId && engine.robotSignals.has(targetId)
      ? engine.consumeRobotSignal(targetId) : engine.signalFor(targetId));
    return !!robot;
  }

  private *waitPartGen(robot: RobotRT, zone: { x: number; y?: number; z: number; r?: number }): Generator<Cmd, Box | null, unknown> {
    let found: Box | null = null;
    yield this.waiter(() => {
      const box = this.findPart(robot, zone);
      if (!box) return false;
      box.claim = robot.id;
      found = box;
      return true;
    });
    return found;
  }

  private *pickGen(robot: RobotRT, box: Box): Generator<Cmd, boolean, unknown> {
    if (!box || box.state !== "free" || !this.canGrip(robot, box)) return false;
    box.claim = robot.id;
    const alive = () => box.state === "free" && box.claim === robot.id;
    const hover = this.servo(robot, () => (alive() ? this.approach(robot, [box.x, box.y + box.hy, box.z], robot.program?.clearance ?? 0.35) : null), 0.03);
    yield hover;
    if (!hover.ok) {
      if (box.claim === robot.id) box.claim = 0;
      return false;
    }
    const down = this.servo(robot, () => (alive() ? [box.x, box.y + box.hy, box.z] : null), 0.012, 0.45);
    yield down;
    if (!down.ok) {
      if (box.claim === robot.id) box.claim = 0;
      return false;
    }
    this.attach(robot, box);
    robot.gripTarget = 1;
    let t = 0;
    yield this.waiter(() => {
      t += DT;
      return t > 0.25;
    });
    const lift = this.approach(robot, robot.tip, robot.program?.clearance ?? 0.35);
    yield this.servo(robot, () => lift, 0.02, 0.8);
    return true;
  }

  private *placeGen(
    robot: RobotRT,
    slot: { x: number; y: number; z: number; yaw?: number },
  ): Generator<Cmd, boolean, unknown> {
    const box = robot.held;
    if (!box) {
      this.log(`${robot.name}: place() called without a part in the gripper`, "warn");
      return false;
    }
    const h = box.hy * 2;
    if (slot.yaw !== undefined) robot.holdYaw = slot.yaw;
    const hover = this.servo(robot, () => this.approach(robot, [slot.x, slot.y + h, slot.z], robot.program?.clearance ?? 0.35), 0.025);
    yield hover;
    if (!hover.ok) return false;
    const down = this.servo(robot, () => [slot.x, slot.y + h + 0.004, slot.z], 0.006, 0.4);
    yield down;
    if (!down.ok) return false;
    this.detach(robot);
    robot.gripTarget = 0;
    let t = 0;
    yield this.waiter(() => {
      t += DT;
      return t > 0.2;
    });
    const up = this.approach(robot, robot.tip, robot.program?.clearance ?? 0.35);
    yield this.servo(robot, () => up, 0.02, 0.8);
    robot.cycles += 1;
    if (robot.outputMode === "operation-end") robot.outputPulse = 0.1;
    robot.lastCycle = this.time - robot.lastCycleAt;
    robot.lastCycleAt = this.time;
    return true;
  }

  /* ----- stepping ----- */

  step(frameDt: number) {
    if (!this.running) return;
    // Account for the actual elapsed frame time, including slow frames.
    if (!Number.isFinite(frameDt) || frameDt <= 0) return;
    this.acc += frameDt * this.speed;
    const started = performance.now();
    const budget = Math.max(1, Math.min(40, this.stepBudgetMs));
    let n = 0;
    // There is no artificial multiplier cap. High multipliers simulate as much as the
    // current device can afford in the frame budget, which the renderer shrinks when
    // frames start slipping so the simulation never starves the 3D view.
    while (this.acc >= DT && n < 200_000) {
      this.sub(DT);
      this.acc -= DT;
      n += 1;
      if (performance.now() - started >= budget) break;
    }
    // Preserve unprocessed simulation time rather than silently losing it under load.
    // The frame budget can make the actual rate lower than requested until caught up.
    this.lastStepMs = performance.now() - started;
  }

  private sub(dt: number) {
    this.time += dt;
    this.guard = 0;
    // One fresh copy of the moving products per substep: every consumer below
    // (pickers, workers, physics) then queries cells instead of scanning the list.
    this.boxIndex.clear();
    for (const box of this.boxes) {
      if (box.state !== "free") continue;
      this.boxIndex.insert(box, box.x - box.hx, box.z - box.hz, box.x + box.hx, box.z + box.hz);
    }

    if (this.timers.length) {
      // Two alternating buffers: this runs sixty times a second, so it allocates nothing.
      const current = this.timers;
      const due = this.dueBuffer;
      const kept = this.timerBuffer;
      due.length = 0;
      kept.length = 0;
      for (const timer of current) (timer.at <= this.time ? due : kept).push(timer);
      this.timers = kept;
      this.timerBuffer = current;
      for (const timer of due) {
        if (!timer.owner || timer.owner.runId === timer.runId) timer.fn();
      }
    }
    if (this.conds.length) {
      const current = this.conds;
      const remaining = this.condBuffer;
      remaining.length = 0;
      for (const cond of current) {
        if (cond.owner && cond.owner.runId !== cond.runId) continue;
        let ok = false;
        try {
          ok = !!cond.pred();
        } catch {
          ok = true;
        }
        if (ok) cond.fn();
        else remaining.push(cond);
      }
      this.conds = remaining;
      this.condBuffer = current;
    }

    const spawnFromFeeder = (feeder: FeederRT) => this.spawn(feeder.productId, feeder.x, feeder.y ?? 1.12, feeder.z, feeder.yaw);
    const standardFeederHeights = this.feederStepper && this.feederSignals.size === 0 && [...this.feeders.values()].every((feeder) => Math.abs((feeder.y ?? 1.12) - 1.12) < 1e-8);
    if (this.feederStepper && standardFeederHeights) {
      this.feederStepper.step(this.feeders.values(), this.boxes, dt, spawnFromFeeder, MAX_BOXES);
    } else this.feeders.forEach((feeder) => {
      const signals = this.feederSignals.get(feeder.id);
      if (signals) this.updateSignalFeeder(feeder, signals, dt);
      // The experimental Rust batch has no signal mode. Use it only for the
      // ordinary feeders, in scene order so overlapping feeders remain safe.
      else if (this.feederStepper && Math.abs((feeder.y ?? 1.12) - 1.12) < 1e-8) this.feederStepper.step([feeder], this.boxes, dt, spawnFromFeeder, MAX_BOXES);
      else this.updateFeeder(feeder, dt);
    });
    this.captureRobotSignals();
    this.robots.forEach((robot) => this.updateRobot(robot, dt));
    this.machines.forEach((machine) => this.updateMachine(machine, dt));
    this.humans.forEach((human) => {
      this.updateHuman(human, dt);
      if (this.hasWalkableFloors && (!this.rigidBodies.dynamicCount || !this.rigidBodies.pose(human.id))) this.updateHumanFloor(human, dt);
    });
    this.updateLogic();
    this.robots.forEach((robot) => { robot.outputPulse = Math.max(0, robot.outputPulse - dt); });
    this.prepareMergeReservations();
    this.physics(dt);
    if (this.rigidBodies.active) {
      this.humans.forEach((human) => {
        if (this.rigidBodies.pose(human.id)) {
          if (human.walking) this.rigidBodies.drive(human.id, human.x, human.z, dt, this.walkerStepHeight(human));
        } else {
          const item = this.itemById.get(human.id);
          if (item) this.rigidBodies.followWalker(human.id, item, human.x, human.y, human.z, human.yaw);
        }
      });
      this.rigidBodies.step(dt, this.boxes, (id) => getProduct(id, this.items).mass);
      this.humans.forEach((human) => {
        const pose = this.rigidBodies.pose(human.id);
        if (pose) { human.x = pose.position[0]; human.y = pose.position[1]; human.z = pose.position[2]; }
      });
      // Spatial supports, signal anchors, robot bases and feeder drop points
      // follow moving equipment without rebuilding the whole scene at 60 Hz.
      if (this.rigidBodies.dynamicCount) {
        const awake = this.rigidBodies.hasAwakeBodies();
        if ((++this.rigidTick % 4 === 0 && awake) || (this.rigidWasAwake && !awake)) this.sync(this.authoredItems, true);
        this.rigidWasAwake = awake;
      } else this.rigidWasAwake = false;
    }
  }

  private updateSignalFeeder(feeder: FeederRT, state: FeederSignalState, dt: number) {
    const sources = this.triggers.get(feeder.id) ?? [];
    // Count each source separately: a second button can trigger even while the
    // first is held. Pulses are remembered if the output or supply is blocked.
    for (const source of sources) {
      const revision = this.signalActivations.get(source.id) ?? 0;
      const previous = state.observed.get(source.id) ?? revision;
      if (feeder.active && source.visible !== false && revision > previous) {
        state.pending.set(source.id, (state.pending.get(source.id) ?? 0) + revision - previous);
      }
      state.observed.set(source.id, revision);
    }
    if (!feeder.active) { state.pending.clear(); return; }
    feeder.timer = Math.max(0, feeder.timer - dt);
    if (feeder.timer > 0 || (feeder.requireSupply && feeder.supply <= 0)) return;
    const sourceId = sources.find((source) => (state.pending.get(source.id) ?? 0) > 0)?.id;
    if (!sourceId) return;
    const sy = feeder.y ?? 1.12;
    const blocked = this.boxes.some(
      (box) => box.state !== "dead" && Math.hypot(box.x - feeder.x, box.z - feeder.z) < 0.5 && box.y > sy - 0.72 && box.y < sy + 0.4,
    );
    if (blocked || this.boxes.length >= MAX_BOXES) return;
    const remaining = (state.pending.get(sourceId) ?? 1) - 1;
    if (remaining) state.pending.set(sourceId, remaining); else state.pending.delete(sourceId);
    feeder.timer = feeder.interval;
    this.spawn(feeder.productId, feeder.x, sy, feeder.z, feeder.yaw);
    feeder.supply -= 1;
  }

  private updateFeeder(feeder: FeederRT, dt: number) {
    if (!feeder.active || (feeder.requireSupply && feeder.supply <= 0)) return;
    feeder.timer -= dt;
    if (feeder.timer > 0) return;
    const sy = feeder.y ?? 1.12;
    const blocked = this.boxes.some(
      (box) => box.state !== "dead" && Math.hypot(box.x - feeder.x, box.z - feeder.z) < 0.5 && box.y > sy - 0.72 && box.y < sy + 0.4,
    );
    if (blocked || this.boxes.length >= MAX_BOXES) {
      feeder.timer = 0.25;
      return;
    }
    feeder.timer = feeder.interval;
    this.spawn(feeder.productId, feeder.x, sy, feeder.z, feeder.yaw);
    feeder.supply -= 1;
  }

  spawn(productId: string, x: number, y: number, z: number, yaw = 0): Box {
    const product = getProduct(productId, this.items);
    const [w, h, d] = product.size;
    const box: Box = {
      id: this.nextBox++, x, y, z, vx: 0, vy: 0, vz: 0, yaw,
      tilt: 0, tiltV: 0, ax: 1, az: 0, hx: w / 2, hy: h / 2, hz: d / 2,
      r: Math.max(w, d) * 0.55, state: "free", claim: 0, support: 0,
      palletId: null, palletT: 0, processed: false, color: product.color,
      fade: 1, age: 0, yaw0: 0, waist0: 0, lostCounted: false,
      convId: "", convS: 0, convLat: 0, productId: product.id,
    };
    this.boxes.push(box); this.stats.spawned += 1;
    return box;
  }

  private updateRobot(robot: RobotRT, dt: number) {
    robot.grip += Math.sign(robot.gripTarget - robot.grip) * Math.min(Math.abs(robot.gripTarget - robot.grip), 6 * dt);
    let guard = 0;
    let working = false;
    let waiting = false;
    try {
    while (guard < 8) {
      guard += 1;
      if (!robot.cur) {
        if (!robot.job) {
          const next = robot.queue.shift();
          if (!next) break;
          robot.job = next;
        }
        const result = robot.job.gen.next();
        if (result.done) {
          const job = robot.job;
          robot.job = null;
          job.resolve(result.value);
          continue;
        }
        robot.cur = result.value;
      }
      const finished = robot.cur.update(dt);
      if (robot.cur.idle) waiting = true;
      else working = true;
      if (finished) {
        robot.cur = null;
        continue;
      }
      break;
    }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.stopProgram(robot); robot.status = "error"; robot.error = message;
      this.log(`${robot.name}: ${message}`, "error");
      return;
    }
    if (robot.status !== "error") {
      robot.status = robot.cur ? (waiting && !working ? "waiting" : "moving") : robot.job || robot.queue.length ? "moving" : robot.script.trim() ? "idle" : "stopped";
    }
    if (robot.cur && !robot.cur.idle) robot.busyT += dt;
    else robot.vNow = Math.max(0, robot.vNow - robot.vmax * 6 * dt);
    robot.solve();
    const box = robot.held;
    if (box) {
      box.x = robot.tip[0];
      box.y = robot.tip[1] - box.hy;
      box.z = robot.tip[2];
      box.vx = box.vy = box.vz = 0;
      if (robot.holdYaw !== null) {
        box.yaw += wrapQuarter(robot.holdYaw - box.yaw) * Math.min(1, 5 * dt);
      } else {
        box.yaw = box.yaw0 + (robot.joints.waist - box.waist0);
      }
    }
  }

  signalFor(targetId: string) {
    const sources = this.triggers.get(targetId);
    if (!sources) return false;
    for (const item of sources) if (this.signalState.get(item.id)) return true;
    return false;
  }

  setButton(id: string, on: boolean) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    this.writeSignal(id, on);
    this.log(`${item.name}: ${on ? "pressed" : "released"}`, "info");
  }

  private updateLogic() {
    // The optional Rust logic kernel models ground-level detectors. Elevated
    // or tilted detectors use the host path so they don't sense another floor.
    const standardSensors = !this.logicStepper || this.logicItems.every((item) => {
      if (item.kind !== "sensor" && item.kind !== "laser") return true;
      if (item.position[1] !== 0 || item.rotationX || item.rotationZ || item.scale !== 1) return false;
      // The legacy Rust proximity sensor is 2D. It is equivalent on one floor,
      // but defer to the host if a nearby product is on a different level.
      if (item.kind === "sensor") {
        const radius = Math.max(0.2, num(item.props.radius, 0.8));
        return !this.boxes.some((box) => box.state !== "dead" &&
          Math.hypot(box.x - item.position[0], box.z - item.position[2]) <= radius &&
          Math.abs(box.y + box.hy - 1) > Math.max(0.5, radius));
      }
      return true;
    });
    if (this.logicStepper && standardSensors) {
      const before = new Map(this.logicItems.map((item) => [item.id, this.signalState.get(item.id) === true]));
      this.logicStepper.step(this.logicItems, this.boxes, this.triggers, this.signalState);
      for (const item of this.logicItems) if (this.signalState.get(item.id) === true && !before.get(item.id)) this.noteSignalActivation(item.id);
    } else for (const item of this.logicItems) {
      let signal = item.kind === "button" ? this.signalState.get(item.id) === true : false;
      if (item.kind === "laser") {
        const range = Math.max(0.5, num(item.props.range, 3)) / 2;
        const yaw = item.rotation * DEG, c = Math.cos(yaw), sn = Math.sin(yaw);
        const a = [item.position[0] - range * c, item.position[2] + range * sn];
        const b = [item.position[0] + range * c, item.position[2] - range * sn];
        signal = this.boxes.some((box) => box.state !== "dead" && box.state !== "dying" && Math.abs(box.y + box.hy - (item.position[1] + item.scale)) < 0.5 * item.scale && distanceToSegment(box.x, box.z, a as P2, b as P2).distance < box.r + 0.06);
        if (item.props.normallyClosed === true) signal = !signal;
      } else if (item.kind === "sensor") {
        const radius = Math.max(0.2, num(item.props.radius, 0.8));
        signal = this.boxes.some((box) => box.state !== "dead" && Math.hypot(box.x - item.position[0], box.z - item.position[2]) <= radius &&
          Math.abs(box.y + box.hy - (item.position[1] + 1.0 * item.scale)) <= Math.max(0.5, radius));
      } else if (item.kind === "plc") {
        const sources = this.triggers.get(item.id);
        signal = (sources ? sources.some((i) => this.signalState.get(i.id) === true) : false) || item.props.signal === true;
      }
      this.writeSignal(item.id, signal);
    }
    // Keep robot output state current even while disconnected, so connecting an
    // idle robot never replays a stale signal from an earlier connection.
    for (const robot of this.robots.values()) this.writeSignal(robot.itemId, robot.outputMode === "operation-end" ? robot.outputPulse > 0 : robot.status === "moving" || !!robot.held);
  }

  private triggerGate(robotId: string, sourceId: string, consume = false) {
    const direct = this.robotSignals.get(robotId);
    const hasPending = !!direct && [...direct.pending.values()].some((count) => count > 0);
    const legacy = this.triggers.get(sourceId) ?? [];
    const legacyHigh = legacy.some((item) => item.visible !== false && this.signalState.get(item.id) === true);
    if (hasPending) { if (consume) this.consumeRobotSignal(robotId); return true; }
    if (legacyHigh) return true;
    return !direct && legacy.length === 0;
  }

  /* ----- physics ----- */

  private supportResult = {
    top: 0,
    kind: 1 as 1 | 2 | 3 | 4,
    conv: null as ConveyorRT | null,
    q: null as Query | null,
    palletId: null as string | null,
    collectorId: null as string | null,
  };

  private findSupport(b: Box) {
    const out = this.supportResult;
    out.top = 0;
    out.kind = 1;
    out.conv = null;
    out.q = null;
    out.palletId = null;
    out.collectorId = null;
    const bottom = b.y - b.hy;
    // Only the support cells under this product are visited, so a plant with hundreds of
    // belts and tables costs the same as one with three.
    const supports = this.supportIndex.query(b.x, b.z, this.supportScratch);
    for (let i = 0; i < supports.length; i += 1) {
      const entry = supports[i];
      const conv = entry.conv;
      if (conv) {
        if (conv.level && (bottom < conv.top - 0.14 || bottom > conv.top + 0.1)) continue;
        const q = conv.query(b.x, b.z, bottom);
        if (q && q.inside && bottom >= q.y - 0.14 && bottom <= q.y + 0.1 && q.y >= out.top) {
          out.top = q.y;
          out.kind = 2;
          out.conv = conv;
          out.q = q;
        }
        continue;
      }
      const rect = entry.rect;
      if (!rect) continue;
      if (!rect.surface && (bottom < rect.top - 0.14 || bottom > rect.top + 0.1 || rect.top < out.top)) continue;
      const top = surfaceHeight(rect, b.x, b.z);
      if (top !== null && bottom >= top - 0.14 && bottom <= top + 0.1 && top >= out.top) {
        out.top = top;
        out.kind = 3;
        out.conv = null;
        out.q = null;
        out.palletId = rect.palletId;
        out.collectorId = rect.collectorId ?? null;
      }
    }
    // Stay on the incoming head until its reservation reaches the actual
    // overlap; other coincident conveyor surfaces must not steal the product.
    const route = this.mergeRoutes.size && b.support === 2 ? this.mergeRoutes.get(b.convId) : undefined;
    if (route) {
      const sourceQuery = route.source.query(b.x, b.z, bottom);
      if (sourceQuery?.inside && bottom >= sourceQuery.y - 0.14 && bottom <= sourceQuery.y + 0.1 && out.top <= sourceQuery.y + 0.05) {
        const targetQuery = route.target.query(b.x, b.z, bottom);
        const canTransfer = route.group.reservation?.box === b && sourceQuery.s >= route.handoff - 0.11 && targetQuery?.inside && Math.abs(targetQuery.y - sourceQuery.y) <= 0.05;
        out.top = canTransfer && targetQuery ? targetQuery.y : sourceQuery.y; out.kind = 2;
        out.conv = canTransfer ? route.target : route.source;
        out.q = canTransfer ? targetQuery : sourceQuery;
        out.palletId = null; out.collectorId = null;
      }
    }
    const stacked = this.boxIndex.empty ? this.boxScratch : this.boxIndex.query(b.x, b.z, this.boxScratch, b.r);
    for (let i = 0; i < stacked.length; i += 1) {
      const o = stacked[i];
      if (o === b || o.state !== "free") continue;
      const top = o.y + o.hy;
      if (top < out.top || bottom < top - 0.14 || bottom > top + 0.1) continue;
      const dx = b.x - o.x, dz = b.z - o.z;
      if (Math.abs(dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw)) < o.hx * 0.95 && Math.abs(dx * Math.sin(o.yaw) + dz * Math.cos(o.yaw)) < o.hz * 0.95) {
        out.top = top;
        out.kind = 4;
        out.conv = null;
        out.q = null;
        out.palletId = o.palletId;
      }
    }
    return out;
  }

  private recordProductSupport(b: Box, sup: typeof this.supportResult, dt: number) {
    if (sup.kind === 3 && sup.collectorId) {
      const collector = this.collectors.get(sup.collectorId);
      if (collector && !b.counted) {
        b.counted = true; collector.count += 1; this.stats.collected += 1;
        if (collector.count % 50 === 0) this.log(`${sup.collectorId}: ${collector.count} products received`, "ok");
      }
    }
    if (sup.kind === 3 || sup.kind === 4) {
      if (sup.palletId) {
        b.palletT += dt;
        if (b.palletId !== sup.palletId && b.palletT > 0.35) {
          b.palletId = sup.palletId;
          this.stats.placed += 1;
          this.stats.events.push(this.time);
          // Throughput only looks back 60 s, so older entries are dead weight that
          // used to grow without limit on long runs.
          if (this.stats.events.length > 4096) {
            const cutoff = this.time - 90;
            this.stats.events = this.stats.events.filter((t) => t > cutoff);
          }
        }
      }
    } else if (sup.kind === 1 && !b.lostCounted && b.age > 0.5) {
      b.lostCounted = true;
      this.stats.lost += 1;
    }
  }

  /** Look just in front of a dynamic walker's feet for a reachable stair tread.
   * This is a small step-up motor, not a teleport to an arbitrary upper floor. */
  private walkerStepHeight(human: HumanRT): number | undefined {
    const pose = this.rigidBodies.pose(human.id);
    if (!pose || !human.walking) return undefined;
    const dx = human.x - pose.position[0], dz = human.z - pose.position[2], distance = Math.hypot(dx, dz);
    if (distance < 1e-6) return undefined;
    const x = pose.position[0] + dx / distance * 0.27, z = pose.position[2] + dz / distance * 0.27;
    let target = pose.position[1];
    for (const entry of this.supportIndex.query(x, z, this.supportScratch)) {
      if (!entry.rect?.walkable) continue;
      const top = surfaceHeight(entry.rect, x, z);
      if (top !== null && top > target && top <= pose.position[1] + 0.26) target = top;
    }
    return target > pose.position[1] + .005 ? target : undefined;
  }

  /** Follow nearby stair treads/decks without snapping through an upper floor.
   * Navigation remains planar; the height is chosen only from reachable treads. */
  private updateHumanFloor(human: HumanRT, dt: number) {
    let target = 0;
    const supports = this.supportIndex.query(human.x, human.z, this.supportScratch);
    for (const entry of supports) {
      const rect = entry.rect;
      if (!rect?.walkable) continue;
      const height = surfaceHeight(rect, human.x, human.z);
      if (height !== null && height <= human.y + 0.3 && height >= human.y - 0.35 && height > target) target = height;
    }
    const maxMove = 3 * dt;
    human.y += Math.max(-maxMove, Math.min(maxMove, target - human.y));
  }

  private conveyorBoxGroups = new Map<string, Box[]>();
  private conveyorBoxPool: Box[][] = [];
  private emptyConveyorBoxes: Box[] = [];

  private addConveyorBox(box: Box) {
    let list = this.conveyorBoxGroups.get(box.convId);
    if (!list) {
      list = this.conveyorBoxPool.pop() ?? [];
      this.conveyorBoxGroups.set(box.convId, list);
    }
    list.push(box);
  }

  private physics(dt: number) {
    const boxes = this.boxes;
    // Group products by their last conveyor when enough products exist to
    // amortize the index. A previously processed product can change conveyor;
    // it is appended to its new group below, and stale entries are filtered by
    // the same state/support/id checks as the original full scan.
    const grouped = boxes.length >= 48;
    const groups = this.conveyorBoxGroups;
    for (const list of groups.values()) {
      list.length = 0;
      if (this.conveyorBoxPool.length < 512) this.conveyorBoxPool.push(list);
    }
    groups.clear();
    if (grouped) for (const box of boxes) if (box.state === "free" && box.support === 2) this.addConveyorBox(box);
    let floorBoxes = 0;
    for (const b of boxes) {
      const previousConveyor = grouped && b.state === "free" && b.support === 2 ? b.convId : null;
      b.age += dt;
      if (b.state === "held" || b.state === "inside" || b.state === "dead") continue;
      if (b.state === "dying") {
        b.fade -= dt * 2.5;
        if (b.fade <= 0) b.state = "dead";
        continue;
      }
      const prev = b.support;
      const sup = this.findSupport(b);
      if (prev === 2 && sup.kind === 2 && sup.conv?.id === b.convId && b.vy <= 0.05 && Math.abs(b.y - b.hy - sup.top) < 0.14) b.y = sup.top + b.hy;
      const bottom = b.y - b.hy;
      if (this.productIntegrator) {
        const grounded = bottom <= sup.top + 0.004 && b.vy <= 0.05;
        const conv = grounded && sup.kind === 2 ? sup.conv : null;
        const q = conv ? sup.q : null;
        let blocked = false;
        if (conv && q) {
          b.convId = conv.id; b.convS = q.s; b.convLat = q.lat;
          for (const o of (grouped ? groups.get(conv.id) ?? this.emptyConveyorBoxes : boxes)) {
            if (o === b || o.state !== "free" || o.support !== 2 || o.convId !== conv.id) continue;
            const ds = o.convS - q.s;
            if (ds > 0 && ds < b.r + o.r + 0.02 && Math.abs(o.convLat - q.lat) < b.r + o.r - 0.05) { blocked = true; break; }
          }
        }
        const gateLength = this.mergeRoutes.size && conv && q ? this.mergeStopLength(b, conv, q) : null;
        const landed = this.productIntegrator.integrate(b, {
          top: sup.top, kind: sup.kind, conveyor: !!(conv && q), lat: q?.lat ?? 0, tx: q?.tx ?? 0, tz: q?.tz ?? 0,
          along: q?.s ?? 0, speed: conv?.active ? conv.speed * (q?.speedFactor ?? 1) : 0, blocked, stopper: (conv?.stopper ?? false) || gateLength !== null,
          length: gateLength === null ? (conv?.length ?? 0) : Math.min(conv?.stopper ? conv.length : Infinity, gateLength),
        }, dt);
        if (landed && !(conv && q)) this.recordProductSupport(b, sup, dt);
      } else if (bottom <= sup.top + 0.004 && b.vy <= 0.05) {
        b.y = sup.top + b.hy;
        if (prev === 0 && b.vy < -1.3) b.vy = -b.vy * 0.12;
        else b.vy = 0;
        b.support = sup.kind;
        if (sup.kind === 2 && sup.conv && sup.q) {
          const conv = sup.conv;
          const q = sup.q;
          b.convId = conv.id;
          b.convS = q.s;
          b.convLat = q.lat;
          // belt accumulation: wait for the carton ahead instead of pushing into it
          let blocked = false;
          for (const o of (grouped ? groups.get(conv.id) ?? this.emptyConveyorBoxes : boxes)) {
            if (o === b || o.state !== "free" || o.support !== 2 || o.convId !== conv.id) continue;
            const ds = o.convS - q.s;
            if (ds > 0 && ds < b.r + o.r + 0.02 && Math.abs(o.convLat - q.lat) < b.r + o.r - 0.05) {
              blocked = true;
              break;
            }
          }
          const sp = conv.active && !blocked ? conv.speed * q.speedFactor : 0;
          const vlat = Math.max(-0.5, Math.min(0.5, -q.lat * 4));
          const dvx = q.tx * sp + -q.tz * vlat;
          const dvz = q.tz * sp + q.tx * vlat;
          const k = Math.min(1, 12 * dt);
          b.vx += (dvx - b.vx) * k;
          b.vz += (dvz - b.vz) * k;
          const target = Math.atan2(-q.tz, q.tx);
          b.yaw += wrapQuarter(target - b.yaw) * Math.min(1, 5 * dt);
          const gateLength = this.mergeRoutes.size ? this.mergeStopLength(b, conv, q) : null;
          if (conv.stopper || gateLength !== null) {
            const length = gateLength === null ? conv.length : Math.min(conv.stopper ? conv.length : Infinity, gateLength);
            const limit = length - 0.06 - b.r;
            if (q.s > limit) {
              const back = q.s - limit;
              b.x -= q.tx * back;
              b.z -= q.tz * back;
              const vn = b.vx * q.tx + b.vz * q.tz;
              if (vn > 0) {
                b.vx -= q.tx * vn;
                b.vz -= q.tz * vn;
              }
            }
          }
        } else {
          const sp = Math.hypot(b.vx, b.vz);
          if (sp > 0) {
            const next = Math.max(0, sp - 7 * dt);
            b.vx *= next / sp;
            b.vz *= next / sp;
          }
          this.recordProductSupport(b, sup, dt);
        }
        // spring the tilt back to flat
        b.tiltV += (-70 * b.tilt - 10 * b.tiltV) * dt;
        b.tilt += b.tiltV * dt;
        if (Math.abs(b.tilt) < 0.002 && Math.abs(b.tiltV) < 0.02) {
          b.tilt = 0;
          b.tiltV = 0;
        }
      } else {
        if (prev === 2) {
          const sp = Math.hypot(b.vx, b.vz);
          if (sp > 0.04) {
            b.ax = b.vz / sp;
            b.az = -b.vx / sp;
            b.tiltV = 1.6 + sp * 2.4;
          }
        }
        b.support = 0;
        b.vy -= G * dt;
        b.tilt = Math.min(1.25, b.tilt + b.tiltV * dt);
      }
      if (!this.productIntegrator) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
      }
      if (b.y >= 2.1) this.barrierScratch.length = 0;
      const nearby = b.y < 2.1 ? this.barrierIndex.query(b.x, b.z, this.barrierScratch, b.r + 0.5) : this.barrierScratch;
      for (let k = 0; k < nearby.length; k += 1) {
        const barrier = nearby[k];
        const ax = barrier.a[0], az = barrier.a[1];
        const sx = barrier.b[0] - ax, sz = barrier.b[1] - az;
        const len2 = sx * sx + sz * sz || 1;
        let u = ((b.x - ax) * sx + (b.z - az) * sz) / len2;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const qx = ax + u * sx, qz = az + u * sz;
        const ex = b.x - qx, ez = b.z - qz;
        const d = Math.sqrt(ex * ex + ez * ez);
        if (d > 1e-5 && d < b.r + 0.03) {
          const nx = ex / d, nz = ez / d;
          b.x = qx + nx * (b.r + 0.03); b.z = qz + nz * (b.r + 0.03);
          const dot = b.vx * nx + b.vz * nz;
          if (dot < 0) { b.vx -= dot * nx; b.vz -= dot * nz; }
        }
      }
      if (b.support === 1) floorBoxes += 1;
      if (b.y < -3 || Math.abs(b.x) > 80 || Math.abs(b.z) > 80) b.state = "dead";
      if (grouped && b.state === "free" && b.support === 2 && b.convId !== previousConveyor) this.addConveyorBox(b);
    }

    // box <-> box contacts (same layer). The grid keeps this near-linear: only the
    // handful of products in the neighbouring cells are compared.
    const n = boxes.length;
    for (let i = 0; i < n; i += 1) {
      const a = boxes[i];
      if (a.state !== "free") continue;
      const near = this.boxIndex.query(a.x, a.z, this.boxScratchContact, a.hx + a.hz + 1.5);
      for (let j = 0; j < near.length; j += 1) {
        const c = near[j];
        if (c === a || c.state !== "free" || c.id < a.id) continue;
        const dy = Math.abs(a.y - c.y);
        if (dy > (a.hy + c.hy) * 0.8) continue;
        if (Math.abs(c.x - a.x) > a.hx + a.hz + c.hx + c.hz || Math.abs(c.z - a.z) > a.hx + a.hz + c.hx + c.hz) continue;
        const contact = contactXZ(a, c);
        if (!contact) continue;
        const { nx, nz } = contact;
        const push = contact.depth * 0.5;
        a.x -= nx * push; a.z -= nz * push;
        c.x += nx * push; c.z += nz * push;
        const rel = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
        if (rel < 0) {
          const imp = rel * 0.5;
          a.vx += nx * imp;
          a.vz += nz * imp;
          c.vx -= nx * imp;
          c.vz -= nz * imp;
        }
      }
    }

    // cleanup / floor cap
    if (floorBoxes > 60) {
      let oldest: Box | null = null;
      for (const b of boxes) {
        if (b.state === "free" && b.support === 1 && (!oldest || b.age > oldest.age)) oldest = b;
      }
      if (oldest) {
        oldest.state = "dying";
        oldest.fade = 1;
      }
    }
    if (boxes.some((b) => b.state === "dead")) this.boxes = boxes.filter((b) => b.state !== "dead");
  }

  /* ----- derived metrics ----- */

  throughputPerMin() {
    const now = this.time;
    const window = Math.min(60, Math.max(10, now));
    const count = this.stats.events.filter((t) => t > now - 60).length;
    return (count * 60) / window;
  }
}

export const sim = new Engine();
if (typeof window !== "undefined") {
  (window as unknown as { __larp: Engine }).__larp = sim;
}
