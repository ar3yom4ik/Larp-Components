import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sim, type Box } from "../sim/engine";
import { getProduct, importedModelSize, importedProductId, type ProductShape } from "../data/products";
import { useAppearance } from "../theme";
import type { SceneItem } from "../types";
import { ImportedModel } from "./ImportedModel";
import { InstanceSlotCache } from "../utils/instanceSlots";

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

function ImportedWorkpiece({ box, source }: { box: Box; source: SceneItem }) {
  const group = useRef<THREE.Group>(null);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const axis = useMemo(() => new THREE.Vector3(), []);
  const tilt = useMemo(() => new THREE.Quaternion(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!group.current) return;
    group.current.visible = box.state !== "inside" && box.state !== "dead";
    const belt = box.state === "free" && box.support === 2 ? box.beltNormal : undefined;
    group.current.position.set(box.x, box.y + (belt ? box.hy * (1 / Math.max(.2, belt[1]) - 1) : 0) + Math.abs(Math.sin(box.tilt)) * box.hz * 0.9, box.z);
    group.current.quaternion.setFromAxisAngle(up, box.yaw);
    if (belt) { normal.set(...belt); tilt.setFromUnitVectors(up, normal); group.current.quaternion.premultiply(tilt); }
    if (box.tilt) { axis.set(box.ax, 0, box.az).normalize(); tilt.setFromAxisAngle(axis, box.tilt); group.current.quaternion.premultiply(tilt); }
    group.current.scale.setScalar(box.state === "dying" ? Math.max(0, box.fade) : 1);
  });
  // Keep an already-spawned part visually aligned with its stored collision
  // dimensions if the source model's scale or units are edited later.
  const size = importedModelSize(source.imported!, 1);
  const scale: [number, number, number] = [box.hx * 2 / size[0], box.hy * 2 / size[1], box.hz * 2 / size[2]];
  return <group ref={group} userData={{ importedWorkpiece: true, boxId: box.id }}>
    <group position={[0, -box.hy, 0]} scale={scale}><ImportedModel model={source.imported!} id={`workpiece-${box.id}`} /></group>
  </group>;
}

export function BoxesLayer({ items = [], onProjectedWorkpiecesChange }: { items?: readonly SceneItem[]; onProjectedWorkpiecesChange?: (active: boolean) => void }) {
  const { gfx } = useAppearance();
  const meshes = useRef<Partial<Record<ProductShape, THREE.InstancedMesh>>>({});
  const slots = useRef<Partial<Record<ProductShape, InstanceSlotCache>>>({});
  const register = useMemo(() => Object.fromEntries(SHAPES.map(shape => [shape, (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) { delete meshes.current[shape]; delete slots.current[shape]; return; }
    mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshes.current[shape] = mesh; slots.current[shape] = new InstanceSlotCache(mesh.instanceMatrix.count);
  }])) as Record<ProductShape, (mesh: THREE.InstancedMesh | null) => void>, []);
  const products = useMemo(() => new Map<string, ReturnType<typeof getProduct>>(), [items]);
  const sources = useMemo(() => new Map(items.filter((item) => item.kind === "imported-model" && item.imported).map((item) => [importedProductId(item), item])), [items]);
  const [imports, setImports] = useState<Box[]>([]);
  // Instance buffers grow with demand instead of imposing a simulation limit.
  const [capacity, setCapacity] = useState(256);
  const importKey = useRef("");
  const projectedWorkpieces = useRef<boolean | null>(null);
  const kit = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), p: new THREE.Vector3(), scale: new THREE.Vector3(), axis: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), color: new THREE.Color() }), []);
  useFrame(() => {
    if (sim.boxes.length > capacity) setCapacity(2 ** Math.ceil(Math.log2(sim.boxes.length)));
    const counts = { box: 0, cookie: 0, cylinder: 0, bottle: 0, sphere: 0, gear: 0, board: 0, frame: 0 };
    for (const shape of SHAPES) slots.current[shape]?.beginFrame();
    const imported = sources.size ? sim.boxes.filter((b) => b.state !== "inside" && b.state !== "dead" && sources.has(b.productId)) : [];
    const hasProjection = imported.some((box) => sources.get(box.productId)?.imported?.materials.some((material) => material.worldProjection === true));
    if (hasProjection !== projectedWorkpieces.current) { projectedWorkpieces.current = hasProjection; onProjectedWorkpiecesChange?.(hasProjection); }
    const key = imported.map((b) => `${b.id}:${b.productId}`).join(",");
    if (key !== importKey.current) { importKey.current = key; setImports(imported); }
    for (const b of sim.boxes) {
      if (b.state === "inside" || b.state === "dead") continue;
      if (sources.has(b.productId)) continue;
      let product = products.get(b.productId);
      if (!product) { product = getProduct(b.productId, items); products.set(b.productId, product); }
      const mesh = meshes.current[product.shape], cache = slots.current[product.shape];
      if (!mesh || !cache) continue;
      const index = counts[product.shape]++;
      if (index >= capacity) continue;
      const fade = b.state === "dying" ? Math.max(0, b.fade) : 1;
      const belt = b.state === "free" && b.support === 2 ? b.beltNormal : undefined;
      if (cache.matrixChanged(index, b, fade, belt)) {
        kit.q.setFromAxisAngle(kit.up, b.yaw);
        if (belt) { kit.axis.set(...belt); kit.q2.setFromUnitVectors(kit.up, kit.axis); kit.q.premultiply(kit.q2); }
        if (b.tilt) { kit.axis.set(b.ax, 0, b.az).normalize(); kit.q2.setFromAxisAngle(kit.axis, b.tilt); kit.q.premultiply(kit.q2); }
        kit.p.set(b.x, b.y + (belt ? b.hy * (1 / Math.max(.2, belt[1]) - 1) : 0) + Math.abs(Math.sin(b.tilt)) * b.hz * 0.9, b.z);
        kit.scale.set(b.hx * 2 * fade, b.hy * 2 * fade, b.hz * 2 * fade);
        kit.m.compose(kit.p, kit.q, kit.scale); mesh.setMatrixAt(index, kit.m);
      }
      if (cache.colorChanged(index, b.color, gfx.productBoost)) {
        const initial = !mesh.instanceColor;
        kit.color.setHex(b.color).multiplyScalar(1 + gfx.productBoost * 1.5); mesh.setColorAt(index, kit.color);
        if (initial) mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      }
    }
    for (const shape of SHAPES) {
      const mesh = meshes.current[shape], cache = slots.current[shape]; if (!mesh || !cache) continue;
      mesh.count = Math.min(counts[shape], capacity);
      if (cache.matrixMax >= 0) {
        mesh.instanceMatrix.addUpdateRange(cache.matrixMin * 16, (cache.matrixMax - cache.matrixMin + 1) * 16);
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (cache.colorMax >= 0 && mesh.instanceColor) {
        mesh.instanceColor.addUpdateRange(cache.colorMin * 3, (cache.colorMax - cache.colorMin + 1) * 3);
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });
  return <>{SHAPES.map((shape) => <instancedMesh key={`${shape}-${capacity}`} ref={register[shape]} args={[geometry(shape), undefined, capacity]} castShadow receiveShadow frustumCulled={false} raycast={() => null}><meshStandardMaterial color="#ffffff" roughness={0.7} metalness={shape === "gear" || shape === "frame" ? 0.5 : 0.04} vertexColors /></instancedMesh>)}
    {imports.map((box) => { const source = sources.get(box.productId); return source ? <ImportedWorkpiece key={box.id} box={box} source={source} /> : null; })}
  </>;
}