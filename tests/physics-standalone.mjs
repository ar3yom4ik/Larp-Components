import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Exercise the packaged file directly with the network blocked: no dev globals.
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--allow-file-access-from-files']});
try {
  const page=await browser.newPage({viewport:{width:1400,height:900},acceptDownloads:true});
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
  await page.addInitScript(()=>{try{localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}}));}catch{}});
  await page.goto(pathToFileURL(process.cwd()+'/dist/index.html').href,{waitUntil:'load',timeout:120000});
  await page.getByRole('button',{name:'FILE',exact:true}).click();
  await page.getByRole('button',{name:/New factory/}).click();
  await page.getByRole('button',{name:'Import 3D model',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Import 3D model'});
  await dialog.getByLabel('Choose model files').setInputFiles('tests/fixtures/cube.stl');
  await dialog.getByRole('button',{name:'Import model',exact:true}).click();
  await dialog.waitFor({state:'detached',timeout:60000});
  await page.getByLabel('Weight (kg)').fill('2.5');
  await page.getByRole('button',{name:/Box Feeder/}).first().click();
  await page.getByRole('button',{name:'Spawn product',exact:true}).click();
  await page.getByRole('option',{name:/cube/i}).click();
  await page.getByLabel('Physics mode').selectOption('dynamic');
  await page.getByLabel('Weight (kg)').fill('12');
  await page.getByRole('button',{name:/Spline Conveyor/}).first().click();
  await page.getByLabel('Point 3 Y').fill('1.5');
  await page.getByRole('button',{name:/Elevated Platform/}).first().click();
  await page.getByRole('button',{name:/Industrial Stairs/}).first().click();
  await page.getByRole('button',{name:'FILE',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export copy (.txt)',exact:true}).click();
  const download=await downloadPromise, text=await fs.readFile(await download.path(),'utf8');
  const project=JSON.parse(text.slice(text.indexOf('\n')+1));
  const source=project.items.find(i=>i.kind==='imported-model'), feeder=project.items.find(i=>i.kind==='feeder'), belt=project.items.find(i=>i.kind==='conveyor');
  assert.equal(source.props.physicsMass,2.5);
  assert.equal(feeder.props.product,`imported:${source.id}`);
  assert.equal(feeder.props.physicsMode,'dynamic');assert.equal(feeder.props.physicsMass,12);
  assert.equal(belt.pointHeights[2],1.5);
  assert.ok(project.items.some(i=>i.kind==='platform')&&project.items.some(i=>i.kind==='stairs'));
  assert.ok(project.assets?.some(a=>a.files.some(f=>f.path.endsWith('cube.stl'))));
  assert.deepEqual(requests,[],'standalone must not request network resources');
  assert.deepEqual(errors,[]);
  console.log('offline standalone: imported workpiece, dynamic physics, elevated spline, platforms, stairs and export PASS');
} finally {await browser.close();}
