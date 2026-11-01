import { chromium } from 'playwright';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const context = await browser.newContext({viewport:{width:1500,height:950}, acceptDownloads:true});
  await context.addInitScript(() => {
    window.__fileWrites = [];
    window.showSaveFilePicker = async () => ({name:'factory.lcmx', queryPermission:async()=> 'granted', createWritable:async()=>({
      write:async data => { if (window.__delayNextWrite) { window.__delayNextWrite = false; await new Promise(resolve => setTimeout(resolve, 3000)); } window.__fileWrites.push(Array.from(new Uint8Array(await data.arrayBuffer()))); }, close:async()=>{}
    })});
  });
  const page = await context.newPage(); const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173', {waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:'Import 3D model',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Import 3D model'});
  await modal.getByLabel('Choose model files').setInputFiles('tests/fixtures/cube.stl');
  await modal.getByRole('button',{name:'Import model',exact:true}).click();
  await modal.waitFor({state:'detached',timeout:60000});
  const original=await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.kind==='imported-model').imported.asset.files);
  await page.getByRole('button',{name:'FILE',exact:true}).click();
  const dl=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export copy (.lcmx)',exact:true}).click();
  const download=await dl; assert.match(download.suggestedFilename(),/\.lcmx$/);
  const archive=await fs.readFile(await download.path());
  const exported=strFromU8(unzipSync(archive)['project.txt']);
  assert.ok(exported.startsWith('LARP COMPONENTS 5.1'));
  await page.getByRole('button',{name:'FILE',exact:true}).click();
  await page.getByRole('button',{name:/New factory/}).click();
  await page.locator('input[type=file]').first().setInputFiles({name:'factory.lcmx',mimeType:'application/zip',buffer:archive});
  await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.kind==='imported-model'));
  assert.deepEqual(await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.kind==='imported-model').imported.asset.files),original);
  await page.getByRole('button',{name:'Save project to its exported file (Ctrl+S)'}).click();
  await page.waitForFunction(()=>window.__fileWrites.length >= 1);
  const written = await page.evaluate(()=>window.__fileWrites[0]);
  assert.ok(strFromU8(unzipSync(Uint8Array.from(written))['project.txt']).includes('cube.stl'));
  await page.evaluate(()=>{const items=window.__larpProject.getItems();window.__larpProject.setItems(items.map((item,index)=>index===0?{...item,name:'Changed after export'}:item));});
  await page.waitForFunction(()=>window.__fileWrites.length >= 2, null, {timeout:30000});
  const writes = await page.evaluate(()=>window.__fileWrites);
  assert.ok(strFromU8(unzipSync(Uint8Array.from(writes.at(-1)))['project.txt']).includes('Changed after export'));
  // A slow write followed by a newer edit must end with the newest scene.
  await page.evaluate(()=>{window.__delayNextWrite=true;const items=window.__larpProject.getItems();window.__larpProject.setItems(items.map((item,index)=>index===0?{...item,name:'First delayed edit'}:item));});
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{const items=window.__larpProject.getItems();window.__larpProject.setItems(items.map((item,index)=>index===0?{...item,name:'Latest edit'}:item));});
  await page.waitForFunction(()=>window.__fileWrites.length >= 4, null, {timeout:30000});
  const newest = await page.evaluate(()=>window.__fileWrites.at(-1));
  assert.ok(strFromU8(unzipSync(Uint8Array.from(newest))['project.txt']).includes('Latest edit'));
  await page.locator('input[type=file]').first().setInputFiles({name:'bad.lcmx',mimeType:'application/zip',buffer:Buffer.from('not zip')});
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>window.__larpProject.getItems().some(i=>i.kind==='imported-model')));
  assert.deepEqual(errors,[]);
  console.log('LCMX browser export/import with model, manual save, file autosave and invalid archive recovery PASS');
  await context.close();
} finally { await browser.close(); }
