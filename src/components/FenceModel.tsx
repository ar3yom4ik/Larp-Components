import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneItem } from "../types";
import { getMaterial } from "./ModelKit";

export function FenceModel({ item }: { item: SceneItem }) {
  const data = useMemo(() => {
    const posts: THREE.BufferGeometry[] = [], mesh: THREE.BufferGeometry[] = [];
    const height = Number(item.props.height ?? 2), panel = Number(item.props.panelWidth ?? 1.5);
    const points = item.points ?? [[-1.5, 0], [1.5, 0]];
    const box = (list: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, angle = 0) => {
      const g = new THREE.BoxGeometry(w, h, d); g.rotateY(angle); g.translate(x, y, z); list.push(g);
    };
    const added = new Set<string>();
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i], b = points[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      const count = Math.max(1, Math.ceil(length / panel)), angle = Math.atan2(-dz, dx);
      for (let j = 0; j <= count; j += 1) {
        const u = j / count, x = a[0] + dx * u, z = a[1] + dz * u, key = `${x.toFixed(3)},${z.toFixed(3)}`;
        if (!added.has(key)) { box(posts, 0.075, height, 0.075, x, height / 2, z); box(posts, 0.24, 0.035, 0.24, x, 0.0175, z); added.add(key); }
        if (j === count) continue;
        if (item.props.gateOpen && i === Number(item.props.gateSegment ?? 0)) continue;
        const seg = length / count, cx = x + dx / count / 2, cz = z + dz / count / 2;
        for (const y of [0.22, height - 0.03]) box(posts, seg, 0.045, 0.045, cx, y, cz, angle);
        for (let v = 0.12; v < seg; v += 0.15) box(mesh, 0.009, height - 0.3, 0.012, x + dx / length * v, height / 2 + 0.08, z + dz / length * v);
        for (let y = 0.35; y < height - 0.07; y += 0.2) box(mesh, seg, 0.008, 0.012, cx, y, cz, angle);
      }
    }
    const merge = (parts: THREE.BufferGeometry[]) => { const g = parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry(); parts.forEach((p) => p.dispose()); return g; };
    return { posts: merge(posts), mesh: merge(mesh) };
  }, [item.points, item.props.height, item.props.panelWidth, item.props.gateOpen, item.props.gateSegment]);
  useEffect(() => () => { data.posts.dispose(); data.mesh.dispose(); }, [data]);
  return <group><mesh geometry={data.posts} material={getMaterial("acc", item.color || "#F2B705")} castShadow receiveShadow /><mesh geometry={data.mesh} material={getMaterial("dark")} castShadow /></group>;
}