export type Point = [number, number];
/** Clearance includes the walker's radius. Conveyor segments use a larger value than fences. */
export interface Barrier { a: Point; b: Point; clearance?: number }
export interface WalkObstacle { x: number; z: number; radius: number }

export function distanceToSegment(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  const qx = a[0] + u * dx, qz = a[1] + u * dz;
  return { distance: Math.hypot(x - qx, z - qz), x: qx, z: qz };
}

/** Squared distance from a point to a segment; allocation-free for the hot walk test. */
export function distanceSqToSegment(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz || 1;
  let u = ((x - a[0]) * dx + (z - a[1]) * dz) / len2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const qx = a[0] + u * dx, qz = a[1] + u * dz;
  const ex = x - qx, ez = z - qz;
  return ex * ex + ez * ez;
}

export function pointIsFree(x: number, z: number, barriers: Barrier[], obstacles: WalkObstacle[], tolerance = 0) {
  for (const b of barriers) {
    const r = Math.max(0, (b.clearance ?? 0.34) - tolerance);
    if (x < Math.min(b.a[0], b.b[0]) - r || x > Math.max(b.a[0], b.b[0]) + r || z < Math.min(b.a[1], b.b[1]) - r || z > Math.max(b.a[1], b.b[1]) + r) continue;
    if (distanceSqToSegment(x, z, b.a, b.b) < r * r) return false;
  }
  for (const o of obstacles) {
    const radius = o.radius - tolerance;
    const dx = x - o.x, dz = z - o.z;
    if (dx * dx + dz * dz < radius * radius) return false;
  }
  return true;
}

/** Move a requested interaction point to the closest accessible side of the machine/belt. */
export function projectToFree(point: Point, reference: Point, barriers: Barrier[], obstacles: WalkObstacle[]): Point {
  let [x, z] = point;
  for (let pass = 0; pass < 12; pass += 1) {
    let changed = false;
    for (const b of barriers) {
      const q = distanceToSegment(x, z, b.a, b.b), radius = (b.clearance ?? 0.34) + 0.035;
      if (q.distance >= radius) continue;
      let dx = x - q.x, dz = z - q.z;
      if (Math.hypot(dx, dz) < 1e-5) { dx = reference[0] - q.x; dz = reference[1] - q.z; }
      if (Math.hypot(dx, dz) < 1e-5) { dx = -(b.b[1] - b.a[1]); dz = b.b[0] - b.a[0]; }
      const d = Math.hypot(dx, dz) || 1;
      x = q.x + dx / d * radius; z = q.z + dz / d * radius; changed = true;
    }
    for (const o of obstacles) {
      let dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), radius = o.radius + 0.035;
      if (d >= radius) continue;
      if (d < 1e-5) { dx = reference[0] - o.x; dz = reference[1] - o.z; d = Math.hypot(dx, dz); }
      if (d < 1e-5) { dx = 1; dz = 0; d = 1; }
      x = o.x + dx / d * radius; z = o.z + dz / d * radius; changed = true;
    }
    if (!changed || pointIsFree(x, z, barriers, obstacles)) return [x, z];
  }
  // Intersecting geometry can frustrate projection: search a small disk rather
  // than making the walker pass through an obstacle.
  for (let radius = 0.2; radius <= 6; radius += 0.2) for (let i = 0; i < 24; i += 1) {
    const a = i * Math.PI / 12, px = point[0] + Math.cos(a) * radius, pz = point[1] + Math.sin(a) * radius;
    if (pointIsFree(px, pz, barriers, obstacles)) return [px, pz];
  }
  return [x, z];
}

/** Bounded A*: continuous obstacle checks, no straight-through fallback. */
export function navigate(start: Point, end: Point, barriers: Barrier[], obstacles: WalkObstacle[]): Point[] {
  const cell = 0.5;
  const xs = [start[0], end[0], ...barriers.flatMap((b) => [b.a[0], b.b[0]]), ...obstacles.map((o) => o.x)];
  const zs = [start[1], end[1], ...barriers.flatMap((b) => [b.a[1], b.b[1]]), ...obstacles.map((o) => o.z)];
  const minX = Math.min(...xs) - 3, minZ = Math.min(...zs) - 3;
  const w = Math.min(240, Math.ceil((Math.max(...xs) - minX + 3) / cell) + 1);
  const h = Math.min(240, Math.ceil((Math.max(...zs) - minZ + 3) / cell) + 1);
  const pos = (id: number): Point => [minX + (id % w) * cell, minZ + Math.floor(id / w) * cell];
  const cache = new Int8Array(w * h);
  const free = (id: number) => {
    if (id < 0 || id >= cache.length) return false;
    if (!cache[id]) { const [x, z] = pos(id); cache[id] = pointIsFree(x, z, barriers, obstacles) ? 1 : -1; }
    return cache[id] === 1;
  };
  const nearest = (p: Point) => {
    const cx = Math.max(0, Math.min(w - 1, Math.round((p[0] - minX) / cell))), cz = Math.max(0, Math.min(h - 1, Math.round((p[1] - minZ) / cell)));
    let best = -1, distance = Infinity;
    for (let r = 0; r <= 5; r += 1) {
      for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || x >= w || z < 0 || z >= h) continue;
        const id = x + z * w;
        if (!free(id)) continue;
        const q = pos(id), d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < distance) { best = id; distance = d; }
      }
      if (best >= 0) break;
    }
    return best;
  };
  const startNode = nearest(start), endNode = nearest(end);
  if (startNode < 0 || endNode < 0) return [];
  const g = new Float64Array(w * h); g.fill(Infinity); g[startNode] = 0;
  const parents = new Int32Array(w * h); parents.fill(-1);
  const closed = new Uint8Array(w * h);
  const heuristic = (id: number) => { const p = pos(id); return Math.hypot(p[0] - end[0], p[1] - end[1]); };
  const heap: { id: number; score: number }[] = [];
  const push = (v: { id: number; score: number }) => { heap.push(v); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (heap[p].score <= v.score) break; heap[n] = heap[p]; n = p; } heap[n] = v; };
  const pop = () => { const first = heap[0], last = heap.pop()!; if (heap.length) { let n = 0; while (true) { let c = n * 2 + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1].score < heap[c].score) c += 1; if (heap[c].score >= last.score) break; heap[n] = heap[c]; n = c; } heap[n] = last; } return first; };
  push({ id: startNode, score: heuristic(startNode) });
  for (let iter = 0; iter < 18000 && heap.length; iter += 1) {
    const cur = pop().id; if (closed[cur]) continue;
    if (cur === endNode) {
      const route: Point[] = [end]; let node = cur;
      while (node !== startNode && node >= 0) { route.unshift(pos(node)); node = parents[node]; }
      if (startNode !== endNode) route.unshift(pos(startNode));
      return route;
    }
    closed[cur] = 1;
    const cx = cur % w, cz = Math.floor(cur / w);
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const x = cx + dx, z = cz + dz, next = x + z * w;
      if (x < 0 || z < 0 || x >= w || z >= h || closed[next] || !free(next)) continue;
      if (dx && dz && (!free(cx + dx + cz * w) || !free(cx + (cz + dz) * w))) continue;
      const score = g[cur] + Math.hypot(dx, dz) * cell;
      if (score >= g[next]) continue;
      parents[next] = cur; g[next] = score; push({ id: next, score: score + heuristic(next) });
    }
  }
  return [];
}
