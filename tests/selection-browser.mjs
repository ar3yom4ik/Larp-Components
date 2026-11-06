import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: .5 } })));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => window.__larpProject && window.__larpRenderer && window.__larp);
  const ids = await page.evaluate(async () => {
    const { makeItem } = await import('/src/data/library.ts');
    const sensor = makeItem('sensor', [-4, 0, 0], 0, { name: 'Selection sensor' });
    const feeder = makeItem('feeder', [0, 0, 0], 0, { name: 'Selection feeder' });
    const button = makeItem('button', [5, 0, 0], 0, { name: 'Selection button', props: { signal: false } });
    sensor.signalTargets = [feeder.id];
    sensor.signalRoutes = [{ output: 1, targetId: feeder.id, input: 1 }];
    window.__larpProject.setItems([sensor, feeder, button]);
    window.__larpProject.select(null);
    window.__larp.setRunning(false);
    return { sensor: sensor.id, feeder: feeder.id, button: button.id };
  });
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.waitForTimeout(1400);

  const points = await page.evaluate(async ids => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { scene, camera, gl } = window.__larpRenderer;
    const rect = gl.domElement.getBoundingClientRect();
    const point = id => {
      let node; scene.traverse(o => { if (o.userData?.sceneItemId === id) node = o; });
      const world = new T.Box3().setFromObject(node).getCenter(new T.Vector3());
      world.project(camera);
      return { x: rect.left + (world.x + 1) * rect.width / 2, y: rect.top + (1 - world.y) * rect.height / 2 };
    };
    return { sensor: point(ids.sensor), feeder: point(ids.feeder), button: point(ids.button), canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  }, ids);
  assert.ok(Math.abs(points.sensor.x - points.button.x) > 50, `items must be distinct on screen: ${JSON.stringify(points)}`);
  const rect = {
    left: Math.min(points.sensor.x, points.feeder.x) - 18,
    right: Math.max(points.sensor.x, points.feeder.x) + 18,
    top: Math.min(points.sensor.y, points.feeder.y) - 18,
    bottom: Math.max(points.sensor.y, points.feeder.y) + 18,
  };
  const cameraBeforeBox = await page.evaluate(() => window.__larpRenderer.camera.position.toArray());
  await page.mouse.move(rect.left, rect.top);
  await page.mouse.down();
  await page.mouse.move(rect.right, rect.bottom, { steps: 12 });
  assert.equal(await page.locator('[data-selection-marquee]').count(), 1, 'drag shows a selection rectangle');
  await page.mouse.up();
  await page.waitForFunction(ids => {
    const selected = window.__larpProject.getSelection();
    return selected.length === 2 && selected.includes(ids.sensor) && selected.includes(ids.feeder);
  }, ids, { timeout: 10000 });
  const cameraAfterBox = await page.evaluate(() => window.__larpRenderer.camera.position.toArray());
  assert.ok(cameraBeforeBox.every((v, i) => Math.abs(v - cameraAfterBox[i]) < .01), 'left drag must not orbit');
  assert.equal(await page.evaluate(id => window.__larp.signalState.get(id), ids.button), false);
  // A box drag beginning on a physical pushbutton must not press it.
  await page.mouse.move(points.button.x,points.button.y); await page.mouse.down();
  await page.mouse.move(points.button.x+9,points.button.y+9,{steps:4}); await page.mouse.up();
  await page.waitForFunction(id=>window.__larpProject.getSelection().includes(id),ids.button);
  assert.equal(await page.evaluate(id=>window.__larp.signalState.get(id),ids.button),false,'box selection does not press buttons');
  // Restore the two-item selection and exercise modifier toggling.
  await page.mouse.move(rect.left,rect.top); await page.mouse.down(); await page.mouse.move(rect.right,rect.bottom,{steps:10}); await page.mouse.up();
  await page.waitForFunction(ids=>window.__larpProject.getSelection().length===2&&window.__larpProject.getSelection().includes(ids.sensor),ids);
  await page.keyboard.down('Shift'); await page.mouse.click(points.sensor.x,points.sensor.y); await page.keyboard.up('Shift');
  await page.waitForFunction(ids=>!window.__larpProject.getSelection().includes(ids.sensor),ids);
  await page.keyboard.down('Shift'); await page.mouse.click(points.sensor.x,points.sensor.y); await page.keyboard.up('Shift');
  await page.waitForFunction(ids=>window.__larpProject.getSelection().length===2&&window.__larpProject.getSelection().includes(ids.sensor),ids);

  // Make the feeder primary again while preserving the selected pair.
  await page.mouse.move(rect.left,rect.top); await page.mouse.down(); await page.mouse.move(rect.right,rect.bottom,{steps:10}); await page.mouse.up();
  await page.waitForFunction(ids=>window.__larpProject.getSelection().at(-1)===ids.feeder,ids);

  // The Y axis moves the whole selection with a single undo step.
  await page.getByRole('button', { name: 'Iso', exact: true }).click(); await page.waitForTimeout(800);
  await page.getByTitle('Move (M)').click();
  await page.waitForFunction(() => { let c; window.__larpRenderer.scene.traverse(o => { if (o.isTransformControls) c = o; }); return c?.mode === 'translate'; });
  const hit = await page.evaluate(async id => {
    const T = await import('/node_modules/three/build/three.module.js');
    let anchor, control;
    window.__larpRenderer.scene.traverse(o => { if (o.name === `transform-anchor-${id}`) anchor = o; if (o.isTransformControls) control = o; });
    const r = window.__larpRenderer.gl.domElement.getBoundingClientRect(), p = new T.Vector3();
    anchor.getWorldPosition(p); p.project(window.__larpRenderer.camera);
    const center = { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
    for (let radius = 16; radius <= 125; radius += 5) for (let n = 0; n < 48; n++) {
      const a = n * Math.PI / 24, x = center.x + Math.cos(a) * radius, y = center.y + Math.sin(a) * radius;
      control.pointerHover({ x: (x - r.left) / r.width * 2 - 1, y: 1 - (y - r.top) / r.height * 2, button: 0 });
      if (control.axis === 'Y') return { x, y };
    }
    return null;
  }, ids.feeder);
  assert.ok(hit, 'group Y gizmo is pickable');
  await page.mouse.move(hit.x, hit.y); await page.mouse.down(); await page.mouse.move(hit.x, hit.y - 80, { steps: 12 }); await page.mouse.up();
  await page.waitForFunction(ids => window.__larpProject.getItems().find(i => i.id === ids.feeder).position[1] > .2, ids);
  const moved = await page.evaluate(ids => Object.fromEntries(window.__larpProject.getItems().map(i => [i.id, i.position])), ids);
  assert.ok(Math.abs(moved[ids.sensor][1] - moved[ids.feeder][1]) < .001, 'both selected items move together');
  assert.equal(moved[ids.button][1], 0, 'unselected item stays still');
  await page.keyboard.press('Control+z');
  await page.waitForFunction(ids => window.__larpProject.getItems().find(i => i.id === ids.feeder).position[1] === 0 && window.__larpProject.getItems().find(i => i.id === ids.sensor).position[1] === 0, ids);

  // Free rotation applies the same world-space delta around the primary item.
  await page.getByTitle('Rotate (R)').click();
  await page.waitForFunction(() => { let c; window.__larpRenderer.scene.traverse(o => { if (o.isTransformControls) c = o; }); return c?.mode === 'rotate'; });
  const ring = await page.evaluate(async id => {
    const T = await import('/node_modules/three/build/three.module.js'); let anchor, control;
    window.__larpRenderer.scene.traverse(o => { if (o.name === `transform-anchor-${id}`) anchor = o; if (o.isTransformControls) control = o; });
    const r = window.__larpRenderer.gl.domElement.getBoundingClientRect(), p = new T.Vector3(); anchor.getWorldPosition(p); p.project(window.__larpRenderer.camera);
    const center = {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
    for(let radius=25;radius<=120;radius+=5) for(let n=0;n<48;n++) {const a=n*Math.PI/24,x=center.x+Math.cos(a)*radius,y=center.y+Math.sin(a)*radius;control.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(control.axis==='Y')return {x,y};} return null;
  }, ids.feeder);
  assert.ok(ring, 'group rotation ring is pickable');
  await page.mouse.move(ring.x,ring.y); await page.mouse.down(); await page.mouse.move(ring.x+55,ring.y+45,{steps:14}); await page.mouse.up();
  await page.waitForFunction(ids=>Math.abs(window.__larpProject.getItems().find(i=>i.id===ids.feeder).rotation)>1, ids);
  const rotated=await page.evaluate(ids=>Object.fromEntries(window.__larpProject.getItems().map(i=>[i.id,i])),ids);
  assert.ok(Math.abs(rotated[ids.sensor].rotation-rotated[ids.feeder].rotation)<.1,'both objects receive group rotation');
  assert.ok(Math.abs(Math.hypot(rotated[ids.sensor].position[0]-rotated[ids.feeder].position[0],rotated[ids.sensor].position[2]-rotated[ids.feeder].position[2])-4)<.001,'rotation preserves group spacing');
  assert.equal(rotated[ids.button].rotation,0,'unselected object does not rotate');
  await page.keyboard.press('Control+z'); await page.waitForFunction(ids=>window.__larpProject.getItems().find(i=>i.id===ids.feeder).rotation===0, ids);

  const empty = { x: points.canvas.x + points.canvas.width * .82, y: points.canvas.y + points.canvas.height * .2 };
  await page.mouse.click(empty.x, empty.y, { button: 'right' });
  let menu = page.getByRole('menu', { name: 'Layout context menu' });
  await menu.getByRole('menuitem', { name: /Copy/ }).click();
  await page.mouse.click(empty.x, empty.y, { button: 'right' });
  menu = page.getByRole('menu', { name: 'Layout context menu' });
  await menu.getByRole('menuitem', { name: /Paste/ }).click();
  await page.waitForFunction(() => window.__larpProject.getItems().length === 5);
  const copied = await page.evaluate(() => window.__larpProject.getItems().filter(i => i.name.endsWith(' copy')));
  const copySensor = copied.find(i => i.kind === 'sensor'), copyFeeder = copied.find(i => i.kind === 'feeder');
  assert.ok(copySensor && copyFeeder && copySensor.id !== ids.sensor && copyFeeder.id !== ids.feeder);
  assert.deepEqual(copySensor.signalTargets, [copyFeeder.id], 'copied wires target copied objects');
  assert.equal(copySensor.signalRoutes[0].targetId, copyFeeder.id, 'copied numbered routes are remapped');
  assert.equal(copyFeeder.position[0] - copySensor.position[0], 4, 'relative positions are preserved');

  // The first paste after cut keeps IDs so incoming wires can reconnect.
  const copiedIds = [copySensor.id, copyFeeder.id];
  await page.mouse.click(empty.x, empty.y, { button: 'right' });
  await page.getByRole('menu', { name: 'Layout context menu' }).getByRole('menuitem', { name: /Cut/ }).click();
  await page.waitForFunction(() => window.__larpProject.getItems().length === 3);
  await page.mouse.click(empty.x, empty.y, { button: 'right' });
  await page.getByRole('menu', { name: 'Layout context menu' }).getByRole('menuitem', { name: /Paste/ }).click();
  await page.waitForFunction(ids => ids.every(id => window.__larpProject.getItems().some(i => i.id === id)), copiedIds);
  await page.keyboard.press('Control+x'); await page.waitForFunction(() => window.__larpProject.getItems().length === 3);
  await page.keyboard.press('Control+v'); await page.waitForFunction(() => window.__larpProject.getItems().length === 5);

  // Middle-drag orbits, right-drag pans, and neither opens the context menu.
  await page.getByRole('button', { name: 'Iso', exact: true }).click(); await page.waitForTimeout(800);
  const beforeOrbit = await page.evaluate(() => window.__larpRenderer.camera.position.toArray());
  await page.mouse.move(empty.x, empty.y); await page.mouse.down({ button: 'middle' });
  await page.mouse.move(empty.x + 80, empty.y + 40, { steps: 10 }); await page.mouse.up({ button: 'middle' });
  await page.waitForFunction(before => window.__larpRenderer.camera.position.toArray().some((v, i) => Math.abs(v - before[i]) > .1), beforeOrbit);
  await page.mouse.move(empty.x, empty.y); await page.mouse.down({ button: 'right' });
  await page.mouse.move(empty.x + 55, empty.y + 25, { steps: 8 }); await page.mouse.up({ button: 'right' });
  assert.equal(await page.getByRole('menu', { name: 'Layout context menu' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('selection: marquee, multi-gizmo, undo, context/keyboard clipboard, remapped wires, middle orbit and right pan OK');
} finally { await browser.close(); }
