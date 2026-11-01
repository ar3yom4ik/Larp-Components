import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Test both a usable renderer and a browser where WebGL is disabled. The latter
// must not unmount the whole application, even inside an embedded preview.
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
for (const [label, flags] of [
  ['WebGL', ['--enable-unsafe-swiftshader']],
  ['disabled WebGL', ['--disable-webgl']],
]) {
  const browser = await chromium.launch({ executablePath, args: flags });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`<iframe sandbox="allow-scripts allow-same-origin" src="${base}" width="1200" height="700"></iframe>`);
    const frame = page.frameLocator('iframe');
    await frame.getByRole('button', { name: 'FILE', exact: true }).waitFor({ timeout: 90000 });
    if (label === 'WebGL') {
      await frame.locator('canvas').waitFor({ timeout: 90000 });
      assert.equal(await frame.getByRole('alert').filter({ hasText: '3D viewport unavailable' }).count(), 0);
    } else {
      const warning = frame.getByRole('alert').filter({ hasText: '3D viewport unavailable' });
      await warning.waitFor({ timeout: 90000 });
      await frame.getByRole('button', { name: 'Retry 3D viewport' }).click();
      await warning.waitFor({ timeout: 90000 });
    }
    console.log(`${label}: embedded workspace stays visible PASS`);
  } finally { await browser.close(); }
}
