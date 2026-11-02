import assert from "node:assert/strict";
import { Engine } from "../src/sim/engine";
import { makeItem } from "../src/data/library";
import { RigidBodyWorld } from "../src/sim/rigidBodies";
import * as THREE from "three";
const dt = 1 / 60;

// A translating rigid body must not cross thin fixed geometry even when it
// moves many body widths in one frame. Exercise full XYZ wall orientation.
for (const speed of [20, 200, 10000])
  for (const rotation of [0, 35]) {
    const wall = makeItem("wall", [0, 0, 0], rotation, {
      rotationX: rotation / 3,
      rotationZ: rotation / 4,
      props: { physicsMode: "kinematic" },
    });
    const piece = makeItem("cabinet", [0, 1, 3], 0, {
      scale: 0.1,
      props: { physicsMode: "dynamic", physicsMass: 1 },
    });
    const w = new RigidBodyWorld();
    w.sync([wall, piece]);
    w.body(piece.id)!.velocity.set(0, 0, -speed);
    for (let i = 0; i < (speed === 20 ? 12 : 1); i++) w.step(dt, [], () => 1);
    const body = w.body(piece.id)!;
    const normal = new THREE.Vector3(0, 0, 1);
    // The separating plane belongs to the wall, not to the world Z axis.
    const wallBody = w.body(wall.id)!;
    normal
      .set(0, 0, 1)
      .applyQuaternion(
        new THREE.Quaternion(
          wallBody.quaternion.x,
          wallBody.quaternion.y,
          wallBody.quaternion.z,
          wallBody.quaternion.w,
        ),
      );
    const signed =
      normal.x * body.position.x +
      normal.y * body.position.y +
      normal.z * body.position.z;
    assert.ok(
      signed > 0.08,
      `dynamic body tunneled: speed=${speed} rotation=${rotation} distance=${signed}`,
    );
  }

// No spurious hit where a high-speed trajectory passes outside the wall ends.
{
  const wall = makeItem("wall", [0, 0, 0], 0, {
    props: { physicsMode: "kinematic" },
  });
  const piece = makeItem("cabinet", [4, 1, 3], 0, {
    scale: 0.1,
    props: { physicsMode: "dynamic", physicsMass: 1 },
  });
  const w = new RigidBodyWorld();
  w.sync([wall, piece]);
  w.body(piece.id)!.velocity.set(0, 0, -400);
  w.step(dt, [], () => 1);
  assert.ok(
    w.pose(piece.id)!.position[2] < -2,
    "near miss is not a bounding-sphere ghost collision",
  );
}

// A fast dynamic body colliding with another dynamic body transfers momentum.
{
  const a = makeItem("cabinet", [0, 1, 3], 0, {
    scale: 0.1,
    props: { physicsMode: "dynamic", physicsMass: 1 },
  });
  const b = makeItem("cabinet", [0, 1, 0], 0, {
    scale: 0.1,
    props: { physicsMode: "dynamic", physicsMass: 4 },
  });
  const w = new RigidBodyWorld();
  w.sync([a, b]);
  w.body(a.id)!.velocity.set(0, 0, -300);
  w.step(dt, [], () => 1);
  assert.ok(
    w.pose(a.id)!.position[2] > w.pose(b.id)!.position[2],
    "dynamic pair did not exchange sides",
  );
  assert.ok(
    w.body(b.id)!.velocity.z < -10,
    "impact transfers momentum to the target",
  );
}

// A rapidly rotating compound gets a conservative angular sweep too.
{
  const arm = makeItem("fence", [0, 1.5, 0], 0, {
    points: [
      [-2, 0],
      [2, 0],
    ],
    props: { height: 0.2, physicsMode: "dynamic", physicsMass: 5 },
  });
  const post = makeItem("cabinet", [0, 1.4, 1.4], 0, {
    scale: 0.3,
    props: { physicsMode: "kinematic" },
  });
  const w = new RigidBodyWorld();
  w.sync([arm, post]);
  const body = w.body(arm.id)!;
  body.angularVelocity.y = 150;
  w.step(dt, [], () => 1);
  assert.ok(
    Math.abs(body.angularVelocity.y) < 1,
    "rotating compound stops at its first potential impact",
  );
  assert.ok(
    Math.abs(w.pose(arm.id)!.rotation) < 100,
    "rotation is clamped before sweeping through the post",
  );
}

// Extreme falling bodies also sweep against the floor plane.
{
  const a = makeItem("cabinet", [0, 5, 0], 0, {
    scale: 0.1,
    props: { physicsMode: "dynamic" },
  });
  const w = new RigidBodyWorld();
  w.sync([a]);
  w.body(a.id)!.velocity.y = -1000;
  w.step(dt, [], () => 1);
  assert.ok(w.pose(a.id)!.position[1] > -0.01, "fast body stopped at floor");
}

// Workpieces use the same continuous pass, including legacy (non-explicit)
// fixed scene colliders and travel beyond the ordinary scene bounds.
for (const mode of ["legacy", "kinematic"] as const)
  for (const speed of [200, 10000]) {
    const wall = makeItem("wall", [0, 0, 0], 0, {
      props: mode === "legacy" ? {} : { physicsMode: mode },
    });
    const e = new Engine();
    e.sync([wall]);
    const part = e.spawn("carton", 0, 1, 3);
    part.vz = -speed;
    e.setRunning(true);
    e.step(dt);
    assert.ok(
      e.boxes.includes(part),
      `fast ${mode} part was not prematurely deleted`,
    );
    assert.ok(part.z > 0.1, `fast ${mode} part tunneled: ${speed}, ${part.z}`);
  }

// Fast workpieces meet the true tilted wall plane, not its ground projection.
{
  const wall = makeItem("wall", [0, 0, 0], 25, {
    rotationX: 20,
    rotationZ: -10,
    props: { physicsMode: "kinematic" },
  });
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      (20 * Math.PI) / 180,
      (25 * Math.PI) / 180,
      (-10 * Math.PI) / 180,
      "XYZ",
    ),
  );
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q),
    onPlane = new THREE.Vector3(0, 1.5, 0);
  onPlane.addScaledVector(normal, -onPlane.dot(normal));
  const start = onPlane.clone().addScaledVector(normal, 3);
  const e = new Engine();
  e.sync([wall]);
  const part = e.spawn("carton", start.x, start.y, start.z);
  part.vx = -normal.x * 200;
  part.vy = -normal.y * 200;
  part.vz = -normal.z * 200;
  e.setRunning(true);
  e.step(dt);
  assert.ok(
    normal.dot(new THREE.Vector3(part.x, part.y, part.z)) > 0.1,
    "workpiece is stopped at the tilted face",
  );
}

// A high-speed falling product lands on the upper belt rather than crossing
// it and being deleted below the scene in the same simulation step.
{
  const belt = makeItem("conveyor", [0, 0, 0], 0, {
    points: [
      [-2, 0],
      [2, 0],
    ],
    props: { active: false },
  });
  const e = new Engine();
  e.sync([belt]);
  const part = e.spawn("carton", 0, 6, 0);
  part.vy = -1000;
  e.setRunning(true);
  e.step(dt);
  assert.ok(
    e.boxes.includes(part) && part.y - part.hy > 0.6,
    `fast product stops on belt, bottom=${part.y - part.hy}`,
  );
}

// Crossing products collide in the same frame, despite the separate legacy
// conveyor integrator and the solver's normal product/product filter.
{
  const e = new Engine();
  e.sync([]);
  const a = e.spawn("carton", 0, 1, 3),
    b = e.spawn("carton", 0, 1, -3);
  a.vz = -300;
  b.vz = 300;
  e.setRunning(true);
  e.step(dt);
  assert.ok(a.z > b.z, "fast products cannot exchange sides without a contact");
  assert.ok(a.vz > -300 && b.vz < 300, "both products receive the impact");
}
console.log(
  "continuous physics: fast bodies, floor, products, moving targets and near misses OK",
);
