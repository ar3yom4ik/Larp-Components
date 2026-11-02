import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const url = pathToFileURL(`${process.cwd()}/dist/index.html`).href;
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(url, { waitUntil: 'load', timeout: 120000 });
  await staticPage.getByText('Starting Larp Components…').waitFor();
  await noJs.close();

  const context = await browser.newContext({ viewport: { width: 1100, height: 720 } });
  await context.setOffline(true);
  await context.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({
    graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: .5 },
  })));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.locator('.larp-app').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => window.__larp?.conveyors?.size > 0, null, { timeout: 60000 });
  const belt = await page.evaluate(() => {
    const e = window.__larp;
    const longest = [...e.conveyors.values()].sort((a, b) => b.length - a.length)[0];
    const item = e.items.find(i => i.id === longest.id);
    e.sync([{ ...item, props: { ...item.props, speed: .6, active: true, stopper: false } }]);
    return { id: longest.id, length: longest.length };
  });
  assert.ok(belt.length > 3, `fixture requires a long conveyor: ${belt.length}`);
  async function measure(speed) {
    await page.getByLabel('Simulation speed multiplier').fill(String(speed));
    await page.waitForFunction(n => window.__larp.speed === n, speed);
    await page.evaluate(id => {
      const e = window.__larp; e.reset(); const p = e.conveyors.get(id).pointAt(.3);
      const box = e.spawn('carton', p.x, p.y + .13, p.z); window.__standalonePart = box.id;
    }, belt.id);
    await page.waitForTimeout(300);
    const read = () => page.evaluate(() => ({ time: window.__larp.time, wall: performance.now(), along: window.__larp.boxes.find(b => b.id === window.__standalonePart)?.convS }));
    const a = await read(); await page.waitForTimeout(1300); const b = await read();
    assert.ok(Number.isFinite(a.along) && Number.isFinite(b.along));
    return { rate: (b.time - a.time) / ((b.wall - a.wall) / 1000), travel: (b.along - a.along) / ((b.wall - a.wall) / 1000) };
  }
  const normal = await measure(1), fast = await measure(4);
  assert.ok(fast.rate > normal.rate * 2.5, `standalone clock: ${JSON.stringify({ normal, fast })}`);
  assert.ok(normal.travel > .2 && fast.travel > normal.travel * 2, `standalone product: ${JSON.stringify({ normal, fast })}`);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('offline standalone: startup fallback, speed control and conveyor workpiece PASS', { normal, fast });
} finally { await browser.close(); }
