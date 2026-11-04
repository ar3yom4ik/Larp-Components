import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|program|webgl|tsl/i.test(message.text())) errors.push(message.text());
  });
  await page.route('**/__mrt-probe', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto(new URL('/__mrt-probe', process.env.TEST_URL || 'http://127.0.0.1:4173').href);
  const pixels = await page.evaluate(async () => {
    const { createProbe } = await import('/tests/emissive-mrt-probe.ts');
    const probe = await createProbe();
    const { renderer, scene, scenePass, pipeline, material, cover, sample, bloom } = probe;
    const emission = await sample();
    cover.visible = true;
    const translucent = await sample();
    cover.material.opacity = 1; cover.material.transparent = false; cover.material.depthWrite = true; cover.material.needsUpdate = true;
    const occluded = await sample();
    cover.visible = false;
    material.emissive.set(0);
    const nonEmissive = await sample();
    pipeline.outputNode = scenePass; pipeline.needsUpdate = true;
    const lit = await sample();
    scene.background.set(0);
    material.emissive.set(0xff0000);
    const noBloom = await sample();
    pipeline.outputNode = scenePass.add(bloom(scenePass.getTextureNode('emissive'), 2, .4, .01)); pipeline.needsUpdate = true;
    const withBloom = await sample();
    return { backend: renderer.backend.constructor.name, emission, translucent, occluded, nonEmissive, lit, noBloom, withBloom };
  });
  assert.equal(pixels.backend, 'WebGLBackend', 'test uses Three common renderer WebGL fallback, not physical WebGPU');
  assert.ok(pixels.emission.center[0] > 150, `emissive pixels are extracted: ${pixels.emission.center}`);
  assert.equal(pixels.emission.corner[0], 0, 'bright scene background must not enter emission attachment');
  assert.ok(pixels.translucent.center[0] > 30 && pixels.translucent.center[0] < pixels.emission.center[0] * .9, `translucent geometry attenuates emission: ${pixels.translucent.center}`);
  assert.ok(pixels.occluded.center[0] < 5, 'opaque geometry occludes emission');
  assert.ok(pixels.nonEmissive.center[0] < 5 && pixels.lit.center[0] > 150, 'bright, lit non-emissive geometry is excluded');
  assert.ok(pixels.withBloom.halo[0] > pixels.noBloom.halo[0] + 3, `bloom draws a halo around extracted emission: ${pixels.noBloom.halo} -> ${pixels.withBloom.halo}`);
  assert.deepEqual(errors, []);
  console.log('Three common-renderer MRT/bloom: emissive extraction, bright backgrounds, non-emissive surfaces, transparency and occlusion PASS (WebGL backend)');
} finally {
  await browser.close();
}
