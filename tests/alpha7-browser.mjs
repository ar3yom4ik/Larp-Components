import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
 // Catalog sections resize from the keyboard, not only by mouse.
 const tree=page.locator('.collections-tree'),oldHeight=(await tree.boundingBox()).height;
 await page.getByRole('separator',{name:'Resize catalog sections'}).focus();await page.keyboard.press('ArrowDown');
 assert.ok((await tree.boundingBox()).height>oldHeight);
 // Numbered color-sensor outputs attach to different numbered robot inputs.
 const ids=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const sensor=makeItem('color-sensor',[-3,0,0],0,{name:'Palette sensor',signalChannels:[{port:1,mode:'match',material:'#d84d38',color:'#ff0000'},{port:2,mode:'match',material:'#b89a6c',color:'#00ff00'}]});const robot=makeItem('robot',[3,0,0],0,{name:'Multi robot',signalChannels:[{port:1,mode:'operation-end'},{port:2,mode:'operation-end'}]});window.__larpProject.setItems([sensor,robot]);return{sensor:sensor.id,robot:robot.id}});
 await page.getByRole('button',{name:'Edit signal connections'}).click();
 assert.equal(await page.locator(`[data-signal-input="${ids.sensor}"]`).count(),0,'sensor is output-only');
 await page.getByRole('button',{name:'Signal output 2: Palette sensor'}).click();
 await page.getByRole('button',{name:'Signal input 2: Multi robot'}).click();
 await page.waitForFunction(({sensor,robot})=>window.__larpProject.getItems().find(i=>i.id===sensor)?.signalRoutes?.some(r=>r.output===2&&r.input===2&&r.targetId===robot),ids);
 await page.waitForFunction(({sensor,robot})=>{let ok=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===sensor&&o.userData.targetId===robot&&o.userData.outputPort===2&&o.userData.inputPort===2)ok=true});return ok},ids);
 await page.getByRole('button',{name:'Edit signal connections'}).click();
 // A shaped platform exposes its four actual viewport handles.
 const platform=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const p=makeItem('platform',[0,0,0],0,{name:'Deck'});window.__larpProject.setItems([p]);window.__larpProject.select(p.id);return p.id});
 await page.getByTitle('Move (M)').click();
 await page.waitForFunction(id=>{let n=0;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.splineHandleFor===id)n++});return n===4},platform);
 await page.getByLabel('Corner 3 X').fill('3');await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id)?.points?.[2][0]===3,platform);
 await page.getByLabel('Height (m)').fill('3.6');await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id)?.props.height===4,platform);
 // Import a UV-less model, enable world projection and exercise PBR shader maps.
 await page.getByRole('button',{name:'Import 3D model',exact:true}).first().click();
 const dialog=page.getByRole('dialog',{name:'Import 3D model'});
 const obj='o NoUV\nv -1 0 0\nv 1 0 0\nv 0 2 0\nf 1 2 3\n';
 await dialog.getByLabel('Choose model files').setInputFiles({name:'nouv.obj',mimeType:'text/plain',buffer:Buffer.from(obj)});
 await dialog.getByRole('button',{name:'Import model',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.kind==='imported-model'),{timeout:30000});
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+pK0AAAAASUVORK5CYII=';
 const model=await page.evaluate(png=>{const items=window.__larpProject.getItems();const item=items.find(i=>i.kind==='imported-model');const m=item.imported.materials[0];m.worldProjection=true;m.worldProjectionScale=2;for(const slot of ['map','roughnessMap','metalnessMap','normalMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])m.textures[slot]={name:'tile.png',dataUrl:png};item.imported={...item.imported,materials:[{...m,textures:{...m.textures}}]};window.__larpProject.setItems([...items]);window.__larpProject.select(item.id);return item.id},png);
 await page.waitForFunction(id=>{let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.sceneItemId===id)o.traverse(n=>{if(n.isMesh&&n.material?.userData?.larpWorldProjection)found=true})});return found},model,{timeout:30000});
 await page.waitForTimeout(2500);
 assert.equal(await page.getByLabel('WPO world projection').isChecked(),true);
 assert.ok((await page.evaluate(()=>window.__larpProject.getText())).includes('worldProjectionScale'));
 // Render the actual imported PBR material on UV-less geometry. Two points
 // see different texels and the world-space pattern stays put as the mesh moves.
 const projection=await page.evaluate(async()=>{
   const T=await import('/node_modules/three/build/three.module.js');let material;
   window.__larpRenderer.scene.traverse(o=>{if(o.isMesh&&!material){const m=Array.isArray(o.material)?o.material[0]:o.material;if(m?.userData?.larpWorldProjection)material=m;}});
   const r=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false});r.setSize(200,200);r.setPixelRatio(1);r.toneMapping=T.NoToneMapping;
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,10);camera.position.set(0,0,4);camera.lookAt(0,0,0);scene.add(new T.AmbientLight(0xffffff,2));
   const texture=new T.DataTexture(new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]),2,2,T.RGBAFormat);
   texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=texture.minFilter=T.NearestFilter;texture.needsUpdate=true;
   const slots=['map','normalMap','bumpMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','displacementMap'],saved=Object.fromEntries(slots.map(k=>[k,material[k]]));
   const colors=[material.color.clone(),material.emissive.clone(),material.roughness,material.metalness,material.userData.larpUniforms.worldScale.value];
   slots.forEach(k=>material[k]=null);material.map=texture;material.color.set('white');material.emissive.set('black');material.roughness=1;material.metalness=0;material.userData.larpUniforms.worldScale.value=1;material.needsUpdate=true;
   const geometry=new T.PlaneGeometry(2,2);geometry.deleteAttribute('uv');const plane=new T.Mesh(geometry,material);scene.add(plane);
   const gl=r.getContext(),pixel=(x,y)=>{const v=new Uint8Array(4);gl.readPixels(Math.floor((x+2)*50),Math.floor((y+2)*50),1,1,gl.RGBA,gl.UNSIGNED_BYTE,v);return Array.from(v);};
   r.render(scene,camera);const first=pixel(.2,.1),adjacent=pixel(.7,.1),above=pixel(.2,.7);
   plane.position.x=.5;r.render(scene,camera);const moved=pixel(.2,.1);
   Object.assign(material,saved);material.color.copy(colors[0]);material.emissive.copy(colors[1]);material.roughness=colors[2];material.metalness=colors[3];material.userData.larpUniforms.worldScale.value=colors[4];material.needsUpdate=true;geometry.dispose();texture.dispose();r.dispose();
   return {first,adjacent,above,moved};
 });
 assert.notDeepEqual(projection.first,projection.adjacent,'UV-less mesh displays a varying world-projected texture');
 assert.notDeepEqual(projection.first,projection.above,'world projection covers both planar axes');
 assert.deepEqual(projection.first,projection.moved,'moving the mesh does not move the world-anchored texels');
 // VXGI reports its WPO fallback only while a projected model is actually in
 // the scene or a live workpiece; a dormant catalog entry cannot force WebGL.
 await page.evaluate(()=>window.__larpTheme.setGfx({gi:'vxgi'}));
 await page.getByTitle('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'Video',exact:true}).click();
 await page.locator('[data-gi-detail]').getByText(/World projection uses WebGL/).waitFor({timeout:30000});
 await page.evaluate(id=>window.__larpProject.setItems(window.__larpProject.getItems().filter(i=>i.id!==id)),model);
 assert.ok(await page.evaluate(()=>window.__larpProject.getWorkpieces().some(i=>i.imported?.materials.some(m=>m.worldProjection))),'deleted scene model remains in catalog');
 await page.waitForFunction(()=>!document.querySelector('[data-gi-detail]')?.textContent?.includes('World projection uses WebGL'),null,{timeout:30000});
 const product=await page.evaluate(async()=>{const {importedProductId}=await import('/src/data/products.ts');return importedProductId(window.__larpProject.getWorkpieces().find(i=>i.imported?.materials.some(m=>m.worldProjection)));});
 await page.evaluate(id=>window.__larp.spawn(id,0,2,0),product);
 await page.locator('[data-gi-detail]').getByText(/World projection uses WebGL/).waitFor({timeout:30000});
 await page.evaluate(()=>window.__larp.reset());
 await page.waitForFunction(()=>!document.querySelector('[data-gi-detail]')?.textContent?.includes('World projection uses WebGL'),null,{timeout:30000});
 assert.deepEqual(errors,[]);
 console.log('alpha.7 browser: catalog resize, numbered scene ports, platform handles, snapped height and visible UV-less WPO projection PASS');
} finally {await browser.close()}
