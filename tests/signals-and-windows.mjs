import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const errors = [];
const lowGraphics = () => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 2, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: 0.5 } }));

async function dragResize(page, dialog, dx, dy) {
  const before = await dialog.boundingBox();
  const grip = dialog.getByRole('separator', { name: 'Resize window' });
  const box = await grip.boundingBox();
  assert.ok(before && box, 'resize grip must be visible');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up();
  const after = await dialog.boundingBox();
  assert.ok(after, 'window remains visible');
  return { before, after, grip };
}

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(lowGraphics);
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  const ids = await page.evaluate(async () => {
    const { makeItem } = await import('/src/data/library.ts');
    const feeder = makeItem('feeder', [3, 0, 0], 0, { name: 'Signal feeder' });
    const blue = makeItem('button', [-3, 0, 0], 0, { name: 'Blue button' });
    const red = makeItem('button', [-3, 0, 2], 0, { name: 'Red button' });
    const sensor = makeItem('sensor', [0, 0, -3], 0, { name: 'Proximity input' });
    const plc = makeItem('plc', [3, 0, 3], 0, { name: 'Branch controller' });
    window.__larpProject.setItems([feeder, blue, red, sensor, plc]);
    return { feeder: feeder.id, blue: blue.id, red: red.id, sensor: sensor.id, plc: plc.id };
  });
  await page.waitForFunction(({ feeder }) => window.__larp.feeders.has(feeder), ids);
  await page.getByRole('button', { name: 'Edit signal connections' }).click();
  for (const [name, id, color] of [['Blue button', ids.blue, '#0055ff'], ['Red button', ids.red, '#ff2222'], ['Proximity input', ids.sensor, '#18ca78']]) {
    await page.getByRole('button', { name: `Signal output: ${name}` }).click();
    const status = page.locator('[role="status"]').filter({ hasText: 'Choose an IN port for' });
    await status.getByLabel('Wire colour').fill(color);
    await page.getByRole('button', { name: 'Signal input: Signal feeder' }).click();
    await page.waitForFunction(({ id, feeder }) => window.__larp.items.find((item) => item.id === id)?.props.connectedTo === feeder, { id, feeder: ids.feeder });
  }
  // Add a second destination to the same blue source, remove only that branch,
  // then undo. The first destination and per-source colour must survive.
  await page.getByRole('button', { name: 'Signal output: Blue button' }).click();
  await page.getByRole('button', { name: 'Signal input: Branch controller' }).click();
  await page.waitForFunction(({ blue, plc }) => window.__larp.items.find((item) => item.id === blue)?.signalTargets?.includes(plc), ids);
  await page.getByRole('button', { name: 'Signal output: Blue button' }).click();
  await page.getByRole('button', { name: 'Remove connection: Branch controller' }).click();
  await page.waitForFunction(({ blue }) => !window.__larp.items.find((item) => item.id === blue)?.signalTargets?.length, ids);
  await page.keyboard.press('Control+z');
  await page.waitForFunction(({ blue, plc }) => window.__larp.items.find((item) => item.id === blue)?.signalTargets?.includes(plc), ids);
  await page.getByRole('button', { name: 'Edit signal connections' }).click();
  await page.evaluate(({ feeder }) => window.__larpProject.select(feeder), ids);
  await page.getByText('Signal-controlled', { exact: true }).waitFor();
  const project = await page.evaluate(async () => (await import('/src/utils/project.ts')).parseProject(window.__larpProject.getText()));
  assert.equal(project.items.find((item) => item.id === ids.blue).props.wireColor, '#0055ff');
  assert.equal(project.items.find((item) => item.id === ids.red).props.wireColor, '#ff2222');
  assert.deepEqual(project.items.find((item) => item.id === ids.blue).signalTargets, [ids.plc]);

  await page.evaluate(() => window.__larp.reset());
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => window.__larp.stats.spawned), 0, 'wired feeder remains idle without signals');
  await page.evaluate(({ blue }) => window.__larpProject.select(blue), ids);
  await page.getByRole('button', { name: 'Press button', exact: true }).click();
  await page.waitForFunction(() => window.__larp.stats.spawned === 1, null, { timeout: 20000 });
  await page.waitForFunction(({ blue }) => {
    let wire; window.__larpRenderer.scene.traverse((object) => { if (object.userData.signalWire && object.userData.sourceId === blue && object.userData.targetId === window.__larp.items.find((item) => item.name === 'Signal feeder')?.id) wire = object; });
    return wire?.getObjectByName('signal-packet')?.visible;
  }, ids, { timeout: 20000 });
  const snapshot = async (id, targetId = ids.feeder) => page.evaluate(({ sourceId, targetId }) => {
    let wire; window.__larpRenderer.scene.traverse((object) => { if (object.userData.signalWire && object.userData.sourceId === sourceId && object.userData.targetId === targetId) wire = object; });
    const packet = wire.getObjectByName('signal-packet'), cable = wire.getObjectByName('signal-cable');
    return { visible: packet.visible, progress: packet.userData.progress, position: packet.position.toArray(), color: cable.material.color.getHexString(), brightness: cable.material.emissiveIntensity };
  }, { sourceId: id, targetId });
  const start = await snapshot(ids.blue), other = await snapshot(ids.red), branch = await snapshot(ids.blue, ids.plc);
  assert.equal(start.color, '0055ff'); assert.equal(branch.color, '0055ff'); assert.equal(other.color, 'ff2222');
  assert.ok(start.brightness > other.brightness && branch.brightness > other.brightness, 'all branches of only the active source glow brighter');
  await page.evaluate(({ blue }) => window.__larp.setButton(blue, false), ids);
  await page.waitForFunction(({ blue }) => {
    let wire; window.__larpRenderer.scene.traverse((object) => { if (object.userData.signalWire && object.userData.sourceId === blue && object.userData.targetId === window.__larp.items.find((item) => item.name === 'Signal feeder')?.id) wire = object; });
    const packet = wire?.getObjectByName('signal-packet'); return packet && packet.userData.progress === 1 && !packet.visible;
  }, ids, { timeout: 20000 });
  const end = await snapshot(ids.blue);
  assert.ok(end.position[0] > start.position[0], 'pulse moves from button towards the feeder');
  assert.ok(Math.abs(end.position[0] - 3.43) < 0.02 && Math.abs(end.position[1] - 2.1) < 0.02, 'pulse reaches the feeder connector');
  assert.ok(end.brightness < start.brightness, 'wire dims again after the pulse');
  assert.equal(await page.evaluate(() => window.__larp.stats.spawned), 1, 'held/short signal makes one part');

  // A robot output is selectable in the viewport and really gates a feeder;
  // its output is on while the robot holds a part, not just a decorative wire.
  const robotId = await page.evaluate(async ({ feeder }) => {
    const { makeItem } = await import('/src/data/library.ts');
    window.__larp.setRunning(false);
    const robot = makeItem('robot', [-3, 0, 0], 0, { name: 'Signal robot', props: {outputMode: 'moving'} });
    const feederItem = window.__larp.items.find((item) => item.id === feeder);
    window.__larpProject.setItems([feederItem, robot]);
    return robot.id;
  }, ids);
  await page.waitForFunction((id) => window.__larp.robots.has(id), robotId);
  await page.getByRole('button', { name: 'Edit signal connections' }).click();
  await page.getByRole('button', { name: 'Signal output: Signal robot' }).click();
  await page.getByRole('button', { name: 'Signal input: Signal feeder' }).click();
  await page.waitForFunction(({ robot, feeder }) => window.__larp.items.find((item) => item.id === robot)?.props.connectedTo === feeder, { robot: robotId, feeder: ids.feeder });
  await page.getByRole('button', { name: 'Edit signal connections' }).click();
  await page.evaluate(() => { window.__larp.reset(); window.__larp.setRunning(true); });
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(() => window.__larp.stats.spawned), 0, 'robot-connected feeder waits while the robot is idle');
  await page.evaluate((id) => {
    const held = window.__larp.spawn('carton', -3, 0.8, 0); held.state = 'held';
    window.__larp.robots.get(id).held = held;
  }, robotId);
  await page.waitForFunction(() => window.__larp.stats.spawned === 2, null, { timeout: 20000 });
  await page.waitForFunction(({ robot, feeder }) => {
    let wire; window.__larpRenderer.scene.traverse((object) => { if (object.userData.signalWire && object.userData.sourceId === robot && object.userData.targetId === feeder) wire = object; });
    return wire?.getObjectByName('signal-cable')?.material.emissiveIntensity > 1;
  }, { robot: robotId, feeder: ids.feeder }, { timeout: 20000 });
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__larp.stats.spawned), 2, 'holding signal feeds once');

  // The settings frame, factory in both modes, model import, floor map,
  // floating panels and simulation settings are all independently resizable.
  await page.getByTitle('Settings', { exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Settings' });
  let resized = await dragResize(page, dialog, -160, -120);
  assert.ok(resized.after.width <= resized.before.width - 140 && resized.after.height <= resized.before.height - 100, 'settings resize with pointer');
  await resized.grip.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  const keyboardSize = await dialog.boundingBox();
  assert.ok(keyboardSize.width > resized.after.width && keyboardSize.height > resized.after.height, 'settings resize with keyboard');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByTitle('Settings', { exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Settings' });
  const reopened = await dialog.boundingBox();
  assert.ok(Math.abs(reopened.width - keyboardSize.width) < 2 && Math.abs(reopened.height - keyboardSize.height) < 2, 'settings size persists');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'AI Factory', exact: true }).first().click();
  dialog = page.getByRole('dialog', { name: 'AI Factory' });
  resized = await dragResize(page, dialog, -300, -180);
  assert.ok(resized.after.width < resized.before.width - 250 && resized.after.height < resized.before.height - 130, 'graph window resizes');
  await dialog.getByRole('button', { name: 'Form', exact: true }).click();
  resized = await dragResize(page, dialog, -90, -70);
  assert.ok(resized.after.width < resized.before.width - 70 && resized.after.height < resized.before.height - 50, 'form window resizes');
  await dialog.locator(':scope > div').first().getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByTitle('Import 3D model', { exact: true }).first().click();
  dialog = page.getByRole('dialog', { name: 'Import 3D model' });
  resized = await dragResize(page, dialog, -100, -80);
  assert.ok(resized.after.width < resized.before.width - 80 && resized.after.height < resized.before.height - 60, 'import window resizes');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Open floor map' }).click();
  dialog = page.getByRole('dialog', { name: 'Floor map' });
  resized = await dragResize(page, dialog, -100, -70);
  assert.ok(resized.after.width < resized.before.width - 80 && resized.after.height < resized.before.height - 50, 'floor map resizes');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.locator('[data-docked-panel="catalog"]').getByRole('button', { name: 'Detach panel' }).click();
  dialog = page.locator('[data-floating-panel="catalog"]');
  resized = await dragResize(page, dialog, 80, -80);
  assert.ok(resized.after.width > resized.before.width + 60 && resized.after.height < resized.before.height - 60, 'detached panel resizes');
  await dialog.getByRole('button', { name: 'Dock panel' }).click();

  await page.getByRole('button', { name: 'Simulation settings', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Simulation settings' });
  resized = await dragResize(page, dialog, -50, 40); // player is bottom-aligned: use its upper corner
  assert.ok(resized.after.width < resized.before.width - 30 && resized.after.height < resized.before.height - 20, 'simulation settings resizes');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.close();

  // A touch sheet and the factory dialog can also be resized on a phone.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  phone.on('pageerror', (error) => errors.push(error.message));
  await phone.addInitScript(lowGraphics);
  await phone.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  const cdp = await phone.context().newCDPSession(phone);
  const touchDrag = async (grip, dx, dy) => {
    const box = await grip.boundingBox(); assert.ok(box);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await phone.getByRole('navigation', { name: 'Touch workspace' }).getByRole('button', { name: 'Catalog', exact: true }).click();
  const sheet = phone.getByRole('dialog', { name: 'Catalog' });
  const sheetBefore = await sheet.boundingBox();
  await touchDrag(sheet.getByRole('separator', { name: 'Resize window' }), 0, 100);
  const sheetAfter = await sheet.boundingBox();
  assert.ok(sheetAfter.height < sheetBefore.height - 60, 'touch sheet resizes vertically');
  await sheet.getByRole('button', { name: 'Close sheet' }).click();
  await phone.getByRole('button', { name: 'AI Factory', exact: true }).click();
  const factory = phone.getByRole('dialog', { name: 'AI Factory' });
  const factoryBefore = await factory.boundingBox();
  await touchDrag(factory.getByRole('separator', { name: 'Resize window' }), -55, -70);
  const factoryAfter = await factory.boundingBox();
  assert.ok(factoryAfter.width < factoryBefore.width - 35 && factoryAfter.height < factoryBefore.height - 50, 'factory window resizes by touch on a phone');
  await phone.close();
  assert.deepEqual(errors, []);
  console.log('signal-to-feeder and robot outputs, per-source colours, directional pulse/glow, all window sizes and touch resizing PASS');
} finally {
  await browser.close();
}
