import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpProject && window.__larpRenderer);
  const ids=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const {loadModelAsset,describeImportedModel,primeModelCache}=await import('/src/utils/modelImport.ts');
    const {modelMaterialRef}=await import('/src/utils/materialRef.ts');
    const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ff4400';ctx.fillRect(0,0,8,8);ctx.fillStyle='#00aaff';ctx.fillRect(0,0,4,4);
    const obj='mtllib surface.mtl\no Material\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl Checker\nf 1/1 2/2 3/3\n';
    const mtl='newmtl Checker\nKd 1 1 1\nmap_Kd checker.png\n';
    const asset={id:'textured-material-test',entry:'surface.obj',files:[{path:'surface.obj',dataUrl:'data:text/plain;base64,'+btoa(obj)},{path:'surface.mtl',dataUrl:'data:text/plain;base64,'+btoa(mtl)},{path:'checker.png',dataUrl:canvas.toDataURL()}]};
    const {root,warnings,clips}=await loadModelAsset(asset);primeModelCache(asset,root,warnings,clips);
    const model=describeImportedModel(asset,root,clips);
    if(!model.materials[0].preview?.startsWith('data:image/jpeg'))throw new Error('original texture preview was not captured');
    model.materials[0]={...model.materials[0],name:'Checker paint',color:'#ffffff'};
    const source=makeItem('imported-model',[20,0,0],0,{name:'Texture source',imported:model,visible:false});
    const ref=modelMaterialRef(source.id,0);
    const platform=makeItem('platform',[-4,0,0],0,{props:{width:3,depth:3,height:2,surfaceMaterial:ref}});
    const stairs=makeItem('stairs',[0,0,0],0,{props:{width:2,length:4,height:2,surfaceMaterial:ref}});
    const wall=makeItem('wall',[5,0,0],0,{points:[[-2,0],[2,0]],props:{height:3,surfaceMaterial:ref}});
    window.__larpProject.setItems([source,platform,stairs,wall]);
    return {source:source.id,platform:platform.id,stairs:stairs.id,wall:wall.id,ref};
  });
  // Inspect the materials actually attached to rendered meshes, not just the
  // serialized picker value. All three building kinds must load the image.
  await page.waitForFunction(({platform,stairs,wall})=>{
    const found=new Set();window.__larpRenderer.scene.traverse(o=>{
      if (![platform,stairs,wall].includes(o.userData?.sceneItemId)) return;
      o.traverse(child=>{if(child.isMesh && child.material?.map?.image?.complete)found.add(o.userData.sceneItemId)});
    });return found.size===3;
  },ids,{timeout:30000});
  const rendered=await page.evaluate(({platform,stairs,wall})=>{
    const result={};window.__larpRenderer.scene.traverse(o=>{
      if(![platform,stairs,wall].includes(o.userData?.sceneItemId))return;
      const mats=[];o.traverse(child=>{if(child.isMesh&&child.material?.map)mats.push({map:!!child.material.map.image,color:child.material.color.getHexString()});});result[o.userData.sceneItemId]=mats;
    });return result;
  },ids);
  for(const id of [ids.platform,ids.stairs,ids.wall])assert.ok(rendered[id].some(m=>m.map&&m.color==='ffffff'),`surface ${id} uses the imported texture and color`);
  // The exact same named preview is offered by the inspector on each surface.
  const inspector=page.locator('aside').last();await inspector.getByRole('button',{name:'Scene tree',exact:true}).click();
  for(const kind of ['platform','stairs','wall']) {
    const name=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).name,ids[kind]);
    await inspector.getByRole('button',{name,exact:true}).click();await inspector.getByRole('button',{name:'Properties',exact:true}).click();
    const choice=inspector.getByRole('button',{name:'Surface material',exact:true});await choice.waitFor();
    assert.match(await choice.innerText(),/Texture source · Checker paint/);
    await choice.click();const option=inspector.locator('[data-material-option]').filter({hasText:'Texture source · Checker paint'});
    assert.ok((await option.locator('[data-material-preview]').getAttribute('style')).includes('data:image/jpeg'),'preview displays the actual texture');
    await choice.click();await inspector.getByRole('button',{name:'Scene tree',exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  console.log('material surfaces: imported texture and named preview on platforms, stairs and spline walls PASS');
} finally {await browser.close();}
