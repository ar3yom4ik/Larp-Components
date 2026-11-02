import assert from "node:assert/strict";
import { Engine, BELT_TOP, toWorld } from "../src/sim/engine";
import { makeItem } from "../src/data/library";
import {
  navigateLayers,
  pointIsFree,
  projectToFree,
} from "../src/sim/navigation";
import { parseProject, serializeProject } from "../src/utils/project";

// Equipment on an upper floor must not block a pedestrian below, and vice versa.
const barrier = {
  a: [-1, 0] as [number, number],
  b: [1, 0] as [number, number],
  minY: 2,
  maxY: 4,
};
assert.ok(pointIsFree(0, 0, [barrier], [], 0, 0));
assert.ok(!pointIsFree(0, 0, [barrier], [], 0, 2));
assert.deepEqual(projectToFree([0, 0], [0, 1], [barrier], [], 0), [0, 0]);

for (const mode of ["kinematic", "dynamic"] as const) {
  const stairs = makeItem("stairs", [0, 0, 0], 0, {
    props: { width: 1.5, length: 4, height: 2 },
  });
  const deck = makeItem("platform", [4, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  // Two waypoints share X/Z but belong to different floors. A valid route has
  // to go out to the stairs and return; it cannot teleport or jump a ledge.
  const worker = makeItem("operator", [4, 0, 1], 0, {
    points: [
      [0, 0],
      [0, 0],
    ],
    pointHeights: [0, 2],
    props: { task: "patrol", walkSpeed: 1, physicsMode: mode, physicsMass: 80 },
  });
  const e = new Engine();
  e.sync([stairs, deck, worker]);
  e.setRunning(true);
  let left = Infinity,
    maxY = -Infinity,
    reachedUpper = false,
    reachedLowerAgain = false;
  for (let i = 0; i < 32 * 60; i++) {
    e.step(1 / 60);
    const person = e.humans.get(worker.id)!;
    left = Math.min(left, person.x);
    maxY = Math.max(maxY, person.y);
    if (person.stage >= 2) reachedUpper = true;
    if (person.stage >= 3 && person.y < 0.25) reachedLowerAgain = true;
    if (person.y > 1.9 && person.x > 2)
      assert.ok(
        Math.abs(person.z) < 2.05,
        `${mode} stays on deck rather than cutting a ledge`,
      );
  }
  assert.ok(left < -1.4, `${mode} uses the stair connection`);
  assert.ok(maxY > 1.9 && reachedUpper, `${mode} reaches the upper waypoint`);
  assert.ok(reachedLowerAgain, `${mode} returns to the lower waypoint`);
  const text = serializeProject({
    items: [stairs, deck, worker],
    projectName: "levels",
    layoutName: "levels",
    activeLayoutId: null,
  });
  assert.deepEqual(
    parseProject(text).items[2].pointHeights,
    [0, 2],
    "waypoint heights survive export",
  );
}

// Non-axis-aligned stair and deck transforms use the same world-space route.
for (const yaw of [45, 90])
  for (const mode of ["kinematic", "dynamic"] as const) {
    const angle = (yaw * Math.PI) / 180,
      dp = toWorld(0, 0, angle, 4, 0),
      hp = toWorld(0, 0, angle, 4, 1);
    const stairs = makeItem("stairs", [0, 0, 0], yaw, {
      props: { width: 1.5, length: 4, height: 2 },
    });
    const deck = makeItem("platform", [dp[0], 0, dp[1]], yaw, {
      props: { width: 4, depth: 4, height: 2 },
    });
    const worker = makeItem("operator", [hp[0], 0, hp[1]], 0, {
      points: [
        [0, 0],
        [0, 0],
      ],
      pointHeights: [0, 2],
      props: { task: "patrol", physicsMode: mode },
    });
    const e = new Engine();
    e.sync([stairs, deck, worker]);
    e.setRunning(true);
    for (let i = 0; i < 35 * 60; i++) e.step(1 / 60);
    assert.ok(
      e.humans.get(worker.id)!.stage >= 3,
      `${mode} completes rotated stair round trip at ${yaw}°`,
    );
  }

// Two connecting stair flights form a route across three floors.
for (const mode of ["kinematic", "dynamic"] as const) {
  const a = makeItem("stairs", [0, 0, 0], 0, {
    props: { width: 1.5, length: 4, height: 2 },
  });
  const b = makeItem("platform", [4, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const c = makeItem("stairs", [8, 2, 0], 0, {
    props: { width: 1.5, length: 4, height: 2 },
  });
  const d = makeItem("platform", [12, 2, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const worker = makeItem("operator", [-2.2, 0, 0], 0, {
    points: [
      [0, 0],
      [14.2, 0],
    ],
    pointHeights: [0, 4],
    props: { task: "patrol", walkSpeed: 1, physicsMode: mode, physicsMass: 80 },
  });
  const e = new Engine();
  e.sync([a, b, c, d, worker]);
  e.setRunning(true);
  let highest = 0;
  for (let i = 0; i < 18 * 60; i++) {
    e.step(1 / 60);
    highest = Math.max(highest, e.humans.get(worker.id)!.y);
  }
  assert.ok(
    highest > 3.9 && e.humans.get(worker.id)!.stage >= 2,
    `${mode} finds the second stair flight`,
  );
}

// An explicit goal at the lip of a deck is clamped to a supported footprint,
// rather than sending the final waypoint outside the safe sampled cells.
{
  const route = navigateLayers([0, 2, 0], [1.99, 2, 0], {
    heights: (x, z) => (Math.abs(x) <= 2 && Math.abs(z) <= 2 ? [0, 2] : [0]),
    bounds: [-2, -2, 2, 2],
    barriers: [],
    obstacles: [],
  });
  assert.ok(
    route.length && route.at(-1)![0] <= 1.8,
    "edge goal stays inside the deck",
  );
}

// A deck with no connection is not a traversable shortcut to the floor below.
{
  const deck = makeItem("platform", [0, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const worker = makeItem("operator", [0, 2, 0], 0, {
    points: [
      [0, 0],
      [5, 0],
    ],
    pointHeights: [0, -2],
    props: { task: "patrol", walkSpeed: 1 },
  });
  const e = new Engine();
  e.sync([deck, worker]);
  e.setRunning(true);
  for (let i = 0; i < 6 * 60; i++) e.step(1 / 60);
  const person = e.humans.get(worker.id)!;
  assert.equal(person.status, "waiting for clear route");
  assert.ok(
    Math.abs(person.x) < 0.2 && Math.abs(person.z) < 0.2 && person.y > 1.9,
    "worker waits instead of walking over the edge",
  );
}
// Carry and tend workflows travel across levels with their live product.
for (const mode of ["kinematic", "dynamic"] as const)
  for (const task of ["carry", "tend"] as const) {
    const stairs = makeItem("stairs", [0, 0, 0], 0, {
      props: { width: 1.5, length: 4, height: 2 },
    });
    const deck = makeItem("platform", [4, 0, 0], 0, {
      props: { width: 4, depth: 4, height: 2 },
    });
    const input = makeItem("conveyor", [-4.5, 0, 0], 0, {
      points: [
        [-1.5, 0],
        [1.5, 0],
      ],
      props: { active: false, stopper: true },
    });
    const output =
      task === "carry"
        ? makeItem("crates", [4, 2, 0], 0, {
            props: { cols: 1, rows: 1, layers: 2 },
          })
        : makeItem("conveyor", [-4.5, 0, 3], 0, {
            points: [
              [-1.5, 0],
              [1.5, 0],
            ],
            props: { active: false, stopper: true },
          });
    const machine = makeItem("cnc", [4, 2, -1], 0, {
      props: { cycleTime: 0.5 },
    });
    const worker = makeItem("operator", [-4, 0, 1.3], 0, {
      props: {
        task,
        walkSpeed: 1.2,
        sourceId: input.id,
        targetId: output.id,
        machineId: machine.id,
        physicsMode: mode,
        physicsMass: 80,
      },
    });
    const e = new Engine();
    e.sync([stairs, deck, input, output, machine, worker]);
    const product = e.spawn("carton", -3.35, BELT_TOP + 0.13, 0);
    e.setRunning(true);
    let carriedHigh = false;
    for (let i = 0; i < 25 * 60; i++) {
      e.step(1 / 60);
      const h = e.humans.get(worker.id)!;
      if (h.held && h.y > 1.9) carriedHigh = true;
    }
    assert.ok(
      carriedHigh && e.humans.get(worker.id)!.completed >= 1,
      `${mode} ${task} moves product through the stair route`,
    );
    if (task === "carry")
      assert.ok(
        product.y > 2,
        "carried part was delivered to the upper pallet",
      );
    else
      assert.equal(
        product.productId,
        "machined",
        "tended part was processed and returned to the lower belt",
      );
  }

// A raised spline's access level comes from its endpoint, not the conveyor's
// base Y. Workers must climb to the part instead of grabbing through the deck.
for (const connected of [false, true])
  for (const mode of ["kinematic", "dynamic"] as const) {
    const stairs = makeItem("stairs", [0, 0, 0], 0, {
      props: { width: 1.5, length: 4, height: 2 },
    });
    const deck = makeItem("platform", [4, 0, 0], 0, {
      props: { width: 4, depth: 4, height: 2 },
    });
    const belt = makeItem("conveyor", [4, 0, 0], 0, {
      points: [
        [-1.5, 0],
        [1.5, 0],
      ],
      pointHeights: [2, 2],
      props: { active: false, stopper: true },
    });
    const pallet = makeItem("crates", [-4, 0, 0], 0, {
      props: { cols: 1, rows: 1, layers: 2 },
    });
    const worker = makeItem("operator", [4, 0, 1], 0, {
      props: {
        task: "carry",
        walkSpeed: 1.2,
        sourceId: belt.id,
        targetId: pallet.id,
        physicsMode: mode,
        physicsMass: 80,
      },
    });
    const e = new Engine();
    e.sync([...(connected ? [stairs] : []), deck, belt, pallet, worker]);
    const product = e.spawn("carton", 5.15, 2 + BELT_TOP + 0.13, 0);
    e.setRunning(true);
    let pickupY = -1;
    for (let i = 0; i < (connected ? 28 : 6) * 60; i++) {
      e.step(1 / 60);
      const person = e.humans.get(worker.id)!;
      if (person.held && pickupY < 0) pickupY = person.y;
    }
    if (connected)
      assert.ok(
        pickupY > 1.9 && e.humans.get(worker.id)!.completed >= 1,
        `${mode} climbs before collecting raised spline product`,
      );
    else
      assert.ok(
        pickupY < 0 &&
          product.state === "free" &&
          e.humans.get(worker.id)!.status === "waiting for clear route",
        `${mode} cannot collect through a disconnected deck`,
      );
  }

// People directly above one another do not block each other's floor.
{
  const deck = makeItem("platform", [4, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const low = makeItem("operator", [3, 0, 0], 0, {
    points: [
      [0, 0],
      [1, 0],
    ],
    pointHeights: [0, 0],
    props: { task: "patrol" },
  });
  const high = makeItem("operator", [4, 2, 0], 0, {
    points: [
      [0, 0],
      [-1, 0],
    ],
    pointHeights: [0, 0],
    props: { task: "patrol" },
  });
  const e = new Engine();
  e.sync([deck, low, high]);
  e.setRunning(true);
  for (let i = 0; i < 5 * 60; i++) e.step(1 / 60);
  assert.ok(
    e.humans.get(low.id)!.stage >= 2 && e.humans.get(high.id)!.stage >= 2,
    "workers on separated levels pass independently",
  );
}

// A remote falling machine refreshes its pose, not every person's A* route.
{
  const stairs = makeItem("stairs", [0, 0, 0], 0, {
    props: { width: 1.5, length: 4, height: 2 },
  });
  const deck = makeItem("platform", [4, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const machine = makeItem("cabinet", [15, 10, 0], 0, {
    props: { physicsMode: "dynamic" },
  });
  const worker = makeItem("operator", [4, 0, 1], 0, {
    points: [
      [0, 0],
      [0, 0],
    ],
    pointHeights: [0, 2],
    props: { task: "patrol" },
  });
  const e = new Engine();
  e.sync([stairs, deck, machine, worker]);
  e.setRunning(true);
  for (let i = 0; i < 100; i++) e.step(1 / 60);
  const key = e.humans.get(worker.id)!.targetKey;
  for (let i = 0; i < 60; i++) e.step(1 / 60);
  assert.equal(
    e.humans.get(worker.id)!.targetKey,
    key,
    "remote motion does not repeatedly invalidate the route",
  );
  assert.ok(
    e.getPhysicsPose(machine.id)!.position[1] < 9,
    "dynamic pose still refreshes",
  );
}
// Moving equipment that actually enters a cached route is still avoided and
// triggers a replan when local progress is obstructed.
{
  const deck = makeItem("platform", [12, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const block = makeItem("cabinet", [0, 0, 4], 0, {
    props: { physicsMode: "dynamic", physicsMass: 100 },
  });
  const worker = makeItem("operator", [-4, 0, 0], 0, {
    points: [
      [0, 0],
      [8, 0],
    ],
    pointHeights: [0, 0],
    props: { task: "patrol", walkSpeed: 1 },
  });
  const e = new Engine();
  e.sync([deck, block, worker]);
  e.setRunning(true);
  let deviation = 0;
  for (let i = 0; i < 14 * 60; i++) {
    if (i === 90) {
      const b = e.rigidBodies.body(block.id)!;
      b.position.z = 0;
      b.aabbNeedsUpdate = true;
      b.wakeUp();
    }
    e.step(1 / 60);
    deviation = Math.max(deviation, Math.abs(e.humans.get(worker.id)!.z));
  }
  assert.ok(
    deviation > 0.45 && e.humans.get(worker.id)!.stage >= 2,
    "worker reroutes around newly moved equipment",
  );
}

// Clearing an overlapping spawn on an upper deck must not project a worker
// over its edge, even when the nearest free point lies outside the deck.
{
  const platform = makeItem("platform", [4, 0, 0], 0, {
    scale: 1,
    props: { width: 4, depth: 4, height: 2 },
  });
  const cabinet = makeItem("cabinet", [5.5, 2, 0], 0, { scale: 1 });
  const worker = makeItem("operator", [5.8, 2, 0], 0, {
    props: { physicsMode: "kinematic" },
  });
  const e = new Engine();
  e.sync([platform, cabinet, worker]);
  const person = e.humans.get(worker.id)!;
  assert.ok(
    person.x < 5.82 && Math.abs(person.z) < 1.82,
    `spawn relocation stays on deck: ${person.x},${person.z}`,
  );
  assert.ok(
    Math.hypot(person.x - 5.5, person.z) > 0.65,
    "spawn relocated clear of cabinet",
  );
}
// A moved obstacle can make a worker sidestep toward an upper edge. Keep the
// footprint supported while rerouting; a physical walker may have small inertia.
for (const mode of ["kinematic", "dynamic"] as const) {
  const deck = makeItem("platform", [0, 0, 0], 0, {
    props: { width: 4, depth: 4, height: 2 },
  });
  const block = makeItem("cabinet", [-4, 2, 0], 0, {
    props: { physicsMode: "dynamic", physicsMass: 100 },
  });
  const worker = makeItem("operator", [1.65, 2, -1.5], 0, {
    points: [
      [0, 0],
      [0, 3],
    ],
    pointHeights: [0, 0],
    props: { task: "patrol", walkSpeed: 1, physicsMode: mode, physicsMass: 80 },
  });
  const e = new Engine();
  e.sync([deck, block, worker]);
  e.setRunning(true);
  let maxX = -Infinity,
    lowest = Infinity;
  for (let i = 0; i < 15 * 60; i++) {
    if (i === 90) {
      const body = e.rigidBodies.body(block.id)!;
      body.position.set(1.3, 3, 0);
      body.velocity.setZero();
      body.angularVelocity.setZero();
      body.aabbNeedsUpdate = true;
      body.wakeUp();
    }
    e.step(1 / 60);
    const person = e.humans.get(worker.id)!;
    maxX = Math.max(maxX, person.x);
    lowest = Math.min(lowest, person.y);
  }
  assert.ok(
    maxX < (mode === "kinematic" ? 1.825 : 1.9) && lowest > 1.9,
    `${mode} avoids the ledge while rerouting (max x=${maxX}, min y=${lowest})`,
  );
  assert.ok(
    e.humans.get(worker.id)!.stage >= 2,
    `${mode} still reaches the destination`,
  );
}

console.log(
  "layered navigation: overlapping floors, stair round-trips, workflows, ledges and three-level routes OK",
);
