import * as THREE from 'three';

/** Private layer used only by the VXGI collector, never by the editor camera. */
export const GI_GEOMETRY_LAYER = 29;

/**
 * Builds a compact VXGI input from marked physical scene roots. Editor gizmos,
 * selection rings, overlays and the huge visual ground plane stay out of the
 * voxel volume. A bounded, GI-only ground proxy avoids subdividing a 240 m plane
 * into millions of tiny triangles when the plant itself is only a few metres wide.
 */
export class GiScene {
  private readonly bounds = new THREE.Box3();
  private readonly transformed = new THREE.Box3();
  private readonly marked = new Map<THREE.Object3D, boolean>();
  private readonly floorGeometry = new THREE.PlaneGeometry(1, 1);
  private readonly floorMaterial = new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0 });
  private readonly floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);

  constructor(private readonly scene: THREE.Scene) {
    this.floor.name = 'vxgi-ground-proxy';
    this.floor.layers.set(GI_GEOMETRY_LAYER);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -.002;
    this.floor.raycast = () => null;
  }

  /** Rebuild layer membership and bounds immediately before re-voxelization. */
  prepare(includeFloor: boolean, floorColor: THREE.ColorRepresentation): THREE.Box3 {
    this.clearLayers();
    this.bounds.makeEmpty();
    this.scene.updateMatrixWorld(true);
    this.scene.traverseVisible(root => {
      if (root.userData.giGeometry !== true) return;
      root.traverseVisible(object => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || object.userData.giGround === true || !mesh.geometry) return;
        if (!this.marked.has(object)) this.marked.set(object, object.layers.isEnabled(GI_GEOMETRY_LAYER));
        object.layers.enable(GI_GEOMETRY_LAYER);
        let local: THREE.Box3 | null = null;
        if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
          const instanced = mesh as THREE.InstancedMesh;
          if (instanced.count > 0) { instanced.computeBoundingBox(); local = instanced.boundingBox; }
        } else {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          local = mesh.geometry.boundingBox;
        }
        if (local && !local.isEmpty()) this.bounds.union(this.transformed.copy(local).applyMatrix4(object.matrixWorld));
      });
    });

    if (this.bounds.isEmpty()) this.bounds.set(new THREE.Vector3(-8, -1, -8), new THREE.Vector3(8, 5, 8));
    else this.bounds.expandByScalar(2);
    if (includeFloor) {
      this.bounds.min.y = Math.min(this.bounds.min.y, -.5);
      this.bounds.max.y = Math.max(this.bounds.max.y, 3);
      this.floorMaterial.color.set(floorColor);
      this.floor.position.x = (this.bounds.min.x + this.bounds.max.x) * .5;
      this.floor.position.z = (this.bounds.min.z + this.bounds.max.z) * .5;
      this.floor.scale.set(this.bounds.max.x - this.bounds.min.x, this.bounds.max.z - this.bounds.min.z, 1);
      if (this.floor.parent !== this.scene) this.scene.add(this.floor);
      this.floor.updateMatrixWorld(true);
    } else if (this.floor.parent) this.floor.removeFromParent();
    return this.bounds;
  }

  private clearLayers() {
    for (const [object, wasEnabled] of this.marked) if (!wasEnabled) object.layers.disable(GI_GEOMETRY_LAYER);
    this.marked.clear();
  }

  dispose() {
    this.clearLayers();
    this.floor.removeFromParent();
    this.floorGeometry.dispose();
    this.floorMaterial.dispose();
  }
}
