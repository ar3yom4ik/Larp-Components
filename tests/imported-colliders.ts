import assert from "node:assert/strict";
import * as THREE from "three";
import { makeItem } from "../src/data/library";
import { getProduct, importedProductId } from "../src/data/products";
import { Engine } from "../src/sim/engine";
import {
  buildImportedCollision,
  importedCollisionBoxes,
  registerImportedCollision,
} from "../src/utils/modelCollision";
import { parseProject, serializeProject } from "../src/utils/project";
import type { ImportedModelData } from "../src/types";

// One source mesh assembly with a genuine opening rather than its bounding box.
const root = new THREE.Group();
const add = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  m.position.set(x, y, z);
  root.add(m);
};
add(0.2, 2, 0.4, -0.9, 1, 0);
add(0.2, 2, 0.4, 0.9, 1, 0);
add(2, 0.2, 0.4, 0, 2.1, 0);
const collision = buildImportedCollision(root)!;
assert.ok(collision.boxes.length > 1 && collision.boxes.length <= 128);
const imported: ImportedModelData = {
  asset: {
    id: "arch",
    entry: "arch.stl",
    files: [
      {
        path: "arch.stl",
        dataUrl: "data:application/octet-stream;base64,AA==",
      },
    ],
  },
  axis: "y",
  units: "m",
  materials: [],
  meshCount: 3,
  triangleCount: 36,
  sourceSize: [2, 2.2, 0.4],
  collision,
};
const parts = importedCollisionBoxes(imported)!;
assert.ok(
  parts.every(
    (p) =>
      p.center[0] - p.size[0] / 2 >= -1.001 &&
      p.center[0] + p.size[0] / 2 <= 1.001,
  ),
);
assert.ok(
  !parts.some(
    (p) =>
      Math.abs(p.center[0]) < p.size[0] / 2 &&
      p.center[1] - p.size[1] / 2 < 1 &&
      p.center[1] + p.size[1] / 2 > 1,
  ),
  "opening is not filled",
);

for (const axis of ["y", "z"] as const) {
  const model = { ...imported, axis, units: "mm" as const };
  const transformed = importedCollisionBoxes(model, 2)!;
  const bottom = Math.min(
    ...transformed.map((p) => p.center[1] - p.size[1] / 2),
  );
  assert.ok(
    Math.abs(bottom) < 1e-8,
    `${axis}-up collider aligns with rendered floor`,
  );
}

const arch = makeItem("imported-model", [0, 0, 0], 0, {
  name: "Arch",
  imported,
  props: { physicsMode: "kinematic" },
});
const projectile = (x: number) =>
  makeItem("cabinet", [x, 0.7, 1.2], 0, {
    scale: 0.12,
    props: { physicsMode: "dynamic", physicsMass: 1 },
  });
for (const [x, shouldPass] of [
  [0, true],
  [0.9, false],
] as const) {
  const moving = projectile(x),
    e = new Engine();
  e.sync([arch, moving]);
  const body = e.rigidBodies.body(moving.id)!;
  body.velocity.set(0, 0, -3);
  // Keep the probe at a fixed height without suppressing contact impulses.
  body.force.set(0, body.mass * 9.81, 0);
  for (let i = 0; i < 40; i++) {
    body.force.y = body.mass * 9.81;
    e.rigidBodies.step(1 / 60, [], () => 1);
  }
  const z = e.getPhysicsPose(moving.id)!.position[2];
  assert.ok(
    shouldPass ? z < -0.4 : z > 0.1,
    `${shouldPass ? "opening" : "solid side"} collision, z=${z}`,
  );
}

const text = serializeProject({
  items: [arch],
  projectName: "collider",
  layoutName: "collider",
  activeLayoutId: null,
});
const restored = parseProject(text).items[0];
assert.deepEqual(
  restored.imported!.collision,
  collision,
  "collision geometry persists on reload",
);
// Malformed compounds are discarded instead of creating collision shapes
// outside the model's source bounds or an unbounded number of bodies.
for (const corruption of ["outside", "too-many"]) {
  const payload = JSON.parse(text.slice(text.indexOf("\n") + 1));
  const data = payload.items[0].imported.collision;
  if (corruption === "outside") data.boxes[0].center[0] = data.max[0] + 100;
  else data.boxes = Array.from({ length: 129 }, () => data.boxes[0]);
  const parsed = parseProject(
    `LARP COMPONENTS 5.1\n${JSON.stringify(payload)}`,
  );
  assert.equal(
    parsed.items[0].imported!.collision,
    undefined,
    `${corruption} collision metadata is discarded`,
  );
}
const old = {
  ...imported,
  asset: { ...imported.asset, id: "older-model" },
  sourceSize: undefined,
  collision: undefined,
};
const oldItem = makeItem("imported-model", [0, 5, 0], 0, {
  imported: old,
  props: { physicsMode: "dynamic" },
});
const oldEngine = new Engine();
oldEngine.sync([oldItem]);
assert.equal(
  oldEngine.rigidBodies.body(oldItem.id)!.shapes.length,
  1,
  "older imports start with a safe bounds fallback",
);
oldEngine.rigidBodies.body(oldItem.id)!.velocity.x = 1;
const oldProducts = [oldItem];
assert.deepEqual(
  getProduct(importedProductId(oldItem), oldProducts).size,
  [0.34, 0.26, 0.34],
  "missing old bounds use a temporary fallback",
);
registerImportedCollision(old.asset, collision);
assert.deepEqual(
  getProduct(importedProductId(oldItem), oldProducts).size,
  collision.max.map((value, i) => value - collision.min[i]),
  "cached workpiece sizes refresh when legacy geometry arrives",
);
oldEngine.rigidBodies.step(1 / 60, [], () => 1);
assert.ok(
  oldEngine.rigidBodies.body(oldItem.id)!.shapes.length > 1,
  "loaded geometry rebuilds an already-running legacy body",
);
assert.ok(
  oldEngine.rigidBodies.body(oldItem.id)!.velocity.x > 0.9,
  "rebuild preserves body momentum",
);
assert.deepEqual(
  importedCollisionBoxes(old),
  parts,
  "legacy cached models gain geometry",
);

// A spawned imported workpiece also uses the compound, even after its source
// has disappeared from the visible scene (the hidden catalogue holds it).
{
  const source = { ...arch, visible: false };
  const e = new Engine();
  e.sync([source, projectile(5)]);
  const p = e.spawn(importedProductId(source), 0, 1.1, 0);
  e.rigidBodies.step(
    1 / 60,
    [p],
    () => 1,
    () => source,
  );
  const product = e.rigidBodies.world.bodies.find(
    (b) => b.collisionFilterGroup === 4,
  )!;
  assert.equal(
    product.shapes.length,
    parts.length,
    "workpiece has mesh-derived compound shapes",
  );
  assert.equal(
    e.rigidBodies.body(source.id),
    undefined,
    "catalog definition has no ghost body",
  );
}
// A fast compound workpiece is swept against each actual shape: a peg can
// pass through the opening while a peg at the solid side stops it.
for (const [x, shouldPass] of [
  [0, true],
  [0.9, false],
] as const) {
  const source = { ...arch, visible: false };
  const peg = makeItem("cabinet", [x, 0.3, 0], 0, {
    scale: 0.1,
    props: { physicsMode: "kinematic" },
  });
  const e = new Engine();
  e.sync([source, peg]);
  const frame = e.spawn(importedProductId(source), 0, 1.1, 3);
  frame.vz = -300;
  e.setRunning(true);
  e.step(1 / 60);
  assert.ok(
    shouldPass ? frame.z < -1 : frame.z > 0.2,
    `swept workpiece ${shouldPass ? "opening" : "solid side"}: ${frame.z}`,
  );
}

// Legacy-speed product contacts honor the same opening, rather than treating
// the workpiece's entire bounds as solid (the CCD fast path is not active).
for (const [x, shouldPass] of [
  [0, true],
  [0.9, false],
] as const) {
  const source = { ...arch, visible: false };
  const e = new Engine();
  e.sync([source]);
  const frame = e.spawn(importedProductId(source), 0, 1.1, 0),
    probe = e.spawn("carton", x, 0.6, 1.2);
  probe.vz = -4;
  e.setRunning(true);
  for (let i = 0; i < 45; i++) e.step(1 / 60);
  assert.equal(
    e.rigidBodies.active,
    false,
    "ordinary product motion keeps the legacy fast path",
  );
  assert.ok(
    shouldPass ? probe.z < frame.z - 0.5 : probe.z > frame.z + 0.3,
    `product ${shouldPass ? "passes the opening" : "hits the side"}: ${probe.z}, ${frame.z}`,
  );
}

// Stacking support also follows actual top patches, not the bounds over an
// open-topped U: a small carton falls into it and lands on its bottom.
{
  const uRoot = new THREE.Group();
  for (const [w, h, d, x, y] of [
    [0.2, 2, 0.5, -0.9, 1],
    [0.2, 2, 0.5, 0.9, 1],
    [2, 0.2, 0.5, 0, 0.1],
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y, 0);
    uRoot.add(mesh);
  }
  const uModel = {
    ...imported,
    sourceSize: [2, 2, 0.5] as [number, number, number],
    collision: buildImportedCollision(uRoot)!,
  };
  const source = makeItem("imported-model", [4, 0, 0], 0, {
    visible: false,
    imported: uModel,
  });
  const e = new Engine();
  e.sync([source]);
  e.spawn(importedProductId(source), 0, 1, 0);
  const carton = e.spawn("carton", 0, 2.15, 0);
  e.setRunning(true);
  for (let i = 0; i < 180; i++) e.step(1 / 60);
  assert.ok(
    carton.y - carton.hy < 0.4 && carton.support === 4,
    "carton rests inside the U instead of floating over its bounds",
  );
}
console.log(
  "imported collision: openings, stacking, units/axis, persistence and workpiece compounds OK",
);
