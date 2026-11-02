// Run against the Vite dev server. These compare the actual paused canvas,
// not merely stored preference values; software WebGL is supported for CI.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 2, graphics: 'standard', gfx: { shadowSize: 1024, pixelRatio: 1, env: .2, ambient: .2, fill: .1, contactShadows: false, ao: false, bounce: 0, sun: 3, shadows: true, shadowStrength: 1, fog: false } })));
await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__larpTheme && window.__larpRenderer);
await page.waitForTimeout(1200);
await page.getByTitle('Pause (Space)', { exact: true }).click();
async function image(gfx) {
  await page.evaluate(g => window.__larpTheme.setGfx(g), gfx);
  await page.waitForTimeout(1500);
  return await page.locator('canvas').first().screenshot();
}
const shadowOn = await image({ shadows: true, shadowStrength: 1, contactShadows: false });
const shadowOff = await image({ shadows: false });
if (shadowOn.equals(shadowOff)) throw new Error('Directional shadow toggle has no visual effect');
const contactOff = await image({ shadows: true, shadowStrength: 0, sun: 0, env: 0, ambient: 1, fill: 0, contactShadows: false });
const contactOn = await image({ contactShadows: true, contactOpacity: 1 });
if (contactOn.equals(contactOff)) throw new Error('Contact shadows have no visual effect');
const aoZero = await image({ contactShadows: false, sun: 2, ambient: .35, fill: .2, env: .3, shadowStrength: 1, ao: true, aoIntensity: 0, aoRadius: 1.5 });
const aoFull = await image({ aoIntensity: 2.5 });
if (aoZero.equals(aoFull)) throw new Error('Screen-space occlusion has no visual effect');
// Exercise a real UI control while the simulation is paused.
await page.getByTitle('Settings', { exact: true }).click();
await page.getByRole('navigation', { name: 'Settings' }).getByRole('button', { name: 'Lighting', exact: true }).click();
await page.getByLabel('Exposure', { exact: true }).fill('0.6');
await page.waitForFunction(() => Math.abs(window.__larpRenderer.gl.toneMappingExposure - .6) < .01);
await page.evaluate(() => window.__larpTheme.setBuilding({ floorColor: '#7b8993' }));
await page.waitForTimeout(500);
if (await page.evaluate(() => window.__larpTheme.getAppearance().building.floorColor) !== '#7b8993') throw new Error('Floor colour did not update');
if (errors.length) throw new Error(errors.join('\n'));
console.log('Graphics PASS: directional shadows, contact shadows, GTAO, paused exposure control and floor colour');
await browser.close();
