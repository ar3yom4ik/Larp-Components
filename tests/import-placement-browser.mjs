import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Simulate an asynchronous slow loader without replacing the real parsing or
 // import completion. This leaves time to manipulate the actual 3D ghost.
 await page.route('**/src/components/ModelImportDialog.tsx*',async route=>{
   const response=await route.fetch(),body=await response.text();
   const needle='const { root, warnings, clips } = await loadModelAsset(asset);';
   assert.ok(body.includes(needle),'dev loader instrumentation point');
   await route.fulfill({response,body:body.replace(needle,`await new Promise(resolve => setTimeout(resolve, 6000));\n      ${needle}`)});
 });
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('button',{name:'FILE',exact:true}).click();await page.getByRole('button',{name:/New factory/}).click();
 const canvas=page.locator('canvas').first(),rect=await canvas.boundingBox();
 // Pan the camera, then compare a clicked catalog component to the actual
 // floor intersection through the center of the current camera view.
 await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.52);await page.mouse.down({button:'right'});await page.mouse.move(rect.x+rect.width*.62,rect.y+rect.height*.6,{steps:12});await page.mouse.up({button:'right'});
 await page.waitForTimeout(400);
 const component=page.getByRole('button',{name:/Elevated Platform/}).first();
 await component.evaluate(button=>button.addEventListener('click',()=>{const camera=window.__larpRenderer.camera;camera.updateMatrixWorld();const dir=camera.getWorldDirection(camera.position.clone()),t=-camera.position.y/dir.y;window.__expectedSpawn=[camera.position.x+dir.x*t,0,camera.position.z+dir.z*t]},{capture:true,once:true}));
 await component.click();const expected=await page.evaluate(()=>window.__expectedSpawn);
 const platform=await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.kind==='platform'));
 assert.ok(platform);assert.ok(Math.hypot(platform.position[0]-expected[0],platform.position[2]-expected[2])<.03,`spawn ${platform.position} should match floor center ${expected}`);assert.equal(platform.position[1],0);
 await page.evaluate(()=>window.__larpProject.setItems([]));
 const obj='o Async\nv -1 0 0\nv 1 0 0\nv 0 2 0\nf 1 2 3\n';
 async function startImport(name){
   await page.getByRole('button',{name:'Import 3D model',exact:true}).first().click();
   const dialog=page.getByRole('dialog',{name:'Import 3D model'});
   await dialog.getByLabel('Choose model files').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(obj)});
   await dialog.getByRole('button',{name:'Import model',exact:true}).click();
   await page.getByRole('button',{name:'Cancel import'}).waitFor();
   await page.waitForFunction(()=>!!window.__larpRenderer.scene.getObjectByName('import-loading-placeholder'));
 }
 await startImport('async.obj');
 const ghost=await page.evaluate(()=>{const {scene,camera,gl}=window.__larpRenderer,o=scene.getObjectByName('import-loading-placeholder');let p=o.position.clone();p.y+=.6;p.project(camera);const r=gl.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,position:o.position.toArray()}});
 await page.mouse.move(ghost.x,ghost.y);await page.mouse.down();await page.mouse.move(ghost.x+100,ghost.y+40,{steps:15});await page.mouse.up();
 const moved=await page.evaluate(()=>window.__larpRenderer.scene.getObjectByName('import-loading-placeholder').position.toArray());
 assert.ok(Math.hypot(moved[0]-ghost.position[0],moved[2]-ghost.position[2])>.3,'placeholder is draggable during asynchronous loading');
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.kind==='imported-model'),{timeout:20000});
 const imported=await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.kind==='imported-model'));
 assert.ok(Math.hypot(imported.position[0]-moved[0],imported.position[2]-moved[2])<.02,'finished import keeps placeholder position');
 await startImport('cancel.obj');await page.getByRole('button',{name:'Cancel import'}).click();
 await page.waitForTimeout(6500);
 assert.equal(await page.evaluate(()=>window.__larpProject.getItems().filter(i=>i.kind==='imported-model').length),1,'cancelled load cannot add a late model');
 assert.deepEqual(errors,[]);console.log('import placement: current-view floor center, movable loading ghost, preserved position and cancellation PASS');
} finally {await browser.close()}
