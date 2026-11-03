import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const glb = await readFile(new URL('./fixtures/plane.glb', import.meta.url));
const png = await readFile(new URL('./fixtures/red.png', import.meta.url));
const cors = { 'access-control-allow-origin': '*' };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
let releaseSlow, releaseSlowThumb;
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: .5 } })));
  const requests = [];
  let allowGobkit = false;
  const slow = new Promise(resolve => { releaseSlow = resolve; });
  const slowThumb = new Promise(resolve => { releaseSlowThumb = resolve; });
  await page.route(url => ['api.polyhaven.com', 'cdn.polyhaven.com', 'gobkit.com', 'hidencod.github.io'].includes(url.hostname), async route => {
    const url = new URL(route.request().url()); requests.push(url.href);
    if (url.hostname === 'api.polyhaven.com' && url.pathname === '/assets') return route.fulfill({ json: { poly_test: { name:'Poly fixture', categories:['Furniture'], tags:['table'] } }, headers:cors });
    if (url.hostname === 'api.polyhaven.com' && url.pathname === '/files/poly_test') return route.fulfill({ json: { glb:{'1k':{glb:{url:'https://cdn.polyhaven.com/poly.glb',size:glb.length}}} }, headers:cors });
    if (url.hostname === 'gobkit.com' && ['/api/free','/api/community'].includes(url.pathname)) {
      if (!allowGobkit) return route.fulfill({status:503,body:'unavailable',headers:cors});
      return route.fulfill({ json: url.pathname === '/api/free' ? {packs:[{id:'nature',name:'Nature',kind:'props',models:[{id:'tree',name:'Gobkit Tree',url:'https://gobkit.com/freebies/tree.glb',license:'CC0'}]}]} : {items:[{slug:'dragon',title:'Gobkit Dragon',creator:'Alice',status:'published',download_available:true,license:'cc0',model_url:'https://gobkit.com/api/community/file/dragon/model',thumb_url:'https://gobkit.com/api/community/file/dragon/thumb',page_url:'https://gobkit.com/s/dragon'}]}, headers:cors });
    }
    if (url.hostname === 'hidencod.github.io' && url.pathname === '/tge-assets/catalog.json') {
      const asset = (slug, name) => ({id:`furniture/${slug}`,name,file:`packs/furniture/${slug}.glb`,thumb:`packs/furniture/thumbs/${slug}.webp`,size:glb.length});
      const models = [asset('chair','Kenney Chair'),asset('slow','Slow model'),...Array.from({length:23},(_,i)=>asset(`filler-${i}`,`Filler ${i}`)),asset('desk','Kenney Desk')];
      return route.fulfill({json:{packs:[{id:'furniture',name:'Furniture',author:'Kenney',license:'CC0-1.0',url:'https://kenney.nl/assets/furniture-kit',models}]},headers:cors});
    }
    if (url.hostname === 'hidencod.github.io' && url.pathname.endsWith('/thumbs/chair.webp')) { await slowThumb; try { await route.fulfill({body:png,contentType:'image/png',headers:cors}); } catch { /* navigation may cancel */ } return; }
    if (url.hostname === 'hidencod.github.io' && url.pathname.endsWith('/slow.glb')) { await slow; try { await route.fulfill({body:glb,contentType:'model/gltf-binary',headers:cors}); } catch { /* cancellation may close the request */ } return; }
    if (url.pathname.endsWith('.glb') || url.pathname.endsWith('/model')) return route.fulfill({body:glb,contentType:'model/gltf-binary',headers:cors});
    return route.fulfill({body:png,contentType:'image/png',headers:cors});
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/', {waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:'FILE',exact:true}).click(); await page.getByRole('button',{name:/New factory/}).click();
  await page.getByRole('button',{name:'Web',exact:true}).click();
  const search = page.getByPlaceholder('Search web models...');
  assert.equal(await page.getByRole('button',{name:'All sources',exact:true}).getAttribute('aria-pressed'),'true','all sources share one search by default');
  await page.getByRole('button',{name:/Poly fixture/}).waitFor();
  await search.fill('table'); await page.getByRole('button',{name:/Poly fixture/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.provider==='Poly Haven'),null,{timeout:30000});

  // Failure is visible and retryable, rather than trapping the catalogue.
  await search.fill('');
  await page.getByRole('alert').filter({hasText:'503'}).waitFor();
  allowGobkit = true;
  await page.getByRole('alert').getByRole('button',{name:'Retry'}).click();
  await page.getByRole('button',{name:'Gobkit',exact:true}).click();
  await page.getByRole('button',{name:/Gobkit Tree/}).waitFor();
  await page.getByRole('button',{name:/Gobkit Dragon/}).waitFor();
  assert.ok(await page.getByRole('button',{name:/Gobkit Dragon/}).locator('img').count(),'community thumbnails appear');
  await search.fill('alice dragon');
  assert.equal(await page.getByRole('button',{name:/Gobkit Tree/}).count(),0);
  await page.getByRole('button',{name:/Gobkit Dragon/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='Gobkit Dragon'),null,{timeout:30000});
  await search.fill('tree'); await page.getByRole('button',{name:/Gobkit Tree/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='Gobkit Tree'),null,{timeout:30000});

  await search.fill(''); await page.getByRole('button',{name:'Kenney (mirror)',exact:true}).click();
  const chair=page.getByRole('button',{name:/Kenney Chair/});await chair.waitFor();
  assert.equal(await chair.locator('img').evaluate(img=>img.complete),false,'search result name is available before the slow icon');
  await page.getByLabel('Web catalog icon size').fill('100');
  assert.ok(Math.abs((await chair.locator('img').locator('..').boundingBox()).width-100)<1,'icon slider resizes catalog thumbnails');
  releaseSlowThumb();
  assert.equal(await page.getByRole('button',{name:/Kenney Desk/}).count(),0,'the catalog initially limits displayed cards');
  await page.getByRole('button',{name:/Show more · Kenney/}).click();
  await page.getByRole('button',{name:/Kenney Desk/}).waitFor();
  await page.getByRole('button',{name:/Slow model/}).click();
  await page.getByRole('status').getByRole('button',{name:'Cancel'}).click();
  await page.waitForFunction(()=>!document.querySelector('[role="status"] button'));
  releaseSlow();
  await search.fill('chair');
  await chair.waitFor();
  assert.equal(await page.getByRole('button',{name:/Kenney Desk/}).count(),0,'the shared search filters the Kenney catalog');
  assert.ok(requests.some(url=>url.includes('hidencod.github.io/tge-assets/catalog.json')));
  await page.getByRole('button',{name:/Kenney Chair/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='Kenney Chair'),null,{timeout:30000});
  await page.getByRole('button',{name:'All sources',exact:true}).click();
  await page.getByRole('button',{name:/Kenney Chair/}).waitFor();
  await search.fill('');
  await page.getByRole('button',{name:/Gobkit Tree/}).waitFor();
  await page.getByRole('button',{name:/Poly fixture/}).waitFor();
  const sources = await page.evaluate(()=>window.__larpProject.getWorkpieces().map(i=>i.imported.asset.source));
  assert.deepEqual(new Set(sources.map(source=>source.provider)),new Set(['Poly Haven','Gobkit','Kenney']));
  assert.ok(sources.every(source=>source.license==='CC0 1.0' && source.url.startsWith('https://')));
  assert.ok(await page.evaluate(()=>window.__larpProject.getWorkpieces().every(i=>i.imported.asset.files[0].dataUrl.startsWith('data:'))),'downloads are embedded in the project');
  await page.getByRole('button',{name:'Components',exact:true}).click();
  await page.getByRole('button',{name:'Edit catalog model: Kenney Chair'}).click();
  await page.getByRole('dialog',{name:'Edit catalog model'}).getByRole('link',{name:'Kenney · Kenney Chair'}).waitFor();
  await page.getByRole('dialog',{name:'Edit catalog model'}).getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForTimeout(1700); await page.reload({waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().length===4,null,{timeout:30000});
  assert.deepEqual(new Set(await page.evaluate(()=>window.__larpProject.getWorkpieces().map(i=>i.imported.asset.source.provider))),new Set(['Poly Haven','Gobkit','Kenney']));
  assert.deepEqual(errors, []);
  console.log('web catalog (mocked providers): search, retry, show more, thumbnails, cancellation, import and persisted CC0 provenance OK');
} finally { releaseSlow?.(); releaseSlowThumb?.(); await browser.close(); }
