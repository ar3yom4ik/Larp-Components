import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Path } from "../sim/spline";

/* Shared materials: created once, reused by every model (low GPU/CPU overhead) */

export type Mat =
  | "white"
  | "light"
  | "steel"
  | "dark"
  | "black"
  | "mid"
  | "acc"
  | "accE"
  | "glass"
  | "screen"
  | "card"
  | "cardL"
  | "wood"
  | "woodD"
  | "yellow"
  | "red"
  | "green"
  | "rubber"
  | "blue"
  | "orange"
  | "skin"
  | "hair"
  | "pants"
  | "vest";

const SPEC: Record<Exclude<Mat, "acc" | "accE">, THREE.MeshStandardMaterialParameters> = {
  white: { color: "#eef1f3", roughness: 0.4, metalness: 0.06 },
  light: { color: "#cdd3d9", roughness: 0.45, metalness: 0.15 },
  steel: { color: "#a2abb3", roughness: 0.32, metalness: 0.7 },
  dark: { color: "#3b4147", roughness: 0.55, metalness: 0.35 },
  black: { color: "#1f2327", roughness: 0.65, metalness: 0.25 },
  mid: { color: "#656d75", roughness: 0.5, metalness: 0.4 },
  glass: { color: "#a6d6e2", roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.26, depthWrite: false },
  screen: { color: "#0f3b44", emissive: "#2ec4d6", emissiveIntensity: 0.6, roughness: 0.3 },
  card: { color: "#b69568", roughness: 0.92 },
  cardL: { color: "#dcc79f", roughness: 0.9 },
  wood: { color: "#ab855a", roughness: 0.9 },
  woodD: { color: "#7b5f3f", roughness: 0.9 },
  yellow: { color: "#f2c230", roughness: 0.5 },
  red: { color: "#d4443a", roughness: 0.5 },
  green: { color: "#43a047", roughness: 0.5 },
  rubber: { color: "#1b1e21", roughness: 0.9 },
  blue: { color: "#2f6db0", roughness: 0.5, metalness: 0.3 },
  orange: { color: "#e07b2a", roughness: 0.5, metalness: 0.25 },
  skin: { color: "#e3b999", roughness: 0.8 },
  hair: { color: "#4a3a2c", roughness: 0.9 },
  pants: { color: "#2f4358", roughness: 0.8 },
  vest: { color: "#f0b429", roughness: 0.7 },
};

const materials = new Map<string, THREE.Material>();

export function getMaterial(key: Mat, accent = "#6DBE45"): THREE.Material {
  const id = key === "acc" || key === "accE" ? `${key}:${accent}` : key;
  let material = materials.get(id);
  if (!material) {
    if (key === "acc") material = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.42, metalness: 0.2 });
    else if (key === "accE")
      material = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.4 });
    else material = new THREE.MeshStandardMaterial(SPEC[key]);
    materials.set(id, material);
  }
  return material;
}

/* Declarative parts, merged into one mesh per material */

export interface Part {
  g: "b" | "c" | "s" | "k" | "p";
  a: number[];
  p: [number, number, number];
  r?: [number, number, number];
  m: Mat;
}

export const B = (w: number, h: number, d: number, x: number, y: number, z: number, m: Mat, r?: [number, number, number]): Part => ({
  g: "b",
  a: [w, h, d],
  p: [x, y, z],
  r,
  m,
});
export const C = (
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: Mat,
  r?: [number, number, number],
  seg = 18,
): Part => ({ g: "c", a: [rt, rb, h, seg], p: [x, y, z], r, m });
export const S = (rad: number, x: number, y: number, z: number, m: Mat): Part => ({ g: "s", a: [rad], p: [x, y, z], m });
export const K = (rad: number, len: number, x: number, y: number, z: number, m: Mat, r?: [number, number, number]): Part => ({
  g: "k",
  a: [rad, len],
  p: [x, y, z],
  r,
  m,
});
export const P = (w: number, h: number, x: number, y: number, z: number, m: Mat, r?: [number, number, number]): Part => ({
  g: "p",
  a: [w, h],
  p: [x, y, z],
  r,
  m,
});

function partGeometry(part: Part): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  switch (part.g) {
    case "b":
      geo = new THREE.BoxGeometry(part.a[0], part.a[1], part.a[2]);
      break;
    case "c":
      geo = new THREE.CylinderGeometry(part.a[0], part.a[1], part.a[2], part.a[3]);
      break;
    case "s":
      geo = new THREE.SphereGeometry(part.a[0], 16, 12);
      break;
    case "k":
      geo = new THREE.CapsuleGeometry(part.a[0], part.a[1], 4, 12);
      break;
    default:
      geo = new THREE.PlaneGeometry(part.a[0], part.a[1]);
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.r ?? [0, 0, 0])));
  m.compose(new THREE.Vector3(...part.p), q, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(m);
  return geo;
}

const staticCache = new Map<string, THREE.Group>();

export function buildStatic(key: string, accent: string, make: () => Part[]): THREE.Group {
  const id = `${key}|${accent}`;
  let template = staticCache.get(id);
  if (!template) {
    const buckets = new Map<Mat, THREE.BufferGeometry[]>();
    for (const part of make()) {
      const list = buckets.get(part.m) ?? [];
      list.push(partGeometry(part));
      buckets.set(part.m, list);
    }
    template = new THREE.Group();
    buckets.forEach((geos, mat) => {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, getMaterial(mat, accent));
      mesh.castShadow = mat !== "glass";
      mesh.receiveShadow = true;
      template!.add(mesh);
    });
    staticCache.set(id, template);
  }
  return template.clone();
}

/* ------------------------------------------------------------------ */
/*  Conveyor spline geometry                                           */
/* ------------------------------------------------------------------ */

export const BELT_WIDTH = 0.62;
export const BELT_Y = 0.66;

export function beltGeometry(path: Path, width: number, y: number) {
  const n = path.x.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const nor = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i += 1) {
    const nx = -path.tz[i];
    const nz = path.tx[i];
    const h = width / 2;
    pos.set([path.x[i] + nx * h, y, path.z[i] + nz * h], i * 6);
    pos.set([path.x[i] - nx * h, y, path.z[i] - nz * h], i * 6 + 3);
    uv.set([path.s[i] / 0.5, 0], i * 4);
    uv.set([path.s[i] / 0.5, 1], i * 4 + 2);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

/** Extrudes a rectangular profile (lateral offset, height) along the path with flat shaded faces. */
export function extrudeBox(path: Path, l0: number, l1: number, y0: number, y1: number) {
  const corners: [number, number][] = [
    [l0, y1],
    [l1, y1],
    [l1, y0],
    [l0, y0],
  ];
  const outward: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const point = (i: number, c: [number, number]): [number, number, number] => [
    path.x[i] + -path.tz[i] * c[0],
    c[1],
    path.z[i] + path.tx[i] * c[0],
  ];
  for (let f = 0; f < 4; f += 1) {
    const c0 = corners[f];
    const c1 = corners[(f + 1) % 4];
    const [ol, oy] = outward[f];
    for (let i = 0; i < path.x.length - 1; i += 1) {
      const a = point(i, c0);
      const b = point(i, c1);
      const c = point(i + 1, c0);
      const d = point(i + 1, c1);
      const nx = -path.tz[i] * ol;
      const nz = path.tx[i] * ol;
      const tri = (p: number[][]) => {
        const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
        const e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
        const cx = e1[1] * e2[2] - e1[2] * e2[1];
        const cy = e1[2] * e2[0] - e1[0] * e2[2];
        const cz = e1[0] * e2[1] - e1[1] * e2[0];
        const flip = cx * nx + cy * oy + cz * nz < 0;
        const order = flip ? [p[0], p[2], p[1]] : p;
        order.forEach((v) => {
          positions.push(v[0], v[1], v[2]);
          normals.push(nx, oy, nz);
        });
      };
      tri([a, b, c]);
      tri([b, d, c]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function mergeNonIndexed(geos: THREE.BufferGeometry[]) {
  const prepared = geos.map((g) => {
    const out = g.index ? g.toNonIndexed() : g;
    if (out !== g) g.dispose();
    out.deleteAttribute("uv");
    return out;
  });
  return mergeGeometries(prepared, false);
}

export interface ConveyorGeos {
  belt: THREE.BufferGeometry;
  steel: THREE.BufferGeometry | null;
  dark: THREE.BufferGeometry | null;
  warn: THREE.BufferGeometry | null;
}

export interface RailOpening { along: number; side: number; radius: number }

/** A junction removes only the affected rail sections, not the whole frame. */
export function buildConveyorGeometry(path: Path, stopper: boolean, openings: RailOpening[] = []): ConveyorGeos {
  const belt = beltGeometry(path, BELT_WIDTH, BELT_Y);
  const hw = BELT_WIDTH / 2;
  const steelParts: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const l0 = side === 1 ? hw + 0.01 : -hw - 0.07;
    const l1 = side === 1 ? hw + 0.07 : -hw - 0.01;
    let start = 0;
    for (let i = 0; i < path.x.length; i++) {
      const open = i < path.x.length - 1 && openings.some((entry) =>
        (entry.side === 0 || entry.side === side) && Math.abs((path.s[i] + path.s[i + 1]) / 2 - entry.along) < entry.radius);
      if (open || i === path.x.length - 1) {
        const end = i;
        if (end > start) {
          const cut = (values: number[]) => values.slice(start, end + 1);
          const segment: Path = { x: cut(path.x), z: cut(path.z), s: cut(path.s), tx: cut(path.tx), tz: cut(path.tz), length: path.s[end] - path.s[start] };
          steelParts.push(extrudeBox(segment, l0, l1, BELT_Y - 0.1, BELT_Y + 0.07));
        }
        if (open) start = i + 1;
      }
    }
  }
  const darkParts: THREE.BufferGeometry[] = [extrudeBox(path, -0.2, 0.2, BELT_Y - 0.2, BELT_Y - 0.05)];
  const last = path.x.length - 1;
  const endCap = (i: number) => {
    const g = new THREE.CylinderGeometry(0.1, 0.1, BELT_WIDTH + 0.02, 14);
    g.rotateX(Math.PI / 2);
    g.rotateY(Math.atan2(-path.tz[i], path.tx[i]) + Math.PI / 2 - Math.PI / 2);
    g.translate(path.x[i], BELT_Y - 0.08, path.z[i]);
    return g;
  };
  steelParts.push(endCap(0), endCap(last));
  for (let s = 0.5; s < path.length - 0.2; s += 1.4) {
    const idx = Math.min(last, Math.round((s / path.length) * last));
    for (const side of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.08, BELT_Y - 0.22, 0.08);
      leg.translate(0, (BELT_Y - 0.22) / 2, 0);
      const px = path.x[idx] + -path.tz[idx] * side * 0.27;
      const pz = path.z[idx] + path.tx[idx] * side * 0.27;
      leg.translate(px, 0, pz);
      darkParts.push(leg);
      const foot = new THREE.BoxGeometry(0.22, 0.03, 0.22);
      foot.translate(px, 0.015, pz);
      darkParts.push(foot);
    }
  }
  let warn: THREE.BufferGeometry | null = null;
  if (stopper) {
    const plate = new THREE.BoxGeometry(0.05, 0.3, BELT_WIDTH + 0.08);
    plate.rotateY(Math.atan2(-path.tz[last], path.tx[last]));
    plate.translate(path.x[last] - path.tx[last] * 0.03, BELT_Y + 0.15, path.z[last] - path.tz[last] * 0.03);
    warn = mergeNonIndexed([plate]);
  }
  return { belt, steel: mergeNonIndexed(steelParts), dark: mergeNonIndexed(darkParts), warn };
}

/* Belt textures ---------------------------------------------------- */

const textureCache = new Map<string, THREE.CanvasTexture>();

export function beltTexture(kind: "belt" | "roller"): THREE.CanvasTexture {
  let tex = textureCache.get(kind);
  if (!tex) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    if (kind === "belt") {
      ctx.fillStyle = "#464b51";
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = "#5d646c";
      ctx.fillRect(0, 0, 10, 64);
      ctx.fillRect(64, 0, 10, 64);
      ctx.fillStyle = "#34383d";
      ctx.fillRect(10, 0, 3, 64);
      ctx.fillRect(74, 0, 3, 64);
      ctx.fillStyle = "#2c3034";
      ctx.fillRect(0, 0, 128, 4);
      ctx.fillRect(0, 60, 128, 4);
    } else {
      ctx.fillStyle = "#4a4f55";
      ctx.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 4; i += 1) {
        const grad = ctx.createLinearGradient(i * 32, 0, i * 32 + 24, 0);
        grad.addColorStop(0, "#9aa3ab");
        grad.addColorStop(0.45, "#eef1f3");
        grad.addColorStop(1, "#8f98a0");
        ctx.fillStyle = grad;
        ctx.fillRect(i * 32 + 2, 2, 24, 60);
      }
    }
    tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    textureCache.set(kind, tex);
  }
  return tex;
}
