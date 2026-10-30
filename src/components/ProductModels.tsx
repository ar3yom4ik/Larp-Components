import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sim, MAX_BOXES } from "../sim/engine";
import { getProduct, type ProductShape } from "../data/products";
import { useAppearance } from "../theme";

const SHAPES: ProductShape[] = ["box", "cookie", "cylinder", "bottle", "sphere", "gear", "board", "frame"];
const cache = new Map<ProductShape, THREE.BufferGeometry>();
function geometry(shape: ProductShape) {
  if (cache.has(shape)) return cache.get(shape)!;
  const parts: THREE.BufferGeometry[] = [];
  const part = (g: THREE.BufferGeometry, color = 1) => {
    const p = g.index ? g.toNonIndexed() : g;
    p.deleteAttribute("uv");
    const c = new Float32Array(p.getAttribute("position").count * 3).fill(color);
    p.setAttribute("color", new THREE.BufferAttribute(c, 3)); parts.push(p);
  };
  const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0, color = 1) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); part(g, color); };
  if (shape === "box") {
    box(1, 1, 1); box(0.14, 0.012, 1.01, 0, 0.506, 0, 1.35); box(0.14, 0.9, 0.012, 0, 0, 0.506, 1.35);
  } else if (shape === "cookie") {
    part(new THREE.CylinderGeometry(0.49, 0.5, 0.85, 24));
    for (let i = 0; i < 8; i += 1) { const a = i * 2.4, r = i % 2 ? 0.31 : 0.16; const g = new THREE.SphereGeometry(0.065, 6, 5); g.scale(1, 0.8, 1); g.translate(Math.cos(a) * r, 0.43, Math.sin(a) * r); part(g, 0.23); }
  } else if (shape === "bottle") {
    const g = new THREE.CylinderGeometry(0.4, 0.46, 0.7, 18); g.translate(0, -0.15, 0); part(g);
    const shoulder = new THREE.CylinderGeometry(0.19, 0.4, 0.18, 18); shoulder.translate(0, 0.29, 0); part(shoulder);
    const cap = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 18); cap.translate(0, 0.41, 0); part(cap, 0.45);
    const label = new THREE.CylinderGeometry(0.433, 0.447, 0.23, 18); label.translate(0, -0.12, 0); part(label, 1.3);
  } else if (shape === "cylinder") {
    part(new THREE.CylinderGeometry(0.49, 0.49, 0.95, 22));
    const lid = new THREE.CylinderGeometry(0.5, 0.5, 0.045, 22); lid.translate(0, 0.477, 0); part(lid, 1.25);
  } else if (shape === "sphere") {
    part(new THREE.SphereGeometry(0.49, 18, 14)); box(0.06, 0.14, 0.06, 0, 0.48, 0, 0.35);
  } else if (shape === "gear") {
    const ring = new THREE.TorusGeometry(0.3, 0.16, 8, 24); ring.rotateX(Math.PI / 2); ring.scale(1, 2.7, 1); part(ring);
    for (let i = 0; i < 12; i += 1) { const a = i * Math.PI / 6; const g = new THREE.BoxGeometry(0.16, 0.75, 0.16); g.rotateY(a); g.translate(Math.cos(a) * 0.43, 0, Math.sin(a) * 0.43); part(g, 0.9); }
  } else if (shape === "board") {
    box(1, 0.7, 1);
    for (let i = 0; i < 4; i += 1) box(0.18, 0.2, 0.22, -0.3 + i * 0.2, 0.43, i % 2 ? 0.2 : -0.15, 0.3);
  } else {
    box(1, 0.12, 1, 0, -0.44, 0);
    for (const s of [-1, 1]) { box(0.1, 1, 1, s * 0.45, 0, 0); box(0.8, 1, 0.1, 0, 0, s * 0.45); }
  }
  const merged = mergeGeometries(parts)!; parts.forEach((p) => p.dispose());
  cache.set(shape, merged); return merged;
}

export function BoxesLayer() {
  const { gfx } = useAppearance();
  const meshes = useRef<Partial<Record<ProductShape, THREE.InstancedMesh>>>({});
  const kit = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), p: new THREE.Vector3(), scale: new THREE.Vector3(), axis: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), color: new THREE.Color() }), []);
  useFrame(() => {
    const counts = { box: 0, cookie: 0, cylinder: 0, bottle: 0, sphere: 0, gear: 0, board: 0, frame: 0 };
    for (const b of sim.boxes) {
      if (b.state === "inside" || b.state === "dead") continue;
      const product = getProduct(b.productId), mesh = meshes.current[product.shape];
      if (!mesh) continue;
      const index = counts[product.shape]++;
      const fade = b.state === "dying" ? Math.max(0, b.fade) : 1;
      kit.q.setFromAxisAngle(kit.up, b.yaw);
      if (b.tilt) { kit.axis.set(b.ax, 0, b.az).normalize(); kit.q2.setFromAxisAngle(kit.axis, b.tilt); kit.q.premultiply(kit.q2); }
      kit.p.set(b.x, b.y + Math.abs(Math.sin(b.tilt)) * b.hz * 0.9, b.z);
      kit.scale.set(b.hx * 2 * fade, b.hy * 2 * fade, b.hz * 2 * fade);
      kit.m.compose(kit.p, kit.q, kit.scale); mesh.setMatrixAt(index, kit.m);
      kit.color.setHex(b.color).multiplyScalar(1 + gfx.productBoost * 1.5); mesh.setColorAt(index, kit.color);
    }
    for (const shape of SHAPES) {
      const mesh = meshes.current[shape]; if (!mesh) continue;
      mesh.count = counts[shape]; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });
  return <>{SHAPES.map((shape) => <instancedMesh key={shape} ref={(m) => { if (m) { m.count = 0; meshes.current[shape] = m; } }} args={[geometry(shape), undefined, MAX_BOXES]} castShadow receiveShadow frustumCulled={false} raycast={() => null}><meshStandardMaterial color="#ffffff" roughness={0.7} metalness={shape === "gear" || shape === "frame" ? 0.5 : 0.04} vertexColors /></instancedMesh>)}</>;
}