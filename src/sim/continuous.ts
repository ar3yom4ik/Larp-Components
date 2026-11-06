import * as CANNON from "cannon-es";
import * as THREE from "three";

/** Swept oriented-box CCD for the compound shapes used by the factory solver.
 * Translation is solved by continuous SAT (all face and edge axes). Angular
 * movement is split into short intervals and conservatively inflated by each
 * shape's maximum rotational excursion. Existing overlaps remain the regular
 * solver's responsibility. A hit is clamped to the earliest time of impact;
 * the remaining fraction of that exceptional step is intentionally deferred. */
export interface SweepStart {
  position: [number, number, number];
  yaw?: number;
}
type Motion = {
  body: CANNON.Body;
  start: THREE.Vector3;
  end: THREE.Vector3;
  q0: THREE.Quaternion;
  q1: THREE.Quaternion;
  angle: number;
  fast: boolean;
  min: THREE.Vector3;
  max: THREE.Vector3;
};
type OBB = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  axes: THREE.Vector3[];
  half: THREE.Vector3;
};
type Hit = {
  time: number;
  normal: THREE.Vector3;
  a: Motion;
  b: Motion;
  angular: boolean;
};
const vector = (v: CANNON.Vec3) => new THREE.Vector3(v.x, v.y, v.z);
const quat = (q: CANNON.Quaternion) => new THREE.Quaternion(q.x, q.y, q.z, q.w);
const basis = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];
const small = 1e-8;

function minFeature(body: CANNON.Body) {
  let feature = Infinity;
  for (const shape of body.shapes)
    if (shape instanceof CANNON.Box) {
      const h = shape.halfExtents;
      feature = Math.min(feature, h.x, h.y, h.z);
    }
  return Number.isFinite(feature) ? Math.max(0.005, feature) : 0.1;
}
/** Only fast-moving bodies need an expensive sweep; ordinary contacts still
 * use Cannon's solver. Includes acceleration so a first high-force step counts. */
export function needsContinuous(
  body: CANNON.Body,
  dt: number,
  gravity: CANNON.Vec3,
) {
  if (
    body.type !== CANNON.Body.DYNAMIC ||
    body.sleepState === CANNON.Body.SLEEPING
  )
    return false;
  const speed = body.velocity.length() * dt;
  const acceleration =
    (body.force.length() * body.invMass + gravity.length()) * dt * dt;
  const angular = body.angularVelocity.length() * dt * body.boundingRadius;
  return speed + acceleration + angular > minFeature(body) * 0.75;
}

/** Snapshot before the discrete step; optionally use the actual previous
 * workpiece position instead of the conveyor bridge's reconstructed start. */
export function snapshotMotions(
  world: CANNON.World,
  dt: number,
  starts?: Map<CANNON.Body, SweepStart>,
): Motion[] | null {
  if (!world.bodies.some((body) => needsContinuous(body, dt, world.gravity)))
    return null;
  return world.bodies
    .filter((body) => body.shapes.some((s) => s instanceof CANNON.Box))
    .map((body) => {
      const start = starts?.get(body),
        p = start
          ? new THREE.Vector3(...start.position)
          : vector(body.position);
      const q =
        start?.yaw === undefined
          ? quat(body.quaternion)
          : new THREE.Quaternion().setFromAxisAngle(basis[1], start.yaw);
      return {
        body,
        start: p,
        end: p.clone(),
        q0: q,
        q1: q.clone(),
        angle: 0,
        fast: false,
        min: new THREE.Vector3(),
        max: new THREE.Vector3(),
      };
    });
}

function shapeBox(m: Motion, i: number, t0: number, t1: number): OBB {
  const body = m.body,
    shape = body.shapes[i] as CANNON.Box;
  const qStart = m.q0.clone().slerp(m.q1, t0),
    qEnd = m.q0.clone().slerp(m.q1, t1),
    qMid = m.q0.clone().slerp(m.q1, (t0 + t1) / 2);
  const offset = vector(body.shapeOffsets[i]);
  const a = m.start
    .clone()
    .lerp(m.end, t0)
    .add(offset.clone().applyQuaternion(qStart));
  const b = m.start
    .clone()
    .lerp(m.end, t1)
    .add(offset.clone().applyQuaternion(qEnd));
  const orientation = qMid.multiply(quat(body.shapeOrientations[i]));
  const axes = basis.map((axis) => axis.clone().applyQuaternion(orientation));
  const h = shape.halfExtents;
  const expand =
    2 *
    (offset.length() + Math.hypot(h.x, h.y, h.z)) *
    Math.sin((m.angle * (t1 - t0)) / 4);
  return {
    a,
    b,
    axes,
    half: new THREE.Vector3(h.x + expand, h.y + expand, h.z + expand),
  };
}
function projectionRadius(box: OBB, axis: THREE.Vector3) {
  return (
    Math.abs(axis.dot(box.axes[0])) * box.half.x +
    Math.abs(axis.dot(box.axes[1])) * box.half.y +
    Math.abs(axis.dot(box.axes[2])) * box.half.z
  );
}
function axesFor(a: OBB, b: OBB) {
  const axes = [...a.axes, ...b.axes];
  for (const x of a.axes)
    for (const y of b.axes) {
      const axis = new THREE.Vector3().crossVectors(x, y),
        length = axis.length();
      if (length > small) axes.push(axis.multiplyScalar(1 / length));
    }
  return axes;
}
/** Negative depth means separated. */
function initialOverlap(a: OBB, b: OBB) {
  const d = b.a.clone().sub(a.a);
  let depth = Infinity;
  for (const axis of axesFor(a, b)) {
    const overlap =
      projectionRadius(a, axis) +
      projectionRadius(b, axis) -
      Math.abs(d.dot(axis));
    if (overlap < depth) depth = overlap;
    if (depth < -0.001) return depth;
  }
  return depth;
}
function sweepBoxes(
  a: OBB,
  b: OBB,
  rotation: boolean,
): { time: number; normal: THREE.Vector3 } | null {
  const d = b.a.clone().sub(a.a),
    relative = b.b.clone().sub(b.a).sub(a.b.clone().sub(a.a));
  let enter = -Infinity,
    exit = Infinity,
    normal = new THREE.Vector3(),
    closest = Infinity,
    closestNormal = new THREE.Vector3();
  for (const axis of axesFor(a, b)) {
    const radius = projectionRadius(a, axis) + projectionRadius(b, axis),
      p = d.dot(axis),
      v = relative.dot(axis);
    const overlap = radius - Math.abs(p);
    if (overlap < closest) {
      closest = overlap;
      closestNormal = axis.clone().multiplyScalar(p >= 0 ? -1 : 1);
    }
    if (Math.abs(v) < small) {
      if (Math.abs(p) > radius) return null;
      continue;
    }
    let first = (-radius - p) / v,
      last = (radius - p) / v;
    if (first > last) [first, last] = [last, first];
    if (first > enter) {
      enter = first;
      const at = p + v * first;
      normal = axis.clone().multiplyScalar(at >= 0 ? -1 : 1);
    }
    exit = Math.min(exit, last);
    if (enter > exit) return null;
  }
  if (exit < 0 || enter > 1) return null;
  if (enter < 0) {
    normal = closestNormal;
    // Touching and moving apart/sliding is not a new impact. Angular motion
    // still gets a conservative stop when a rotating corner can reach a face.
    const approach = a.b.clone().sub(a.a).sub(b.b.clone().sub(b.a)).dot(normal);
    if (!rotation && approach >= -1e-5) return null;
    enter = 0;
  }
  return { time: Math.max(0, enter), normal };
}
function sweptBounds(m: Motion) {
  const min = m.min.set(Infinity, Infinity, Infinity),
    max = m.max.set(-Infinity, -Infinity, -Infinity);
  for (let i = 0; i < m.body.shapes.length; i++)
    if (m.body.shapes[i] instanceof CANNON.Box) {
      const box = shapeBox(m, i, 0, 1);
      const ex = projectionRadius(box, basis[0]),
        ey = projectionRadius(box, basis[1]),
        ez = projectionRadius(box, basis[2]);
      min.min(
        new THREE.Vector3(
          Math.min(box.a.x, box.b.x) - ex,
          Math.min(box.a.y, box.b.y) - ey,
          Math.min(box.a.z, box.b.z) - ez,
        ),
      );
      max.max(
        new THREE.Vector3(
          Math.max(box.a.x, box.b.x) + ex,
          Math.max(box.a.y, box.b.y) + ey,
          Math.max(box.a.z, box.b.z) + ez,
        ),
      );
    }
}
function intersects(a: Motion, b: Motion) {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  );
}
function boxesMayMeet(a: OBB, b: OBB) {
  for (const [i, axis] of basis.entries()) {
    const key = (["x", "y", "z"] as const)[i],
      ra = projectionRadius(a, axis),
      rb = projectionRadius(b, axis);
    if (
      Math.min(a.a[key], a.b[key]) - ra > Math.max(b.a[key], b.b[key]) + rb ||
      Math.min(b.a[key], b.b[key]) - rb > Math.max(a.a[key], a.b[key]) + ra
    )
      return false;
  }
  return true;
}
function pairHit(a: Motion, b: Motion): Hit | null {
  if (!intersects(a, b)) return null;
  // An overlap narrower than one combined half-feature cannot cross all the
  // way through this pair in a step; let the ordinary contact solver handle
  // it. This also avoids false angular hits on loads riding rotating belts.
  const relative = a.end
    .clone()
    .sub(a.start)
    .sub(b.end.clone().sub(b.start))
    .length();
  if (
    relative +
      a.angle * a.body.boundingRadius +
      b.angle * b.body.boundingRadius <=
    minFeature(a.body) + minFeature(b.body)
  )
    return null;
  const steps = Math.max(
    1,
    Math.ceil(Math.max(a.angle, b.angle) / (Math.PI / 12)),
  );
  const shapes = (m: Motion) =>
    m.body.shapes.flatMap((shape, i) =>
      shape instanceof CANNON.Box
        ? [{ i, bounds: shapeBox(m, i, 0, 1), initial: shapeBox(m, i, 0, 0) }]
        : [],
    );
  const as = shapes(a),
    bs = shapes(b);
  let best: Hit | null = null;
  for (const ap of as)
    for (const bp of bs) {
      if (!boxesMayMeet(ap.bounds, bp.bounds)) continue;
      // Initially embedded shapes should be resolved by the normal solver,
      // rather than rewinding them to an invented time of impact.
      const overlap = initialOverlap(ap.initial, bp.initial);
      if (
        overlap > 0.005 ||
        ((a.angle > 1e-4 || b.angle > 1e-4) && overlap >= -0.005)
      )
        continue;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps,
          t1 = (s + 1) / steps;
        const first = shapeBox(a, ap.i, t0, t1),
          second = shapeBox(b, bp.i, t0, t1);
        if (!boxesMayMeet(first, second)) continue;
        const result = sweepBoxes(
          first,
          second,
          a.angle > 1e-4 || b.angle > 1e-4,
        );
        if (!result) continue;
        const time = t0 + (t1 - t0) * result.time;
        if (!best || time < best.time)
          best = {
            time,
            normal: result.normal,
            a,
            b,
            angular: a.angle > 1e-4 || b.angle > 1e-4,
          };
        break;
      }
    }
  return best;
}
function floorHit(a: Motion): Hit | null {
  let best: Hit | null = null;
  const steps = Math.max(1, Math.ceil(a.angle / (Math.PI / 12)));
  for (let i = 0; i < a.body.shapes.length; i++)
    if (a.body.shapes[i] instanceof CANNON.Box) {
      const initial = shapeBox(a, i, 0, 0),
        initialBottom = initial.a.y - projectionRadius(initial, basis[1]);
      // Already resting/overlapping floor: the discrete solver handles it.
      if (initialBottom <= 0.005) continue;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps,
          t1 = (s + 1) / steps,
          box = shapeBox(a, i, t0, t1),
          r = projectionRadius(box, basis[1]);
        const from = box.a.y - r,
          to = box.b.y - r;
        if (to > 0 && from > 0) continue;
        const u = from <= 0 ? 0 : Math.max(0, Math.min(1, from / (from - to)));
        const time = t0 + (t1 - t0) * u;
        const dummy = { ...a, body: null as unknown as CANNON.Body };
        if (!best || time < best.time)
          best = {
            time,
            normal: basis[1].clone(),
            a,
            b: dummy,
            angular: a.angle > 1e-4,
          };
        break;
      }
    }
  return best;
}
function clampToImpact(m: Motion, time: number) {
  const body = m.body;
  if (!body || body.type !== CANNON.Body.DYNAMIC) return;
  // A tiny clearance keeps the next discrete contact from starting deeply embedded.
  const t = Math.max(0, time - 1e-5);
  const p = m.start.clone().lerp(m.end, t),
    q = m.q0.clone().slerp(m.q1, t);
  body.position.set(p.x, p.y, p.z);
  body.quaternion.set(q.x, q.y, q.z, q.w);
  body.aabbNeedsUpdate = true;
  body.wakeUp();
  m.end.copy(p);
  m.q1.copy(q);
  m.angle = m.q0.angleTo(m.q1);
  sweptBounds(m);
}
function respond(hit: Hit, world:CANNON.World, floor:CANNON.Body | undefined) {
  const { a, b, normal, time } = hit,
    A = a.body,
    B = b.body;
  clampToImpact(a, time);
  if (B) clampToImpact(b, time);
  const av = vector(A.velocity),
    bv = B ? vector(B.velocity) : new THREE.Vector3();
  const closing = av.sub(bv).dot(normal),
    invA = A.type === CANNON.Body.DYNAMIC ? A.invMass : 0,
    invB = B?.type === CANNON.Body.DYNAMIC ? B.invMass : 0;
  if (closing < 0 && invA + invB > 0) {
    // Use the same authored pair material as ordinary Cannon contacts. CCD
    // previously hard-coded .03, so fast rubber objects mysteriously stopped
    // bouncing even though their slow collisions were correctly configured.
    const materialA=A.material, materialB=(B ?? floor)?.material;
    const pair=materialA && materialB ? world.getContactMaterial(materialA,materialB) : undefined;
    const restitution=pair ? pair.restitution
      : materialA && materialB && materialA.restitution >= 0 && materialB.restitution >= 0
        ? materialA.restitution*materialB.restitution : world.defaultContactMaterial.restitution;
    const impulse = (-(1+Math.max(0,Math.min(1,restitution))) * closing) / (invA + invB);
    A.velocity.x += normal.x * impulse * invA;
    A.velocity.y += normal.y * impulse * invA;
    A.velocity.z += normal.z * impulse * invA;
    if (B) {
      B.velocity.x -= normal.x * impulse * invB;
      B.velocity.y -= normal.y * impulse * invB;
      B.velocity.z -= normal.z * impulse * invB;
    }
  }
  // Conservative angular casts do not calculate a contact point/torque. Stop
  // the spinning participant at the safe pose rather than rotating through.
  if (hit.angular) {
    if (invA) A.angularVelocity.setZero();
    if (B && invB) B.angularVelocity.setZero();
  }
}

/** Apply casts after the solver and return all bodies whose poses were changed.
 * `canCollide` also permits the app's fast product/product and legacy-static
 * sweeps without changing the ordinary conveyor contact filters. */
export function resolveContinuous(
  world: CANNON.World,
  motions: Motion[] | null,
  dt: number,
  canCollide: (a: CANNON.Body, b: CANNON.Body) => boolean,
): Set<CANNON.Body> {
  const touched = new Set<CANNON.Body>();
  if (!motions) return touched;
  for (const m of motions) {
    m.end.copy(vector(m.body.position));
    m.q1.copy(quat(m.body.quaternion));
    m.angle = m.q0.angleTo(m.q1);
    m.fast =
      m.body.type === CANNON.Body.DYNAMIC &&
      (m.start.distanceTo(m.end) + m.angle * m.body.boundingRadius >
        minFeature(m.body) * 0.75 ||
        needsContinuous(m.body, dt, world.gravity));
    sweptBounds(m);
  }
  const floor = world.bodies.find(body => body.shapes.some(shape => shape instanceof CANNON.Plane));
  const hits: Hit[] = [];
  for (let i = 0; i < motions.length; i++) {
    const a = motions[i];
    if (a.fast) {
      const floor = floorHit(a);
      if (floor) hits.push(floor);
    }
    for (let j = i + 1; j < motions.length; j++) {
      const b = motions[j];
      if (!(a.fast || b.fast) || !canCollide(a.body, b.body)) continue;
      const hit = pairHit(a, b);
      if (hit) hits.push(hit);
    }
  }
  hits.sort((a, b) => a.time - b.time);
  const changed = new Set<Motion>();
  for (const candidate of hits) {
    let hit: Hit | null = candidate;
    if (changed.has(candidate.a) || changed.has(candidate.b))
      hit = candidate.b.body
        ? pairHit(candidate.a, candidate.b)
        : floorHit(candidate.a);
    if (!hit) continue;
    respond(hit,world,floor);
    changed.add(hit.a);
    touched.add(hit.a.body);
    if (hit.b.body && hit.b.body.type === CANNON.Body.DYNAMIC) {
      changed.add(hit.b);
      touched.add(hit.b.body);
    }
  }
  return touched;
}
