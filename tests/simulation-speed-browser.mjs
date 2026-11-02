import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run against the Vite development server (TEST_URL may select its port).
const url = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
const errors = [];
try {
  await context.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({
    graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: .5 },
  })));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__larpProject && window.__larpRenderer, null, { timeout: 90000 });
  const ids = await page.evaluate(async () => {
    const { makeItem } = await import('/src/data/library.ts');
    const belt = makeItem('conveyor', [0, 0, 0], 0, { name: 'Speed belt', points: [[-12, 0], [12, 0]], props: { speed: .6, active: true, stopper: false } });
    const robot = makeItem('robot', [0, 0, 3], 0, { name: 'Moving robot', script: 'while (true) { await robot.moveTo(0,1.3,4.3); await robot.moveTo(-1.3,1.3,3); }' });
    const timerRobot = makeItem('robot', [5, 0, 4], 0, { name: 'Clock robot', script: "while (true) { await robot.wait(.1); log('tick'); }" });
    const worker = makeItem('operator', [0, 0, -6], 0, { name: 'Speed worker', points: [[9, 0], [10, 0]], props: { task: 'patrol', walkSpeed: 1 } });
    const amr = makeItem('amr', [6, 0, -6], 0, { name: 'Speed AMR' });
    const packer = makeItem('packaging', [9, 0, -5], 0, { name: 'Speed packer' });
    const feeder = makeItem('feeder', [-9, 0, 4], 0, { name: 'Speed feeder', props: { active: false } });
    window.__larpProject.setItems([belt, robot, timerRobot, worker, amr, packer, feeder]);
    return { belt: belt.id, robot: robot.id, timerRobot: timerRobot.id, worker: worker.id, amr: amr.id, packer: packer.id, feeder: feeder.id };
  });
  await page.waitForFunction(ids => {
    if (!window.__larp.conveyors.has(ids.belt) || !window.__larp.robots.has(ids.robot)) return false;
    let belt, worker, joint, amr, packer, feeder;
    window.__larpRenderer.scene.traverse(o => {
      if (o.userData?.conveyorBelt && o.userData.itemId === ids.belt) belt = o;
      if (o.userData?.isRiggedWorker && o.userData.itemId === ids.worker) worker = o;
      if (o.userData?.robotJoint === 'shoulder' && o.userData.itemId === ids.robot) joint = o;
      if (o.userData?.animatedMechanism === 'amr' && o.userData.itemId === ids.amr) amr = o;
      if (o.userData?.animatedMechanism === 'packer-flap' && o.userData.itemId === ids.packer) packer = o;
      if (o.userData?.animatedMechanism === 'feeder' && o.userData.itemId === ids.feeder) feeder = o;
    });
    return belt && Number.isFinite(worker?.userData?.mixerTime) && joint && amr && packer && feeder;
  }, ids, { timeout: 90000 });

  const read = () => page.evaluate(ids => {
    const e = window.__larp;
    let belt, worker, shoulder, amr, packer, feeder, product;
    window.__larpRenderer.scene.traverse(o => {
      if (o.userData?.conveyorBelt && o.userData.itemId === ids.belt) belt = o;
      if (o.userData?.isRiggedWorker && o.userData.itemId === ids.worker) worker = o;
      if (o.userData?.robotJoint === 'shoulder' && o.userData.itemId === ids.robot) shoulder = o;
      if (o.userData?.animatedMechanism === 'amr' && o.userData.itemId === ids.amr) amr = o;
      if (o.userData?.animatedMechanism === 'packer-flap' && o.userData.itemId === ids.packer) packer = o;
      if (o.userData?.animatedMechanism === 'feeder' && o.userData.itemId === ids.feeder) feeder = o;
      if (o.isInstancedMesh && o.count > 0 && o.instanceMatrix) product = o;
    });
    let productX = null;
    if (product) { const matrix = product.matrix.clone(); product.getMatrixAt(0, matrix); productX = matrix.elements[12]; }
    const rt = e.robots.get(ids.robot), part = e.boxes[0];
    return {
      wall: performance.now(), time: e.time, renderedTime: worker.userData.renderedSimulationTime,
      mixer: worker.userData.mixerTime, beltOffset: belt.material.map.offset.x,
      partX: part?.x, productX, tip: rt.tip, busy: rt.busyT, shoulder: shoulder.rotation.z,
      ticks: e.logs.filter(l => l.text.includes('[Clock robot] tick')).length,
      amrX: amr.position.x, flap: packer.rotation.z, feederAngle: feeder.rotation.y,
      actualBudget: e.stepBudgetMs, pending: e.acc,
    };
  }, ids);
  const near = (a, b, tolerance, what) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} vs ${b}`);
  const checkVisuals = (a, b, label) => {
    const elapsed = b.renderedTime - a.renderedTime;
    assert.ok(elapsed > .05, `${label} simulation actually advances`);
    near(b.mixer - a.mixer, elapsed, .04, `${label} worker mixer follows completed simulation time`);
    near(b.beltOffset - a.beltOffset, -1.2 * elapsed, .06, `${label} belt texture follows completed simulation time`);
    near(b.feederAngle - a.feederAngle, .25 * elapsed, .04, `${label} feeder animation follows completed simulation time`);
    near(b.amrX, Math.sin(b.renderedTime * .5) * 2.4, .04, `${label} AMR follows simulation time`);
    near(b.flap, -.1 + Math.max(0, Math.sin(b.renderedTime * 1.7)) * .7, .04, `${label} packer follows simulation time`);
    assert.ok(Number.isFinite(b.productX), `${label} workpiece is actually rendered`);
  };
  const setSpeed = async value => {
    await page.getByLabel('Simulation speed multiplier').fill(String(value));
    await page.waitForFunction(value => window.__larp.speed === value, value, { timeout: 15000 });
  };
  async function measure(value) {
    await setSpeed(value);
    await page.evaluate(() => { window.__larp.reset(); window.__larp.spawn('carton', -10, .79, 0); });
    await page.waitForTimeout(350);
    const a = await read();
    await page.waitForTimeout(1500);
    const b = await read();
    checkVisuals(a, b, `${value}x`);
    assert.ok(b.partX > a.partX + .05 && b.productX > a.productX + .05, `${value}x visible workpiece moves`);
    assert.ok(b.busy > a.busy + .05, `${value}x robot is executing`);
    return { a, b, elapsed: b.renderedTime - a.renderedTime, wall: (b.wall - a.wall) / 1000 };
  }
  const normal = await measure(1), fast = await measure(4);
  const normalRate = normal.elapsed / normal.wall, fastRate = fast.elapsed / fast.wall;
  assert.ok(fastRate > normalRate * 2.5, `speed control changes actual elapsed rate: ${normalRate} -> ${fastRate}`);
  assert.ok((fast.b.partX - fast.a.partX) / fast.wall > 2.5 * (normal.b.partX - normal.a.partX) / normal.wall, 'conveyor workpiece moves faster in real time');
  assert.ok((fast.b.busy - fast.a.busy) / fast.wall > 2 * (normal.b.busy - normal.a.busy) / normal.wall, 'robot executes more motion in real time');
  assert.ok((fast.b.ticks - fast.a.ticks) > (normal.b.ticks - normal.a.ticks) * 2, 'scripted robot waits resume between substeps');
  console.log('live speed control: robot motion, scripted awaits, conveyor products, worker and mechanisms PASS', { normalRate, fastRate });

  await page.getByTitle('Pause (Space)', {exact:true}).click();
  await page.waitForFunction(() => !window.__larp.running, null, { timeout: 10000 });
  const paused = await read(); await page.waitForTimeout(700); const still = await read();
  for (const key of ['time', 'mixer', 'beltOffset', 'partX', 'shoulder', 'amrX', 'flap', 'feederAngle']) near(still[key], paused[key], 1e-8, `pause freezes ${key}`);
  await page.getByTitle('Play (Space)', {exact:true}).click();
  await page.waitForFunction(() => window.__larp.running, null, { timeout: 10000 });
  await page.waitForTimeout(800);
  assert.ok((await read()).time > still.time, 'resume advances');
  console.log('pause/resume freezes all sampled mechanisms PASS');

  // Saturate the simulation deliberately. The visible rate must be honest and
  // the visuals must use *completed* simulated seconds, not the requested 128x.
  await page.evaluate(() => {
    const e = window.__larp; e.__speedOriginalSub = e.sub;
    e.sub = function(dt) { const start = performance.now(); while (performance.now() - start < 1.3) {} return e.__speedOriginalSub(dt); };
  });
  await setSpeed(128);
  await page.waitForTimeout(2500);
  const overA = await read(); await page.waitForTimeout(1200); const overB = await read();
  const observed = (overB.renderedTime - overA.renderedTime) / ((overB.wall - overA.wall) / 1000);
  assert.ok(observed < 128 * .8, `fixture must overload: ${observed}`);
  checkVisuals(overA, overB, 'overload');
  const warning = page.locator('[role="status"][title^="Simulation is limited by device performance"]');
  assert.equal(await warning.count(), 1, 'show the achieved rate when overloaded');
  await setSpeed(.5);
  const lowA = await read(); await page.waitForTimeout(1300); const lowB = await read();
  const lowRate = (lowB.renderedTime - lowA.renderedTime) / ((lowB.wall - lowA.wall) / 1000);
  assert.ok(lowRate < 1.1, `old 128x backlog must not continue after switching to 0.5x: ${lowRate}`);
  await page.evaluate(() => { const e = window.__larp; e.sub = e.__speedOriginalSub; delete e.__speedOriginalSub; });
  console.log('overload, actual-rate warning, synchronized visuals and immediate slowdown PASS', { observed, lowRate });
  assert.deepEqual(errors, [], 'no browser errors');
} finally {
  await context.close();
  await browser.close();
}
