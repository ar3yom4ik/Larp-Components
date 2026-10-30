import {chromium} from 'playwright';import assert from 'node:assert/strict';
if(!process.env.MIXAMO_FIXTURE){console.log('SKIP: set MIXAMO_FIXTURE to a locally licensed Mixamo-compatible FBX');process.exit(0);}
const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1600,height:1000}});const errors=[];p.on('pageerror',e=>errors.push('page: '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
const name=await p.evaluate(()=>window.__larpProject.getItems().find(i=>i.kind==='operator')?.name);console.log('operator',name);const inspector=p.locator('aside').last();
await inspector.getByRole('button',{name:'Scene tree',exact:true}).click();await inspector.getByRole('button',{name,exact:true}).click();await inspector.getByRole('button',{name:'Properties',exact:true}).click();
console.log('appearance',await inspector.getByLabel('Character appearance').inputValue());
await inspector.getByRole('button',{name:'Import rigged character'}).click();const modal=p.getByRole('dialog',{name:'Import 3D model'});await modal.getByLabel('Choose model files').setInputFiles(process.env.MIXAMO_FIXTURE);
await modal.getByRole('button',{name:'Import model',exact:true}).click({timeout:60000,noWaitAfter:true});
await p.waitForFunction(()=>window.__larpProject.getItems().find(i=>i.kind==='operator')?.worker?.appearance==='custom',null,{timeout:100000});
const custom=await p.evaluate(()=>{const x=window.__larpProject.getItems().find(i=>i.kind==='operator');return {asset:x.worker.model.asset.entry,rigged:x.worker.model.rigged,animations:x.worker.model.animationNames}});console.log('CUSTOM',custom);assert(custom.rigged);
await p.waitForTimeout(5000);console.log('RENDER',await p.evaluate(()=>{const found=[];window.__larpRenderer.scene.traverse(o=>{if(o.userData?.isRiggedWorker){const b=[];o.traverse(n=>{if(n.isSkinnedMesh)b.push({name:n.name,bones:n.skeleton.bones.length,map:!!(Array.isArray(n.material)?n.material[0]:n.material).map})});found.push({role:o.userData.activeRole,clip:o.userData.clipName,skin:b})}});return found}));
await inspector.getByLabel('Import animation: walk').setInputFiles(process.env.MIXAMO_FIXTURE);
await p.waitForFunction(()=>!!window.__larpProject.getItems().find(i=>i.kind==='operator')?.worker?.motions?.walk,null,{timeout:100000});
const motion=await p.evaluate(()=>{const x=window.__larpProject.getItems().find(i=>i.kind==='operator').worker.motions.walk;return {clipIndex:x.clipIndex,names:x.clipNames,asset:x.asset.entry}});console.log('MOTION',motion);
await p.waitForTimeout(3500);console.log('AFTER',await p.evaluate(()=>{const arr=[];window.__larpRenderer.scene.traverse(o=>{if(o.userData?.isRiggedWorker)arr.push({role:o.userData.activeRole,clip:o.userData.clipName})});return arr}));
await p.waitForTimeout(2500); await p.reload({waitUntil:'networkidle',timeout:120000});await p.waitForFunction(()=>!!window.__larpProject.getItems().find(i=>i.kind==='operator')?.worker?.motions?.walk,null,{timeout:40000});console.log('AUTOSAVE worker+motion PASS');
await p.screenshot({path:'tests/artifacts/v2-mixamo-worker.png'});console.log('ERRORS',JSON.stringify(errors));await b.close();if(errors.length)process.exitCode=1;
