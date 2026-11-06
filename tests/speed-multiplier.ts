import assert from 'node:assert/strict';
import { Engine, BELT_TOP, DT } from '../src/sim/engine';
import { simulationFrameBudget, simulationRateSampleMs } from '../src/sim/frameBudget';
import { makeItem } from '../src/data/library';

const near = (actual: number, expected: number, tolerance: number, message: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

// Clock math, fractional steps, slow frames, and invalid multipliers.
{
  const e = new Engine(); e.setRunning(true); e.stepBudgetMs = 40;
  e.setSpeed(2); e.step(.5);
  near(e.time, 1, DT + 1e-8, 'slow real frame at 2x');
  e.setSpeed(.5); const before = e.time; e.step(.5);
  near(e.time - before, .25, DT + 1e-8, 'half speed');
  e.setSpeed(NaN); assert.equal(e.speed, 1);
  e.setSpeed(-5); assert.equal(e.speed, .01);
}

// A slow GPU must not force the simulation into a 1.2ms slice. At the same
// time, CPU-heavy simulation and pathological frame times remain bounded.
assert.ok(simulationFrameBudget(80, 0) > simulationFrameBudget(16, 0) * 3);
assert.ok(simulationFrameBudget(80, 60) < simulationFrameBudget(80, 0));
assert.equal(simulationFrameBudget(1000, 0), 40);
assert.ok(simulationFrameBudget(NaN, NaN) >= 5);
assert.equal(simulationRateSampleMs(1), 1000);
assert.equal(simulationRateSampleMs(.01), 10_000);
assert.equal(simulationRateSampleMs(.05), 2000);
assert.equal(simulationRateSampleMs(NaN), 1000);

async function movement(speed: number, frames: number) {
  const belt = makeItem('conveyor', [0, 0, 0], 0, {
    points: [[-10, 0], [10, 0]], props: { speed: .6, active: true, stopper: false },
  });
  const robot = makeItem('robot', [0, 0, 3], 0, {
    script: 'await robot.moveTo(0, 1.3, 4.3);',
  });
  const worker = makeItem('operator', [0, 0, -6], 0, {
    points: [[8, 0], [9, 0]], props: { task: 'patrol', walkSpeed: 1 },
  });
  const falling = makeItem('cabinet', [6, 8, 6], 0, {
    props: { physicsMode: 'dynamic', physicsMass: 20 },
  });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([belt, robot, worker, falling]);
  const part = e.spawn('carton', -8, BELT_TOP + .13, 0);
  const initialTip = [...e.robots.get(robot.id)!.tip];
  const initialHuman = e.humans.get(worker.id)!;
  const initialHumanX = initialHuman.x, initialHumanZ = initialHuman.z;
  e.setSpeed(speed); e.setRunning(true);
  for (let frame = 0; frame < frames; frame++) await e.stepAsync(1 / 60);
  const rt = e.robots.get(robot.id)!, human = e.humans.get(worker.id)!;
  return {
    time: e.time, part: part.x + 8, tip: rt.tip,
    robotDistance: Math.hypot(...rt.tip.map((v, i) => v - initialTip[i])),
    workerDistance: Math.hypot(human.x - initialHumanX, human.z - initialHumanZ),
    workerPhase: human.phase, bodyY: e.getPhysicsPose(falling.id)!.position[1],
    status: rt.status, error: rt.error,
  };
}

const slow = await movement(.5, 20), normal = await movement(1, 20), fast = await movement(4, 20);
assert.equal(slow.error, null); assert.equal(normal.error, null); assert.equal(fast.error, null);
assert.ok(normal.part > slow.part * 1.7 && fast.part > normal.part * 3.5, `conveyor workpiece must scale: ${JSON.stringify({slow, normal, fast})}`);
assert.ok(normal.robotDistance > slow.robotDistance * 1.4 && fast.robotDistance > normal.robotDistance * 2, `robot tip must scale: ${JSON.stringify({slow, normal, fast})}`);
assert.ok(normal.workerDistance > slow.workerDistance * 1.5 && fast.workerDistance > normal.workerDistance * 3, `worker travel must scale: ${JSON.stringify({slow, normal, fast})}`);
assert.ok(normal.workerPhase > slow.workerPhase * 1.5 && fast.workerPhase > normal.workerPhase * 3, 'worker walk phase follows the simulation');
assert.ok(fast.bodyY < normal.bodyY && normal.bodyY < slow.bodyY, 'dynamic gravity follows the multiplier');

// Re-group the same fixed steps into fewer render frames: robot commands, belt
// products, workers and physics must arrive at the same simulated state.
const ordinaryFrames = await movement(1, 60), groupedFrames = await movement(4, 15);
near(ordinaryFrames.time, groupedFrames.time, 1e-8, 'equal simulated time');
near(ordinaryFrames.part, groupedFrames.part, 1e-8, 'equal workpiece motion');
near(ordinaryFrames.workerDistance, groupedFrames.workerDistance, 1e-8, 'equal worker motion');
near(ordinaryFrames.workerPhase, groupedFrames.workerPhase, 1e-8, 'equal walk phase');
near(ordinaryFrames.bodyY, groupedFrames.bodyY, 1e-8, 'equal rigid body pose');
for (let i = 0; i < 3; i++) near(ordinaryFrames.tip[i], groupedFrames.tip[i], 1e-8, 'equal robot pose');

// Script awaits must resume between substeps, not only once per browser frame.
// This used to cap the 16x robot at just 60 commands in 16 simulated seconds.
async function scripted(speed: number) {
  const robot = makeItem('robot', [0, 0, 0], 0, {
    name: 'Timed robot', script: "while (true) { await robot.wait(.1); log('cycle'); }",
  });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([robot]); e.setSpeed(speed); e.setRunning(true);
  for (let frame = 0; frame < 60; frame++) await e.stepAsync(1 / 60);
  return { time: e.time, cycles: e.logs.filter(line => line.text.includes('[Timed robot] cycle')).length };
}
const script1 = await scripted(1), script16 = await scripted(16);
assert.ok(script16.cycles > 120 && script16.cycles > script1.cycles * 12, `scripted commands must scale: ${JSON.stringify({script1, script16})}`);
near(script16.time, 16, DT, 'scripted 16x clock');

// The native visual palletizing program must also complete real operations
// sooner at higher speed, not just move the numeric simulation clock.
async function visualProgram(speed: number) {
  const belt = makeItem('conveyor', [-2, 0, 0], 0, { points: [[0, 0], [1, 0], [2, 0]], props: { speed: 0, active: true, stopper: true } });
  const pallet = makeItem('crates', [-.3, 0, 2.9], 0, { props: { product: 'carton', cols: 3, rows: 2, layers: 4, gap: .04 } });
  const robot = makeItem('robot', [.3, 0, 1.45], 0, {
    props: { gripper: 'vacuum', speed: 70 },
    program: { mode: 'palletize', sourceId: belt.id, targetId: pallet.id, repeat: true, delay: 0, clearance: .3 },
  });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([belt, pallet, robot]);
  e.spawn('carton', -.35, BELT_TOP + .13, 0); e.setSpeed(speed); e.setRunning(true);
  for (let frame = 0; frame < 240; frame++) await e.stepAsync(1 / 60);
  assert.equal(e.robots.get(robot.id)!.error, null);
  return e.robots.get(robot.id)!.cycles;
}
assert.equal(await visualProgram(1), 0, 'visual program is still moving after four real seconds at 1x');
assert.ok(await visualProgram(4) >= 1, 'visual palletizer completes a placement at 4x');

// Machine cycles and world.wait() must share the same accelerated timeline.
async function machineProgress(speed: number) {
  const item = makeItem('cnc', [0, 0, 0], 0, { props: { cycleTime: 4, inputProduct: 'any' } });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([item]);
  const machine = e.machines.get(item.id)!, table = machine.table();
  const part = e.spawn('carton', table.x, table.y + .13, table.z);
  assert.ok(e.process(machine, part, 4)); e.setSpeed(speed); e.setRunning(true);
  for (let frame = 0; frame < 30; frame++) await e.stepAsync(1 / 60);
  return machine.progress;
}
const machine1 = await machineProgress(1), machine4 = await machineProgress(4);
assert.ok(machine4 > machine1 * 3.5, `machine timer must scale: ${machine1} -> ${machine4}`);
{
  const robot = makeItem('robot', [0, 0, 0], 0, { name: 'World timer', script: "while (true) { await world.wait(.1); log('tick'); }" });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([robot]); e.setSpeed(16); e.setRunning(true);
  for (let frame = 0; frame < 60; frame++) await e.stepAsync(1 / 60);
  assert.ok(e.logs.filter(line => line.text.includes('[World timer] tick')).length > 120, 'world timer promises resume between substeps');
}

// Timers and feeder generation use simulated seconds, too.
async function feeder(speed: number) {
  const item = makeItem('feeder', [-8, 0, 0], 0, { props: { active: true, product: 'carton', interval: .5 } });
  const belt = makeItem('conveyor', [0, 0, 0], 0, { points: [[-10, 0], [10, 0]], props: { speed: 2, active: true } });
  const e = new Engine(); e.stepBudgetMs = 40; e.sync([item, belt]); e.setSpeed(speed); e.setRunning(true);
  for (let frame = 0; frame < 120; frame++) await e.stepAsync(1 / 60);
  return e.stats.spawned;
}
const feedingNormal = await feeder(1), feedingFast = await feeder(4);
assert.ok(feedingFast > feedingNormal * 1.5, `feeder must speed up: ${feedingNormal} -> ${feedingFast}`);

// Simulate sustained CPU saturation with a deterministic performance clock.
// Speed changes and pause/resume must not replay the stale high-speed demand.
{
  const nativePerformance = globalThis.performance;
  let fakeMs = 0;
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => ++fakeMs } });
  try {
    const e = new Engine(); e.setRunning(true); e.setSpeed(40); e.stepBudgetMs = 1;
    for (let frame = 0; frame < 240; frame++) e.step(1 / 60);
    const pending = (e as unknown as { acc: number }).acc;
    assert.ok(pending <= 40 * .25 + 1e-9, `saturated backlog must be bounded, got ${pending}`);
    e.setSpeed(.5);
    assert.ok((e as unknown as { acc: number }).acc < DT, 'changing speed clears old demand');
    const start = e.time;
    for (let frame = 0; frame < 120; frame++) e.step(1 / 60);
    near(e.time - start, 1, DT + 1e-8, 'lower speed takes effect after overload');
    e.setSpeed(40);
    for (let frame = 0; frame < 60; frame++) e.step(1 / 60);
    e.setRunning(false);
    assert.ok((e as unknown as { acc: number }).acc < DT, 'pause clears old demand');
    const paused = e.time;
    e.step(20); await e.stepAsync(20); assert.equal(e.time, paused, 'nothing advances while paused');
    e.setSpeed(.5); e.setRunning(true);
    for (let frame = 0; frame < 120; frame++) await e.stepAsync(1 / 60);
    near(e.time - paused, 1, DT + 1e-8, 'resume respects the new multiplier');
    const revision = e.clockRevision; e.reset();
    assert.equal(e.time, 0); assert.equal(e.clockRevision, revision + 1);
    e.setSpeed(Number.MAX_VALUE); e.step(2);
    assert.ok(Number.isFinite((e as unknown as { acc: number }).acc), 'extreme speed cannot overflow the accumulator');
    e.setSpeed(.5);
    const extremeStart = e.time;
    for (let frame = 0; frame < 120; frame++) e.step(1 / 60);
    near(e.time - extremeStart, 1, DT + 1e-8, 'ordinary speed still works after an extreme multiplier');
  } finally {
    Object.defineProperty(globalThis, 'performance', { configurable: true, value: nativePerformance });
  }
}

console.log('simulation speed: robot scripts, belts/workpieces, workers, physics, feeders, grouping, pause and overload OK');
