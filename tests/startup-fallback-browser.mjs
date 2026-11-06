import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  // The HTML itself supplies a visible explanation even if JS is unavailable.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base, { waitUntil: 'load', timeout: 120000 });
  await staticPage.getByText('Starting Larp Components…').waitFor();
  assert.match(await staticPage.locator('noscript').textContent(), /JavaScript is required/);
  await noJs.close();

  // Failed module loading also leaves the static fallback instead of white.
  const blocked = await browser.newContext(); const blockedPage = await blocked.newPage();
  await blockedPage.route(url => url.pathname === '/src/main.tsx', route => route.abort());
  await blockedPage.goto(base, { waitUntil: 'load', timeout: 120000 });
  await blockedPage.getByText('Starting Larp Components…').waitFor();
  await blocked.close();

  // A React render failure anywhere above the viewport shows recovery guidance.
  const crash = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  const page = await crash.newPage();
  const modulePath = url => url.pathname === '/src/App.tsx';
  await page.route(modulePath, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'export default function App(){throw new Error("injected startup failure")}' }));
  await page.goto(base, { waitUntil: 'load', timeout: 120000 });
  await page.getByRole('alert').getByText('The workspace could not start').waitFor();
  await page.unroute(modulePath);
  await page.getByRole('button', { name: 'Reload workspace' }).click();
  await page.locator('.larp-app').waitFor({ timeout: 120000 });
  assert.equal(await page.getByRole('alert').filter({ hasText: 'The workspace could not start' }).count(), 0);
  await crash.close();
  console.log('startup: JavaScript unavailable, blocked module and React failure show recovery instead of a blank page PASS');
} finally { await browser.close(); }
