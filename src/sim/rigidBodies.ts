import * as CANNON from "cannon-es";
import * as THREE from "three";
import type { SceneItem, Vec3 } from "../types";
import { importedModelSize, palletSize } from "../data/products";
import { samplePath } from "./spline";
import { upperFloorDimensions } from "../utils/upperFloor";
import { conveyorWidth } from "../utils/conveyor";
import { importedCollision, importedCollisionBoxes, importedCollisionRevision } from "../utils/modelCollision";
import { resolveContinuous, snapshotMotions, type SweepStart } from "./continuous";

/** Factory mechanisms remain controlled by the simulation, not the solver. */
type Shape = { size: Vec3; center: Vec3; rotation?: THREE.Quaternion };
const GROUP_DYNAMIC = 1, GROUP_FIXED = 2, GROUP_PRODUCT = 4;
const G = 9.81;
const bodyMaterial = new CANNON.Material({friction: .6, restitution: .03});
const walkerMaterial = new CANNON.Material({friction: 0, restitution: 0});
// Belt-driven workpieces already get tangential motion from the conveyor
// integrator. Ordinary solver friction would fight that motor to a standstill.
// Unspecified per-material friction lets this pair-specific setting apply while
// contacts involving equipment and other equipment keep normal friction.
const beltMaterial = new CANNON.Material("conveyor");
const productMaterial = new CANNON.Material({friction: .6, restitution: .03});
const v3 = (v: Vec3) => new CANNON.Vec3(v[0], v[1], v[2]);
const n = (value: unknown, fallback: number, min = 0.01, max = 1000) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
const qItem = (item: SceneItem) => new THREE.Quaternion().setFromEuler(new THREE.Euler((item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180, "XYZ"));
const cq = (q: THREE.Quaternion) => new CANNON.Quaternion(q.x, q.y, q.z, q.w);
const box = (size: Vec3, center: Vec3, rotation?: THREE.Quaternion): Shape => ({size, center, rotation});

function segment(a: THREE.Vector3, b: THREE.Vector3, width: number, thickness: number): Shape {
  const delta = b.clone().sub(a), middle = a.clone().add(b).multiplyScalar(0.5);
  return box([Math.max(0.02, delta.length()), thickness, width], [middle.x, middle.y, middle.z], new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), delta.normalize()));
}

/** Dimensions are local and represent stable, low-cost proxies for visual parts.
 * Open devices use compound parts so their working openings remain usable. */
function shapesFor(item: SceneItem, items: readonly SceneItem[]): Shape[] {
  const scale = ["conveyor", "roller", "fence"].includes(item.kind) ? 1 : n(item.scale, 1, .001, 1000);
  const scaled = (size: Vec3, center: Vec3) => box(size.map((x) => x * scale) as Vec3, center.map((x) => x * scale) as Vec3);
  if (item.kind === "conveyor" || item.kind === "roller") {
    const path = samplePath(item.points ?? [[-2, 0], [2, 0]], .1, item.pointHeights), parts: Shape[] = [];
    const width = conveyorWidth(item), last = path.x.length - 1;
    // Weld consecutive collinear samples into one collider: separate boxes on a
    // straight run expose seams that catch dynamic props and make them jitter.
    // Curves retain short segments; long paths remain bounded to 128 sections.
    const stride = Math.max(1, Math.ceil(last / 128));
    for (let i = 0; i < last;) {
      const start = new THREE.Vector3(path.x[i], .58 + path.y[i], path.z[i]);
      const first = Math.min(last, i + stride);
      const direction = new THREE.Vector3(path.x[first] - path.x[i], path.y[first] - path.y[i], path.z[first] - path.z[i]).normalize();
      let j = first;
      while (j < last) {
        const next = Math.min(last, j + stride);
        const delta = new THREE.Vector3(path.x[next] - path.x[j], path.y[next] - path.y[j], path.z[next] - path.z[j]).normalize();
        if (direction.dot(delta) < .9999) break;
        j = next;
      }
      parts.push(segment(start, new THREE.Vector3(path.x[j], .58 + path.y[j], path.z[j]), width, .16));
      i = j;
    }
    const legStride = Math.max(14, Math.ceil(path.x.length / 64));
    for (let i = Math.min(5, path.x.length - 1); i < path.x.length - 1; i += legStride) {
      const h = Math.max(.05, .44 + path.y[i]);
      for (const side of [-1, 1]) parts.push(box([.09, h, .09], [path.x[i] - path.tz[i] * side * Math.max(.05, width / 2 - .04), h / 2, path.z[i] + path.tx[i] * side * Math.max(.05, width / 2 - .04)]));
    }
    return parts;
  }
  if (item.kind === "fence") {
    const pts = item.points ?? [[-1.5, 0], [1.5, 0]], parts: Shape[] = [], height = n(item.props.height, 2, .2, 8);
    for (let i = 0; i < pts.length - 1; i++) {
      if (item.props.gateOpen === true && i === Number(item.props.gateSegment ?? 0)) continue;
      parts.push(segment(new THREE.Vector3(pts[i][0], height / 2, pts[i][1]), new THREE.Vector3(pts[i + 1][0], height / 2, pts[i + 1][1]), .08, height));
    }
    return parts.length ? parts : [box([.05, .05, .05], [0, 0, 0])];
  }
  if (item.kind === "platform") {
    const {width: w, depth: d, height: h} = upperFloorDimensions(item);
    const parts = [scaled([w, .2, d], [0, h - .1, 0])];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push(scaled([.18, Math.max(.05, h - .2), .18], [x * (w / 2 - .12), (h - .2) / 2, z * (d / 2 - .12)]));
    return parts;
  }
  if (item.kind === "stairs") {
    const {width: w, length: l, height: h, steps: count} = upperFloorDimensions(item);
    const run = l / count, rise = h / count;
    return Array.from({length: count}, (_, i) => scaled([run, rise * (i + 1), w], [-l / 2 + (i + .5) * run, (i + 1) * rise / 2, 0]));
  }
  if (item.kind === "laser") {
    const range=n(item.props.range,3,.2,1000), height=item.props.mountedTo ? .1 : .85;
    return [-1,1].map(side=>scaled([.14,height+.1,.14],[side*range/2,(height+.1)/2,0]));
  }
  if (item.kind === "sensor" && item.props.mountedTo) return [scaled([.12,.2,.12],[0,.1,0])];
  if (item.kind === "feeder") {
    const parts = [scaled([1.05, .28, .8], [0, 1.85, 0])];
    for (const x of [-.48, .48]) for (const z of [-.34, .34]) parts.push(scaled([.08, 1.7, .08], [x, .85, z]));
    return parts;
  }
  if (item.kind === "crates") {
    const [w, d] = palletSize(item.props, items);
    return [scaled([w, .15, d], [0, .075, 0])];
  }
  if (item.kind === "collector") {
    const w = n(item.props.width, 1, .4, 20), d = n(item.props.depth, .8, .4, 20), h = n(item.props.height, .55, .2, 8);
    return [scaled([w, .08, d], [0, .04, 0]), ...[-1, 1].flatMap((side) => [scaled([.05, h, d], [side * w / 2, h / 2, 0]), scaled([w, h, .05], [0, h / 2, side * d / 2])])];
  }
  if (item.kind === "imported-model" && item.imported) {
    const collision = importedCollisionBoxes(item.imported, scale);
    if (collision?.length) return collision.map((part) => box(part.size, part.center));
    const size = importedModelSize(item.imported, scale);
    return [box(size, [0, size[1] / 2, 0])];
  }
  if (["robot", "cobot", "kuka", "fanuc"].includes(item.kind)) return [scaled([.95, .35, .95], [0, .175, 0])];
  const dims: Partial<Record<SceneItem["kind"], Vec3>> = {
    cnc: [2, 2.6, 1.8], press: [2, 2.8, 1.8], weld: [2, 2.5, 1.7], packaging: [2, 2.3, 1.6],
    paint: [2.4, 2.6, 1.7], cutter: [2, 2.2, 1.6], inspection: [1.7, 2.2, 1.45], assembly: [2, 2, 1.6], kiln: [2.6, 2.1, 1.5], lathe: [2, 2.4, 1.8], grinder: [2, 2.3, 1.8],
    amr: [1.4, .6, 1], forklift: [1.7, 2.1, 1.1], rack: [2.4, 3.1, .9], cabinet: [1.1, 2, .7], wall: [6, 4, .2],
    operator: [.5, 1.8, .4], "mobile-robot": [1.2, 1.4, .9], button: [.35, 1.2, .35], laser: [.3, 1.5, .3], sensor: [.3, 1.3, .3], plc: [.65, 1.7, .45], light: [.3, 3, .3], "light-panel": [.4, 4.2, .4], "light-flood": [.4, 4.5, .4],
  };
  const size = dims[item.kind] ?? [1, 1, 1];
  return [scaled(size, [0, size[1] / 2, 0])];
}

function selectedShapes(item: SceneItem, items: readonly SceneItem[]): Shape[] {
  const shapes = shapesFor(item, items);
  if (item.props.collisionShape !== "box" || shapes.length <= 1) return shapes;
  const bounds = new THREE.Box3();
  for (const shape of shapes) {
    const half = new THREE.Vector3(...shape.size).multiplyScalar(.5);
    const rotation = shape.rotation ?? new THREE.Quaternion();
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const corner = new THREE.Vector3(x * half.x, y * half.y, z * half.z).applyQuaternion(rotation).add(new THREE.Vector3(...shape.center));
      bounds.expandByPoint(corner);
    }
  }
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  return [box([size.x,size.y,size.z], [center.x,center.y,center.z])];
}

/** Intersect a finite laser segment with the same oriented compound proxies used
 * by physics. Precomputed at scene sync; includes static and dynamic equipment. */
export function makeBeamBlocker(item: SceneItem, items: readonly SceneItem[]) {
  const shapes = selectedShapes(item, items);
  const inverseItem = qItem(item).invert();
  const origin = new THREE.Vector3(...item.position);
  const inverseShapes = shapes.map(shape => shape.rotation?.clone().invert());
  return (from: Vec3, to: Vec3) => {
    const a = new THREE.Vector3(...from).sub(origin).applyQuaternion(inverseItem);
    const b = new THREE.Vector3(...to).sub(origin).applyQuaternion(inverseItem);
    for (let i=0;i<shapes.length;i++) {
      const shape=shapes[i], center=new THREE.Vector3(...shape.center);
      const p=a.clone().sub(center), q=b.clone().sub(center);
      if(inverseShapes[i]) { p.applyQuaternion(inverseShapes[i]!); q.applyQuaternion(inverseShapes[i]!); }
      let near=0, far=1;
      for (const [axis,half] of [['x',shape.size[0]/2],['y',shape.size[1]/2],['z',shape.size[2]/2]] as const) {
        const d=q[axis]-p[axis];
        if(Math.abs(d)<1e-9) { if(Math.abs(p[axis])>half){near=2;break;} continue; }
        let lo=(-half-p[axis])/d, hi=(half-p[axis])/d;
        if(lo>hi) [lo,hi]=[hi,lo]; near=Math.max(near,lo); far=Math.min(far,hi);
        if(near>far) break;
      }
      if(near<=far && near<=1 && far>=0) return true;
    }
    return false;
  };
}

export interface RigidPose { position: Vec3; rotationX: number; rotation: number; rotationZ: number }
interface Entry { body: CANNON.Body; center: CANNON.Vec3; shapeKey: string; poseKey: string; dynamic: boolean }
interface ProductProxy { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; hx: number; hy: number; hz: number; state: string; productId: string }

export class RigidBodyWorld {
  readonly world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0), allowSleep: true });
  private entries = new Map<string, Entry>();
  private products = new Map<number, CANNON.Body>();
  private productShapes = new WeakMap<CANNON.Body, string>();
  private tempQuat = new THREE.Quaternion();
  private lastItems: readonly SceneItem[] = [];
  private sweepWorld = false;
  private collisionRevision = importedCollisionRevision();
  private collisionIds = new WeakMap<object, number>();
  private nextCollisionId = 1;

  private collisionId(item?: SceneItem) {
    const collision = item?.imported && importedCollision(item.imported);
    if (!collision) return 0;
    let id = this.collisionIds.get(collision);
    if (!id) { id = this.nextCollisionId++; this.collisionIds.set(collision,id); }
    return id;
  }
  private euler = new THREE.Euler();
  dynamicCount = 0;
  active = false;

  constructor() {
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = .35;
    this.world.defaultContactMaterial.restitution = .03;
    this.world.addContactMaterial(new CANNON.ContactMaterial(beltMaterial, productMaterial, {friction: 0, restitution: .03}));
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    const floor = new CANNON.Body({ mass: 0, material: bodyMaterial, collisionFilterGroup: GROUP_FIXED, collisionFilterMask: GROUP_DYNAMIC });
    floor.addShape(new CANNON.Plane()); floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(floor);
  }

  private productCollider(item: SceneItem) {
    // Powered belt contacts are solved by the conveyor integrator. Other
    // explicitly kinematic or tilted shapes use the full rotated collider.
    return !["conveyor", "roller"].includes(item.kind) &&
      (item.props.physicsMode === "kinematic" || Math.abs(item.rotationX ?? 0) > 1e-6 || Math.abs(item.rotationZ ?? 0) > 1e-6);
  }

  private shapeKey(item: SceneItem, items: readonly SceneItem[]) {
    return JSON.stringify([item.kind, item.scale, item.points, item.pointHeights, item.props.physicsMode, item.props.physicsMass, this.productCollider(item),
      item.props.width, item.props.depth, item.props.height, item.props.length, item.props.collisionShape, item.props.gateOpen, item.props.gateSegment,
      item.props.product, item.props.cols, item.props.rows, item.props.gap, item.kind === "crates" ? palletSize(item.props, items) : null, item.imported?.sourceSize, item.imported?.units, item.imported?.axis, this.collisionId(item)]);
  }

  sync(items: readonly SceneItem[]) {
    this.lastItems = items;
    this.collisionRevision = importedCollisionRevision();
    this.dynamicCount = items.filter((item) => item.visible !== false && item.props.physicsMode === "dynamic").length;
    this.active = this.dynamicCount > 0 || items.some((item) => item.visible !== false && this.productCollider(item));
    const keep = new Set<string>();
    // Ordinary legacy factories retain their zero-overhead conveyor fast path.
    if (this.active || this.sweepWorld) for (const item of items) {
      if (item.visible === false) continue;
      keep.add(item.id);
      const shapeKey = this.shapeKey(item, items), poseKey = JSON.stringify([item.position, item.rotationX, item.rotation, item.rotationZ]);
      const dynamic = item.props.physicsMode === "dynamic";
      let entry = this.entries.get(item.id);
      if (!entry || entry.shapeKey !== shapeKey) {
        const previous = entry;
        if (entry) this.world.removeBody(entry.body);
        const shapes = selectedShapes(item, items);
        const total = shapes.reduce((sum, s) => sum + s.size[0] * s.size[1] * s.size[2], 0) || 1;
        const center = new CANNON.Vec3();
        for (const s of shapes) {
          const ratio = s.size[0] * s.size[1] * s.size[2] / total;
          center.x += s.center[0] * ratio; center.y += s.center[1] * ratio; center.z += s.center[2] * ratio;
        }
        const material = item.kind === "operator" || item.kind === "mobile-robot" ? walkerMaterial : item.kind === "conveyor" || item.kind === "roller" ? beltMaterial : bodyMaterial;
        const body = new CANNON.Body({material, mass: dynamic ? n(item.props.physicsMass, item.kind === "imported-model" ? 1 : 10, .01, 1_000_000) : 0,
          type: dynamic ? CANNON.Body.DYNAMIC : CANNON.Body.KINEMATIC,
          collisionFilterGroup: dynamic ? GROUP_DYNAMIC : GROUP_FIXED,
          collisionFilterMask: dynamic ? GROUP_DYNAMIC | GROUP_FIXED | GROUP_PRODUCT : GROUP_DYNAMIC | (this.productCollider(item) ? GROUP_PRODUCT : 0),
          allowSleep: true, sleepSpeedLimit: .15, sleepTimeLimit: .4, linearDamping: .02, angularDamping: .08,
          fixedRotation: item.kind === "operator" || item.kind === "mobile-robot"});
        for (const s of shapes) body.addShape(new CANNON.Box(v3(s.size.map((v) => Math.max(.005, v / 2)) as Vec3)), v3([s.center[0] - center.x, s.center[1] - center.y, s.center[2] - center.z]), s.rotation ? cq(s.rotation) : undefined);
        entry = {body, center, shapeKey, poseKey, dynamic};
        this.setPose(entry, item);
        // Edits to non-pose settings retain a moving component's current state.
        if (previous && previous.dynamic && dynamic && previous.poseKey === poseKey) {
          const oldPose = this.poseOf(previous);
          this.setPose(entry, {...item, ...oldPose});
          body.velocity.copy(previous.body.velocity); body.angularVelocity.copy(previous.body.angularVelocity);
        }
        this.world.addBody(body); this.entries.set(item.id, entry);
      } else if (entry.poseKey !== poseKey) {
        entry.poseKey = poseKey; this.setPose(entry, item);
        entry.body.velocity.setZero(); entry.body.angularVelocity.setZero(); entry.body.wakeUp();
      }
    }
    for (const [id, entry] of this.entries) if (!keep.has(id)) { this.world.removeBody(entry.body); this.entries.delete(id); }
    if (!this.active && !this.sweepWorld) this.clearProducts();
  }

  private setPose(entry: Entry, item: SceneItem) {
    const q = qItem(item); entry.body.quaternion.copy(cq(q));
    const center = entry.body.quaternion.vmult(entry.center);
    entry.body.position.set(item.position[0] + center.x, item.position[1] + center.y, item.position[2] + center.z);
    entry.body.aabbNeedsUpdate = true;
  }

  private poseOf(entry: Entry): RigidPose {
    const {body, center} = entry, offset = body.quaternion.vmult(center);
    this.tempQuat.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    this.euler.setFromQuaternion(this.tempQuat, "XYZ");
    return {position: [body.position.x - offset.x, body.position.y - offset.y, body.position.z - offset.z],
      rotationX: this.euler.x * 180 / Math.PI, rotation: this.euler.y * 180 / Math.PI, rotationZ: this.euler.z * 180 / Math.PI};
  }

  pose(id: string): RigidPose | null {
    const entry = this.entries.get(id);
    return entry?.dynamic ? this.poseOf(entry) : null;
  }

  /** A dynamic pedestrian retains its navigation motor while vertical motion
   * and collisions remain solver-owned. */
  drive(id: string, x: number, z: number, dt: number, stepHeight?: number) {
    const entry = this.entries.get(id);
    if (!entry?.dynamic || dt <= 0) return;
    const pose = this.poseOf(entry);
    if (stepHeight !== undefined && stepHeight > pose.position[1] && stepHeight - pose.position[1] <= .26) {
      entry.body.position.y += stepHeight - pose.position[1] + .01;
      entry.body.velocity.y = Math.max(0, entry.body.velocity.y);
      entry.body.aabbNeedsUpdate = true;
    }
    entry.body.velocity.x = Math.max(-3, Math.min(3, (x - pose.position[0]) / dt));
    entry.body.velocity.z = Math.max(-3, Math.min(3, (z - pose.position[2]) / dt));
    entry.body.wakeUp();
  }

  /** A kinematic pedestrian is task-driven but its collider must follow its
   * animated feet so other dynamic bodies see the live position. */
  followWalker(id: string, item: SceneItem, x: number, y: number, z: number, yaw: number) {
    const entry = this.entries.get(id);
    if (!entry || entry.dynamic) return;
    this.setPose(entry, {...item, position: [x, y, z], rotation: yaw * 180 / Math.PI});
  }

  hasAwakeBodies() {
    for (const entry of this.entries.values()) if (entry.dynamic && entry.body.sleepState !== CANNON.Body.SLEEPING) return true;
    return false;
  }

  /** Public for diagnostics and deterministic tests. */
  body(id: string) { return this.entries.get(id)?.body; }

  private clearProducts() { for (const body of this.products.values()) this.world.removeBody(body); this.products.clear(); }

  /** Build the dormant collision world only if a legacy workpiece travels far
   * enough in one step to need CCD. Normal legacy factories keep their fast path. */
  shouldStep(boxes: readonly ProductProxy[], dt: number) {
    if (this.active) return true;
    const dt2 = dt * dt;
    const fast = boxes.some((part) => {
      if (part.state !== "free") return false;
      const threshold = Math.max(
        0,
        Math.max(0.005, Math.min(part.hx, part.hy, part.hz)) * 0.75 - G * dt2,
      );
      return (
        (part.vx * part.vx + part.vy * part.vy + part.vz * part.vz) * dt2 >
        threshold * threshold
      );
    });
    if (fast && !this.sweepWorld) {
      this.sweepWorld = true;
      this.sync(this.lastItems);
    }
    return fast;
  }

  step(
    dt: number,
    boxes: readonly ProductProxy[],
    massOf: (id: string) => number,
    sourceOf?: (id: string) => SceneItem | undefined,
    previous?: ReadonlyMap<number, SweepStart>,
  ) {
    if (!this.shouldStep(boxes, dt)) return;
    if (this.collisionRevision !== importedCollisionRevision())
      this.sync(this.lastItems);
    const live = new Set<number>(),
      reverse = new Map<CANNON.Body, ProductProxy>(),
      starts = new Map<CANNON.Body, SweepStart>();
    for (const part of boxes) {
      if (part.state !== "free") continue;
      live.add(part.id);
      const mass = massOf(part.productId);
      const source = sourceOf?.(part.productId);
      const shapeKey = `${part.hx},${part.hy},${part.hz},${mass},${this.collisionId(source)},${source?.imported?.axis},${source?.imported?.units},${source?.props.collisionShape}`;
      let body = this.products.get(part.id);
      if (body && this.productShapes.get(body) !== shapeKey) {
        this.world.removeBody(body);
        this.products.delete(part.id);
        body = undefined;
      }
      if (!body) {
        body = new CANNON.Body({
          material: productMaterial,
          mass: n(mass, 1, 0.01, 1_000_000),
          fixedRotation: true,
          linearDamping: 0,
          angularDamping: 0,
          collisionFilterGroup: GROUP_PRODUCT,
          collisionFilterMask: GROUP_DYNAMIC | GROUP_FIXED,
          allowSleep: false,
        });
        const model = source?.imported;
        const collision = model && source?.props.collisionShape !== "box" ? importedCollisionBoxes(model) : null;
        if (model && collision?.length) {
          // Products keep their spawn-time dimensions, even if the source is edited.
          const sourceSize = importedModelSize(model);
          const ratio = [
            (part.hx * 2) / sourceSize[0],
            (part.hy * 2) / sourceSize[1],
            (part.hz * 2) / sourceSize[2],
          ];
          for (const shape of collision) {
            const size = shape.size.map((v, i) => v * ratio[i]);
            const center = shape.center.map((v, i) => v * ratio[i]);
            center[1] -= part.hy;
            body.addShape(
              new CANNON.Box(
                new CANNON.Vec3(
                  Math.max(0.005, size[0] / 2),
                  Math.max(0.005, size[1] / 2),
                  Math.max(0.005, size[2] / 2),
                ),
              ),
              new CANNON.Vec3(center[0], center[1], center[2]),
            );
          }
        } else
          body.addShape(
            new CANNON.Box(new CANNON.Vec3(part.hx, part.hy, part.hz)),
          );
        this.productShapes.set(body, shapeKey);
        this.world.addBody(body);
        this.products.set(part.id, body);
      }
      reverse.set(body, part);
      const start = previous?.get(part.id);
      if (start) starts.set(body, start);
      // Workpieces already advance in the conveyor/robot integrator. Rewind the
      // predicted motion for this contact pass and cancel the solver's gravity.
      body.position.set(
        part.x - part.vx * dt,
        part.y - part.vy * dt,
        part.z - part.vz * dt,
      );
      body.velocity.set(part.vx, part.vy, part.vz);
      body.force.set(0, body.mass * G, 0);
      body.quaternion.setFromEuler(0, part.yaw, 0);
      body.aabbNeedsUpdate = true;
    }
    for (const [id, body] of this.products)
      if (!live.has(id)) {
        this.world.removeBody(body);
        this.products.delete(id);
      }
    const motions = snapshotMotions(this.world, dt, starts);
    this.world.step(dt);
    const swept = resolveContinuous(this.world, motions, dt, (a, b) => {
      // Fast legacy products get swept against physical scene geometry and
      // each other, while ordinary-speed contacts keep the conveyor fast path.
      if (reverse.has(a) || reverse.has(b)) return true;
      return !!(
        a.collisionFilterGroup & b.collisionFilterMask &&
        b.collisionFilterGroup & a.collisionFilterMask
      );
    });
    // Only transfer impulses for actual component contacts. Existing conveyor,
    // stack and robot behavior is otherwise unchanged.
    const touched = swept;
    for (const contact of this.world.contacts) {
      if (
        reverse.has(contact.bi) &&
        contact.bj.collisionFilterGroup !== GROUP_PRODUCT
      )
        touched.add(contact.bi);
      if (
        reverse.has(contact.bj) &&
        contact.bi.collisionFilterGroup !== GROUP_PRODUCT
      )
        touched.add(contact.bj);
    }
    for (const body of touched) {
      const part = reverse.get(body);
      if (!part) continue;
      part.x = body.position.x;
      part.y = body.position.y;
      part.z = body.position.z;
      part.vx = body.velocity.x;
      part.vy = body.velocity.y;
      part.vz = body.velocity.z;
    }
  }

  reset(items: readonly SceneItem[]) {
    for (const entry of this.entries.values()) this.world.removeBody(entry.body);
    this.entries.clear(); this.clearProducts(); this.sweepWorld = false; this.sync(items);
  }
}
