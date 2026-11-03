import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const glb = await readFile(new URL('./fixtures/plane.glb', import.meta.url));
const png = await readFile(new URL('./fixtures/red.png', import.meta.url));
const cors = { 'access-control-allow-origin': '*' };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
let releaseSlow;
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: .5 } })));
  const requests = [];
  let failures = 0;
  const slow = new Promise(resolve => { releaseSlow = resolve; });
  await page.route(url => ['api.polyhaven.com', 'cdn.polyhaven.com', 'gobkit.com', '3dassets.dev', 'cdn.3dassets.dev'].includes(url.hostname), async route => {
    const url = new URL(route.request().url()); requests.push(url.href);
    if (url.hostname === 'api.polyhaven.com' && url.pathname === '/assets') return route.fulfill({ json: { poly_test: { name:'Poly fixture', categories:['Furniture'], tags:['table'] } }, headers:cors });
    if (url.hostname === 'api.polyhaven.com' && url.pathname === '/files/poly_test') return route.fulfill({ json: { glb:{'1k':{glb:{url:'https://cdn.polyhaven.com/poly.glb',size:glb.length}}} }, headers:cors });
    if (url.hostname === 'gobkit.com' && ['/api/free','/api/community'].includes(url.pathname)) {
      if (failures < 2) { failures++; return route.fulfill({status:503,body:'unavailable',headers:cors}); }
      return route.fulfill({ json: url.pathname === '/api/free' ? {packs:[{id:'nature',name:'Nature',kind:'props',models:[{id:'tree',name:'Gobkit Tree',url:'https://gobkit.com/freebies/tree.glb',license:'CC0'}]}]} : {items:[{slug:'dragon',title:'Gobkit Dragon',creator:'Alice',status:'published',download_available:true,license:'cc0',model_url:'https://gobkit.com/api/community/file/dragon/model',thumb_url:'https://gobkit.com/api/community/file/dragon/thumb',page_url:'https://gobkit.com/s/dragon'}]}, headers:cors });
    }
    if (url.hostname === '3dassets.dev' && url.pathname === '/api/v1/assets') {
      const pageNumber = Number(url.searchParams.get('page'));
      const query = url.searchParams.get('q') || '';
      const asset = (slug, title, id) => ({slug,title,status:'published',license:{slug:'cc0-1.0'},cdnUrl:`https://cdn.3dassets.dev/assets/${id}/v1/model.glb`,thumbnailUrl:`https://cdn.3dassets.dev/assets/${id}/v1/thumb.webp`,url:`https://3dassets.dev/assets/${slug}`,category:{title:'Furniture'},tags:[{title:'industrial'}],stats:{fileSize:glb.length}});
      const data = query ? [asset('chair','3D Chair',1)] : pageNumber === 1 ? [asset('chair','3D Chair',1),asset('slow','Slow model',99)] : [asset('desk','3D Desk',2)];
      return route.fulfill({json:{data,page:pageNumber,total:3,totalPages:query?1:2},headers:cors});
    }
    if (url.hostname === 'cdn.3dassets.dev' && url.pathname.includes('/99/')) { await slow; try { await route.fulfill({body:glb,contentType:'model/gltf-binary',headers:cors}); } catch { /* cancellation may close the request */ } return; }
    if (url.pathname.endsWith('.glb') || url.pathname.endsWith('/model')) return route.fulfill({body:glb,contentType:'model/gltf-binary',headers:cors});
    return route.fulfill({body:png,contentType:'image/png',headers:cors});
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/', {waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:'FILE',exact:true}).click(); await page.getByRole('button',{name:/New factory/}).click();
  await page.getByRole('button',{name:'Web',exact:true}).click();
  const search = page.getByPlaceholder('Search web models...');
  await page.getByRole('button',{name:/Poly fixture/}).waitFor();
  await search.fill('table'); await page.getByRole('button',{name:/Poly fixture/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.provider==='Poly Haven'),null,{timeout:30000});

  // Failure is visible and retryable, rather than trapping the catalogue.
  await search.fill(''); await page.getByRole('button',{name:'Gobkit',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'503'}).waitFor();
  await page.getByRole('alert').getByRole('button',{name:'Retry'}).click();
  await page.getByRole('button',{name:/Gobkit Tree/}).waitFor();
  await page.getByRole('button',{name:/Gobkit Dragon/}).waitFor();
  assert.ok(await page.getByRole('button',{name:/Gobkit Dragon/}).locator('img').count(),'community thumbnails appear');
  await search.fill('alice dragon');
  assert.equal(await page.getByRole('button',{name:/Gobkit Tree/}).count(),0);
  await page.getByRole('button',{name:/Gobkit Dragon/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='Gobkit Dragon'),null,{timeout:30000});
  await search.fill('tree'); await page.getByRole('button',{name:/Gobkit Tree/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='Gobkit Tree'),null,{timeout:30000});

  await search.fill(''); await page.getByRole('button',{name:'3DAssets.dev',exact:true}).click();
  await page.getByRole('button',{name:/3D Chair/}).waitFor();
  await page.getByRole('button',{name:/Show more · 3DAssets.dev/}).click();
  await page.getByRole('button',{name:/3D Desk/}).waitFor();
  assert.ok(requests.some(url=>url.includes('3dassets.dev/api/v1/assets') && new URL(url).searchParams.get('page')==='2'),'show more fetches page 2');
  await page.getByRole('button',{name:/Slow model/}).click();
  await page.getByRole('status').getByRole('button',{name:'Cancel'}).click();
  await page.waitForFunction(()=>!document.querySelector('[role="status"] button'));
  releaseSlow();
  await search.fill('chair');
  await page.getByRole('button',{name:/3D Chair/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/3D Desk/}).count(),0,'new remote search replaces previous pages');
  assert.ok(requests.some(url=>url.includes('3dassets.dev/api/v1/assets') && new URL(url).searchParams.get('q')==='chair'));
  await page.getByRole('button',{name:/3D Chair/}).click();
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().some(i=>i.imported.asset.source?.title==='3D Chair'),null,{timeout:30000});
  await page.getByRole('button',{name:'All sources',exact:true}).click();
  await page.getByRole('button',{name:/3D Chair/}).waitFor();
  await search.fill('');
  await page.getByRole('button',{name:/Gobkit Tree/}).waitFor();
  await page.getByRole('button',{name:/Poly fixture/}).waitFor();
  const sources = await page.evaluate(()=>window.__larpProject.getWorkpieces().map(i=>i.imported.asset.source));
  assert.deepEqual(new Set(sources.map(source=>source.provider)),new Set(['Poly Haven','Gobkit','3DAssets.dev']));
  assert.ok(sources.every(source=>source.license==='CC0 1.0' && source.url.startsWith('https://')));
  assert.ok(await page.evaluate(()=>window.__larpProject.getWorkpieces().every(i=>i.imported.asset.files[0].dataUrl.startsWith('data:'))),'downloads are embedded in the project');
  await page.getByRole('button',{name:'Components',exact:true}).click();
  await page.getByRole('button',{name:'Edit catalog model: 3D Chair'}).click();
  await page.getByRole('dialog',{name:'Edit catalog model'}).getByRole('link',{name:'3DAssets.dev · 3D Chair'}).waitFor();
  await page.getByRole('dialog',{name:'Edit catalog model'}).getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForTimeout(1700); await page.reload({waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpProject.getWorkpieces().length===4,null,{timeout:30000});
  assert.deepEqual(new Set(await page.evaluate(()=>window.__larpProject.getWorkpieces().map(i=>i.imported.asset.source.provider))),new Set(['Poly Haven','Gobkit','3DAssets.dev']));
  assert.deepEqual(errors, []);
  console.log('web catalog (mocked providers): search, retry, pagination, thumbnails, cancellation, import and persisted CC0 provenance OK');
} finally { releaseSlow?.(); await browser.close(); }
