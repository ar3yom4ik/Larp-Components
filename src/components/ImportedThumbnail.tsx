import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { ImportedModelData, TextureSlot } from '../types';
import { getCachedModel, materialsOf, removeModelMeshes, TEXTURE_SLOTS } from '../utils/modelImport';
import { modelAxisRotation } from '../utils/modelAxis';
import { PartIcon } from './PartIcon';

// One shared off-screen renderer, not a WebGL context per catalog card. Queue
// renders because all cards share the same drawing buffer. Limit cache growth
// and periodically release GPU resources associated with old parsed models.
const cache = new Map<string, Promise<string>>();
const identities = new WeakMap<object, number>();
let nextIdentity = 0;
const identity = (value: object) => { let id = identities.get(value); if (!id) { id = ++nextIdentity; identities.set(value, id); } return id; };
let renderer: THREE.WebGLRenderer | null = null;
let rendered = 0;
let queue: Promise<unknown> = Promise.resolve();

function sharedRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(160, 160, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

async function renderPreview(model: ImportedModelData) {
  const { root } = await getCachedModel(model.asset);
  const original = materialsOf(root);
  const ownedTextures: THREE.Texture[] = [];
  const copies = await Promise.all(original.map(async (source, index) => {
    const material = source.clone() as THREE.MeshStandardMaterial;
    const settings = model.materials[index];
    if (!settings) return material;
    material.color?.set(settings.color);
    if ('roughness' in material) material.roughness = settings.roughness;
    if ('metalness' in material) material.metalness = settings.metalness;
    material.opacity = settings.opacity;
    material.transparent = settings.opacity < 1 || source.transparent;
    material.side = settings.doubleSided ? THREE.DoubleSide : source.side;
    for (const slot of TEXTURE_SLOTS as TextureSlot[]) {
      const override = settings.textures[slot];
      if (override === undefined || !(slot in material)) continue;
      if (override === null) { (material as unknown as Record<string, unknown>)[slot] = null; continue; }
      try {
        const texture = await new THREE.TextureLoader().loadAsync(override.dataUrl);
        const old = (source as unknown as Record<string, THREE.Texture | null>)[slot];
        if (old) { texture.flipY = old.flipY; texture.wrapS = old.wrapS; texture.wrapT = old.wrapT; texture.repeat.copy(old.repeat); texture.offset.copy(old.offset); texture.rotation = old.rotation; texture.center.copy(old.center); texture.channel = old.channel; }
        else texture.flipY = !/\.gl(?:tf|b)$/i.test(model.asset.entry);
        texture.colorSpace = slot === 'map' || slot === 'emissiveMap' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        ownedTextures.push(texture);
        (material as unknown as Record<string, unknown>)[slot] = texture;
      } catch { /* Keep the source material if a replacement cannot decode. */ }
    }
    material.needsUpdate = true;
    return material;
  }));
  try {
    const lookup = new Map(original.map((material, index) => [material, copies[index]]));
    const object = removeModelMeshes(cloneSkeleton(root), model.hiddenMeshes ?? []);
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.frustumCulled = false;
      node.material = Array.isArray(node.material) ? node.material.map(material => lookup.get(material) ?? material) : lookup.get(node.material) ?? node.material;
    });
    const scene = new THREE.Scene();
    const axis = new THREE.Group(); axis.rotation.set(...modelAxisRotation(model.axis)); axis.add(object); scene.add(axis);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8695a6, 1.7));
    const light = new THREE.DirectionalLight(0xffffff, 2.0); light.position.set(4, 7, 6); scene.add(light);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(axis);
    if (box.isEmpty()) throw new Error('No preview geometry');
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(span) || span <= 0) throw new Error('Invalid preview bounds');
    // Move the whole rotated group, not the source geometry, to the frame centre.
    axis.position.sub(center); scene.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(35, 1, Math.max(span / 1000, .00001), Math.max(span * 100, 1));
    camera.position.set(span * 1.8, span * 1.35, span * 1.8); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    const gl = sharedRenderer();
    gl.clear(); gl.render(scene, camera);
    const image = gl.domElement.toDataURL('image/png');
    gl.renderLists.dispose();
    if (++rendered >= 50) { gl.dispose(); gl.forceContextLoss(); renderer = null; rendered = 0; }
    return image;
  } finally {
    copies.forEach(material => material.dispose());
    ownedTextures.forEach(texture => texture.dispose());
  }
}

// Fallback for devices with no spare WebGL context. It is intentionally simple
// but still shows the actual geometry instead of a generic imported-model icon.
async function renderWirePreview(model: ImportedModelData) {
  const { root } = await getCachedModel(model.asset); root.updateMatrixWorld(true);
  const materials = materialsOf(root), triangles: { p: THREE.Vector3[]; color: string; depth: number }[] = [];
  const meshes: THREE.Mesh[] = []; let index = 0; const hidden = new Set(model.hiddenMeshes ?? []);
  root.traverse(node => { if (node instanceof THREE.Mesh && node.geometry?.getAttribute('position')) { if (!hidden.has(index)) meshes.push(node); index++; } });
  const total = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
  const stride = Math.max(1, Math.ceil(total / 1200)); let counter = 0;
  const rotation = new THREE.Euler(...modelAxisRotation(model.axis));
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index;
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const color = model.materials[materials.indexOf(source)]?.color ?? `#${(source as THREE.MeshStandardMaterial).color?.getHexString?.() ?? 'a9b8c7'}`;
    const count = indices?.count ?? positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      if (counter++ % stride) continue;
      const p = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld).applyEuler(rotation));
      triangles.push({ p, color, depth: p.reduce((sum, v) => sum + v.x + v.z + v.y * .4, 0) / 3 });
    }
  }
  if (!triangles.length) throw new Error('No preview geometry');
  const project = (v: THREE.Vector3) => [v.x - v.z * .75, -v.y + (v.x + v.z) * .38] as const;
  const points = triangles.flatMap(triangle => triangle.p.map(project));
  const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0])), minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
  const scale = 104 / Math.max(maxX - minX, maxY - minY, 1e-6), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  triangles.sort((a, b) => a.depth - b.depth);
  for (const triangle of triangles) {
    ctx.beginPath(); triangle.p.forEach((v, i) => { const [x, y] = project(v); if (i === 0) ctx.moveTo(64 + (x - cx) * scale, 64 + (y - cy) * scale); else ctx.lineTo(64 + (x - cx) * scale, 64 + (y - cy) * scale); });
    ctx.closePath(); ctx.fillStyle = triangle.color; ctx.fill(); ctx.strokeStyle = 'rgba(16,25,34,.25)'; ctx.lineWidth = .4; ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

function preview(model: ImportedModelData) {
  const task = queue.then(() => renderPreview(model).catch(() => renderWirePreview(model)));
  queue = task.catch(() => undefined);
  return task;
}

export function ImportedThumbnail({ model, className = '' }: { model: ImportedModelData; className?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true; setUrl('');
    const key = JSON.stringify([model.asset.id, identity(model.asset), model.axis, model.hiddenMeshes, identity(model.materials)]);
    let result = cache.get(key);
    if (!result) { result = preview(model); cache.set(key, result); if (cache.size > 120) cache.delete(cache.keys().next().value!); }
    void result.then(value => { if (alive) setUrl(value); }).catch(() => { cache.delete(key); });
    return () => { alive = false; };
  }, [model]);
  return url ? <img className={className} src={url} alt="" draggable={false} /> : <PartIcon kind="imported-model" className={className} />;
}
