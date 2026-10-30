import { chromium } from 'playwright';
import {gunzipSync} from 'node:zlib';import fs from 'node:fs';
const builtinFbx={name:'cc0-human.fbx',mimeType:'application/octet-stream',buffer:gunzipSync(fs.readFileSync('src/assets/cc0-source-worker.fbx.gz'))};
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[]; page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`)); page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
await page.getByRole('button',{name:'FILE',exact:true}).click(); await page.getByRole('button',{name:/New factory/ }).click();
const scenarios=[['STL',['tests/fixtures/cube.stl']],['PLY',['tests/fixtures/cube.ply']],['OBJ + MTL + textures',['tests/fixtures/cube.obj','tests/fixtures/cube.mtl','tests/fixtures/red.png','tests/fixtures/green.png']],['nested ZIP OBJ',['tests/fixtures/nested-obj.zip']],['glTF + bin + png',['tests/fixtures/plane.gltf','tests/fixtures/plane.bin','tests/fixtures/red.png']],['GLB embedded',['tests/fixtures/plane.glb']],['FBX CC0 rig',[builtinFbx]],['STEP CAD',['node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.stp']]];
let count=0;let failed=0;
for (const [name,files] of scenarios) {
 console.log('START',name); await page.getByRole('button',{name:'Import 3D model',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Import 3D model'});
 await modal.getByLabel('Choose model files').setInputFiles(files);
 await modal.getByRole('button',{name:'Import model',exact:true}).click({timeout:90000,noWaitAfter:true});
 await page.waitForFunction(n=>window.__larpProject.getItems().filter(i=>i.kind==='imported-model').length>n,count,{timeout:90000}).catch(()=>{});
 let current=await page.evaluate(()=>window.__larpProject.getItems().filter(i=>i.kind==='imported-model'));
 if(current.length===count){failed++;console.log('FAILED',name,'ALERTS',await modal.getByRole('alert').allTextContents());await modal.getByRole('button',{name:'Close'}).click();continue;}
 count++;
 const last=current.at(-1); console.log('OK',name,JSON.stringify({entry:last.imported.asset.entry, units:last.imported.units, mesh:last.imported.meshCount, triangles:last.imported.triangleCount, materials:last.imported.materials.map(m=>({name:m.name,present:m.present}))}));
 await page.waitForTimeout(350);
}
console.log('ERRORS',JSON.stringify(errors));
await page.screenshot({path:'tests/artifacts/v2-format-sweep.png'});
await browser.close();
if(errors.length || failed) process.exitCode=1;
