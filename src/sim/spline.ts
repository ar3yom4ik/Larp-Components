export type P2 = [number, number];

/** X/Z control points remain compatible with old projects; Y is stored separately. */
export interface Path {
  x: number[];
  y: number[];
  z: number[];
  s: number[];
  /** Horizontal unit tangent and vertical component of the 3D unit tangent. */
  tx: number[];
  ty: number[];
  tz: number[];
  length: number;
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Samples a Catmull-Rom spline at roughly uniform *3D* arc length.
 * Heights are item-local offsets and default to zero for legacy projects. */
export function samplePath(points: P2[], step = 0.1, heights?: readonly number[]): Path {
  const pts = points.length >= 2 ? points : ([[0, 0], [1, 0]] as P2[]);
  const n = pts.length;
  const h = pts.map((_, i) => Number.isFinite(heights?.[i]) ? heights![i] : 0);
  const hasHeight = h.some((v) => v !== 0);
  const ext: P2[] = [
    [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]],
    ...pts,
    [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]],
  ];
  const extH = [2 * h[0] - h[1], ...h, 2 * h[n - 1] - h[n - 2]];
  const dense: [number, number, number][] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = ext[i], b = ext[i + 1], c = ext[i + 2], d = ext[i + 3];
    for (let k = 0; k < 24; k += 1) {
      const t = k / 24;
      dense.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t), hasHeight ? cr(extH[i], extH[i + 1], extH[i + 2], extH[i + 3], t) : 0]);
    }
  }
  dense.push([pts[n - 1][0], pts[n - 1][1], h[n - 1]]);

  const cum: number[] = [0];
  for (let i = 1; i < dense.length; i += 1) {
    const dx = dense[i][0] - dense[i - 1][0], dz = dense[i][1] - dense[i - 1][1];
    cum.push(cum[i - 1] + (hasHeight ? Math.hypot(dx, dz, dense[i][2] - dense[i - 1][2]) : Math.hypot(dx, dz)));
  }
  const total = Math.max(0.05, cum[cum.length - 1]);
  const m = Math.max(2, Math.ceil(total / Math.max(0.001, step)) + 1);
  const x: number[] = [], y: number[] = [], z: number[] = [], s: number[] = [];
  let ptr = 0;
  for (let j = 0; j < m; j += 1) {
    const target = (total * j) / (m - 1);
    while (ptr < dense.length - 2 && cum[ptr + 1] < target) ptr += 1;
    const seg = cum[ptr + 1] - cum[ptr] || 1e-6;
    const u = Math.max(0, Math.min(1, (target - cum[ptr]) / seg));
    x.push(dense[ptr][0] + (dense[ptr + 1][0] - dense[ptr][0]) * u);
    z.push(dense[ptr][1] + (dense[ptr + 1][1] - dense[ptr][1]) * u);
    y.push(dense[ptr][2] + (dense[ptr + 1][2] - dense[ptr][2]) * u);
    s.push(target);
  }
  const tx: number[] = [], ty: number[] = [], tz: number[] = [];
  for (let i = 0; i < m; i += 1) {
    const a = Math.max(0, i - 1), b = Math.min(m - 1, i + 1);
    const dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
    const len = Math.hypot(dx, dz) || 1;
    tx.push(dx / len); tz.push(dz / len); ty.push(dy / (Math.hypot(dx, dy, dz) || 1));
  }
  return { x, y, z, s, tx, ty, tz, length: total };
}
