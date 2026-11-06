import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1100,height:740}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpRenderer&&window.__larpTheme&&window.__larp);
  await page.evaluate(()=>window.__larp.setRunning(false));
  const canvas=await page.locator('canvas').first().boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.55,canvas.y+canvas.height*.55);
  await page.mouse.wheel(0,-550);await page.waitForTimeout(800);
  await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.5);await page.mouse.down({button:'middle'});await page.mouse.move(canvas.x+canvas.width*.57,canvas.y+canvas.height*.52,{steps:7});await page.mouse.up({button:'middle'});await page.waitForTimeout(3000);
  const before=await page.evaluate(()=>({id:window.__larpRenderer.camera.uuid,pos:window.__larpRenderer.camera.position.toArray()}));
  await page.evaluate(()=>window.__larpTheme.setGfx({shadows:true,softShadows:false}));
  await page.waitForFunction(id=>window.__larpRenderer.camera.uuid!==id,before.id,{timeout:30000});await page.waitForTimeout(1500);
  const after=await page.evaluate(()=>window.__larpRenderer.camera.position.toArray());
  assert.ok(before.pos.every((v,i)=>Math.abs(v-after[i])<.05),`shadow setting reset camera: ${before.pos} -> ${after}`);
  await page.evaluate(()=>window.__larpCornell(true));await page.waitForFunction(()=>!!window.__larpRenderer.scene.getObjectByName('cornell-benchmark'));
  await page.evaluate(()=>window.__larpCornell(false));await page.waitForFunction(()=>!window.__larpRenderer.scene.getObjectByName('cornell-benchmark'));await page.waitForTimeout(800);
  const restored=await page.evaluate(()=>window.__larpRenderer.camera.position.toArray());
  assert.ok(before.pos.every((v,i)=>Math.abs(v-restored[i])<.05),`benchmark exit reset camera: ${before.pos} -> ${restored}`);
  assert.deepEqual(errors,[]);console.log('camera settings: orbit survives context remount and Cornell benchmark round-trip OK');
} finally {await browser.close();}
