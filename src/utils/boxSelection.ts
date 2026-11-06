import * as THREE from 'three';

export interface ScreenRect { left: number; top: number; right: number; bottom: number }

/** Project visible model bounds, not selection helpers, to select objects
 * intersecting a screen-space marquee. Works for rotated/elevated/large objects. */
export function sceneItemsInBox(scene: THREE.Scene, camera: THREE.Camera, canvas: ScreenRect, marquee: ScreenRect, allowedIds: ReadonlySet<string>): string[] {
  const width = canvas.right - canvas.left, height = canvas.bottom - canvas.top;
  if (width <= 0 || height <= 0) return [];
  const selected: string[] = [];
  const temp = new THREE.Box3(), bounds = new THREE.Box3(), projected = new THREE.Vector3(), cameraPoint = new THREE.Vector3();
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  scene.traverse(root => {
    const id = root.userData.sceneItemId;
    if (typeof id !== 'string' || !allowedIds.has(id) || !root.visible) return;
    bounds.makeEmpty();
    const stack: THREE.Object3D[] = [root];
    while (stack.length) {
      const node = stack.pop()!;
      if (!node.visible || node.userData.selectionFor || node.userData.splineHandleFor) continue;
      stack.push(...node.children);
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) continue;
      // Instanced meshes may span many copies; their own bounding box includes
      // the instance matrices. Normal meshes share immutable geometry bounds.
      const instanced = node as THREE.InstancedMesh;
      if (instanced.isInstancedMesh) {
        instanced.computeBoundingBox();
        if (instanced.boundingBox) bounds.union(temp.copy(instanced.boundingBox).applyMatrix4(node.matrixWorld));
      } else if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinned = mesh as THREE.SkinnedMesh;
        skinned.computeBoundingBox();
        if (skinned.boundingBox) bounds.union(temp.copy(skinned.boundingBox).applyMatrix4(node.matrixWorld));
      } else {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) bounds.union(temp.copy(mesh.geometry.boundingBox).applyMatrix4(node.matrixWorld));
      }
    }
    if (bounds.isEmpty()) return;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      cameraPoint.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      // Points behind the eye do not have a meaningful screen projection.
      if (cameraPoint.z >= 0 && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) continue;
      projected.set(x, y, z).project(camera);
      const sx = canvas.left + (projected.x + 1) * width / 2;
      const sy = canvas.top + (1 - projected.y) * height / 2;
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
      left = Math.min(left, sx); right = Math.max(right, sx); top = Math.min(top, sy); bottom = Math.max(bottom, sy);
    }
    if (left <= marquee.right && right >= marquee.left && top <= marquee.bottom && bottom >= marquee.top) selected.push(id);
  });
  return [...new Set(selected)];
}
