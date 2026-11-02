import * as THREE from "three";
import type {
  ImportedCollision,
  ImportedModelData,
  ModelAsset,
  Vec3,
} from "../types";

/**
 * Build a bounded compound from the actual imported triangles, in source
 * coordinates. Surface voxels preserve large openings/concavities that a
 * single bounding box or convex hull would fill. Adjacent voxels are merged;
 * the grid is coarsened only when a complicated mesh would otherwise produce
 * an impractical number of rigid-body shapes. This is an approximation, not
 * a watertight exact mesh collider.
 */
export function buildImportedCollision(
  root: THREE.Object3D,
): ImportedCollision | undefined {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return undefined;
  const size = bounds.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest <= 0) return undefined;
  const cell = longest / 16;
  // A zero-thickness CAD sheet still needs a narrow collision surface.
  for (const axis of ["x", "y", "z"] as const)
    if (bounds.max[axis] - bounds.min[axis] < cell * 0.01) {
      bounds.min[axis] -= cell * 0.005;
      bounds.max[axis] += cell * 0.005;
    }
  const rawMin = bounds.min.clone(),
    rawMax = bounds.max.clone();
  let nx = Math.max(1, Math.ceil((rawMax.x - rawMin.x) / cell));
  let ny = Math.max(1, Math.ceil((rawMax.y - rawMin.y) / cell));
  let nz = Math.max(1, Math.ceil((rawMax.z - rawMin.z) / cell));
  let grid = new Uint8Array(nx * ny * nz);
  const triangle = new THREE.Triangle(),
    box = new THREE.Box3(),
    matrix = new THREE.Matrix4(),
    instance = new THREE.Matrix4();
  let triangles = 0;
  const indexOf = (x: number, y: number, z: number) => x + nx * (y + ny * z);
  const rasterize = (mesh: THREE.Mesh, transform: THREE.Matrix4) => {
    const geometry = mesh.geometry,
      positions = geometry?.getAttribute("position");
    if (!positions) return;
    const indices = geometry.index,
      count = indices?.count ?? positions.count;
    const vertex = (i: number, target: THREE.Vector3) => {
      const v = indices ? indices.getX(i) : i;
      target
        .set(positions.getX(v), positions.getY(v), positions.getZ(v))
        .applyMatrix4(transform);
    };
    for (let i = 0; i + 2 < count; i += 3) {
      vertex(i, triangle.a);
      vertex(i + 1, triangle.b);
      vertex(i + 2, triangle.c);
      if (
        ![
          triangle.a.x,
          triangle.a.y,
          triangle.a.z,
          triangle.b.x,
          triangle.b.y,
          triangle.b.z,
          triangle.c.x,
          triangle.c.y,
          triangle.c.z,
        ].every(Number.isFinite)
      )
        continue;
      triangles++;
      const loX = Math.max(
        0,
        Math.min(
          nx - 1,
          Math.floor(
            (Math.min(triangle.a.x, triangle.b.x, triangle.c.x) - rawMin.x) /
              cell,
          ),
        ),
      );
      const hiX = Math.max(
        0,
        Math.min(
          nx - 1,
          Math.floor(
            (Math.max(triangle.a.x, triangle.b.x, triangle.c.x) - rawMin.x) /
              cell,
          ),
        ),
      );
      const loY = Math.max(
        0,
        Math.min(
          ny - 1,
          Math.floor(
            (Math.min(triangle.a.y, triangle.b.y, triangle.c.y) - rawMin.y) /
              cell,
          ),
        ),
      );
      const hiY = Math.max(
        0,
        Math.min(
          ny - 1,
          Math.floor(
            (Math.max(triangle.a.y, triangle.b.y, triangle.c.y) - rawMin.y) /
              cell,
          ),
        ),
      );
      const loZ = Math.max(
        0,
        Math.min(
          nz - 1,
          Math.floor(
            (Math.min(triangle.a.z, triangle.b.z, triangle.c.z) - rawMin.z) /
              cell,
          ),
        ),
      );
      const hiZ = Math.max(
        0,
        Math.min(
          nz - 1,
          Math.floor(
            (Math.max(triangle.a.z, triangle.b.z, triangle.c.z) - rawMin.z) /
              cell,
          ),
        ),
      );
      for (let z = loZ; z <= hiZ; z++)
        for (let y = loY; y <= hiY; y++)
          for (let x = loX; x <= hiX; x++) {
            const id = indexOf(x, y, z);
            if (grid[id]) continue;
            box.min.set(
              rawMin.x + x * cell,
              rawMin.y + y * cell,
              rawMin.z + z * cell,
            );
            box.max.set(
              Math.min(rawMax.x, box.min.x + cell),
              Math.min(rawMax.y, box.min.y + cell),
              Math.min(rawMax.z, box.min.z + cell),
            );
            if (box.intersectsTriangle(triangle)) grid[id] = 1;
          }
    }
  };
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.geometry) return;
    if (node instanceof THREE.InstancedMesh) {
      for (let i = 0; i < node.count; i++) {
        node.getMatrixAt(i, instance);
        matrix.multiplyMatrices(node.matrixWorld, instance);
        rasterize(node, matrix);
      }
    } else rasterize(node, node.matrixWorld);
  });
  if (!triangles || !grid.some(Boolean)) return undefined;

  let width = cell;
  const merge = (): ImportedCollision["boxes"] => {
    const used = new Uint8Array(grid.length),
      result: ImportedCollision["boxes"] = [];
    const free = (x: number, y: number, z: number) =>
      !!grid[indexOf(x, y, z)] && !used[indexOf(x, y, z)];
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          if (!free(x, y, z)) continue;
          let ex = x + 1,
            ey = y + 1,
            ez = z + 1;
          while (ex < nx && free(ex, y, z)) ex++;
          while (
            ey < ny &&
            Array.from({ length: ex - x }, (_, i) => free(x + i, ey, z)).every(
              Boolean,
            )
          )
            ey++;
          outer: while (ez < nz) {
            for (let yy = y; yy < ey; yy++)
              for (let xx = x; xx < ex; xx++)
                if (!free(xx, yy, ez)) break outer;
            ez++;
          }
          for (let zz = z; zz < ez; zz++)
            for (let yy = y; yy < ey; yy++)
              for (let xx = x; xx < ex; xx++) used[indexOf(xx, yy, zz)] = 1;
          const min = [
            rawMin.x + x * width,
            rawMin.y + y * width,
            rawMin.z + z * width,
          ];
          const max = [
            Math.min(rawMax.x, rawMin.x + ex * width),
            Math.min(rawMax.y, rawMin.y + ey * width),
            Math.min(rawMax.z, rawMin.z + ez * width),
          ];
          result.push({
            center: min.map((v, i) => (v + max[i]) / 2) as Vec3,
            size: min.map((v, i) => max[i] - v) as Vec3,
          });
        }
    return result;
  };
  let boxes = merge();
  while (boxes.length > 128 && (nx > 1 || ny > 1 || nz > 1)) {
    const ox = nx,
      oy = ny,
      oz = nz,
      old = grid;
    nx = Math.ceil(nx / 2);
    ny = Math.ceil(ny / 2);
    nz = Math.ceil(nz / 2);
    width *= 2;
    grid = new Uint8Array(nx * ny * nz);
    for (let z = 0; z < oz; z++)
      for (let y = 0; y < oy; y++)
        for (let x = 0; x < ox; x++)
          if (old[x + ox * (y + oy * z)])
            grid[indexOf(x >> 1, y >> 1, z >> 1)] = 1;
    boxes = merge();
  }
  return {
    min: rawMin.toArray() as Vec3,
    max: rawMax.toArray() as Vec3,
    boxes,
  };
}

// Older projects did not store collision data. Generate it once when their
// already-cached visual model loads, without requiring a scene object to remain.
const derived = new WeakMap<ModelAsset, ImportedCollision>();
let revision = 0;
export function registerImportedCollision(
  asset: ModelAsset,
  collision: ImportedCollision,
) {
  if (derived.get(asset) === collision) return;
  derived.set(asset, collision);
  revision++;
}
export function importedCollisionRevision() {
  return revision;
}
export function importedCollision(model: ImportedModelData) {
  return model.collision ?? derived.get(model.asset);
}

/** Same axis, units, floor alignment and centering used by ImportedModel. */
export function importedCollisionBoxes(
  model: ImportedModelData,
  scale = 1,
): ImportedCollision["boxes"] | undefined {
  const collision = importedCollision(model);
  if (!collision) return undefined;
  const orient = ([x, y, z]: Vec3): Vec3 =>
    model.axis === "z" ? [x, z, -y] : [x, y, z];
  const a = orient(collision.min),
    b = orient(collision.max);
  const min = a.map((v, i) => Math.min(v, b[i])) as Vec3,
    max = a.map((v, i) => Math.max(v, b[i])) as Vec3;
  const units = { m: 1, mm: 0.001, cm: 0.01, in: 0.0254, ft: 0.3048 };
  const factor =
    (model.units === "auto"
      ? Math.max(...max.map((v, i) => v - min[i])) > 50
        ? 0.001
        : 1
      : units[model.units]) * scale;
  const offset = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2];
  return collision.boxes.map((part) => {
    const center = orient(part.center),
      dimensions =
        model.axis === "z"
          ? [part.size[0], part.size[2], part.size[1]]
          : part.size;
    return {
      center: center.map((v, i) => (v + offset[i]) * factor) as Vec3,
      size: dimensions.map((v) => v * factor) as Vec3,
    };
  });
}
