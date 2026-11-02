export type P2 = [number, number];

export interface Path {
  x: number[];
  z: number[];
  s: number[];
  tx: number[];
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

/** Samples a Catmull-Rom spline through the control points at (roughly) uniform arc length. */
export function samplePath(points: P2[], step = 0.1): Path {
  const pts = points.length >= 2 ? points : ([[0, 0], [1, 0]] as P2[]);
  const n = pts.length;
  const ext: P2[] = [
    [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]],
    ...pts,
    [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]],
  ];
  const dense: P2[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = ext[i];
    const b = ext[i + 1];
    const c = ext[i + 2];
    const d = ext[i + 3];
    for (let k = 0; k < 24; k += 1) {
      const t = k / 24;
      dense.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]);
    }
  }
  dense.push([pts[n - 1][0], pts[n - 1][1]]);

  const cum: number[] = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = Math.max(0.05, cum[cum.length - 1]);
  const m = Math.max(2, Math.ceil(total / step) + 1);
  const x: number[] = [];
  const z: number[] = [];
  const s: number[] = [];
  let ptr = 0;
  for (let j = 0; j < m; j += 1) {
    const target = (total * j) / (m - 1);
    while (ptr < dense.length - 2 && cum[ptr + 1] < target) ptr += 1;
    const seg = cum[ptr + 1] - cum[ptr] || 1e-6;
    const u = Math.max(0, Math.min(1, (target - cum[ptr]) / seg));
    x.push(dense[ptr][0] + (dense[ptr + 1][0] - dense[ptr][0]) * u);
    z.push(dense[ptr][1] + (dense[ptr + 1][1] - dense[ptr][1]) * u);
    s.push(target);
  }
  const tx: number[] = [];
  const tz: number[] = [];
  for (let i = 0; i < m; i += 1) {
    const a = Math.max(0, i - 1);
    const b = Math.min(m - 1, i + 1);
    const dx = x[b] - x[a];
    const dz = z[b] - z[a];
    const len = Math.hypot(dx, dz) || 1;
    tx.push(dx / len);
    tz.push(dz / len);
  }
  return { x, z, s, tx, tz, length: total };
}
