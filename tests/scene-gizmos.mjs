import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({ graphicsRevision: 4, graphics: 'low', gfx: { shadows: false, contactShadows: false, ao: false, pixelRatio: 0.5 } })));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
  const id=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const item=makeItem('sensor',[0,0,0],0,{name:'Gizmo target'});window.__larpProject.setItems([item]);window.__larpProject.select(item.id);window.__larp.setRunning(false);return item.id;});
  await page.getByTitle('Move (M)').click();
  await page.waitForFunction(()=>{let found=false;window.__larpRenderer?.scene.traverse(o=>{if(o.isTransformControls)found=true});return found;});
  const projectAnchor=()=>page.evaluate(async id=>{const T=await import('/node_modules/three/build/three.module.js');let anchor;window.__larpRenderer.scene.traverse(o=>{if(o.name===`transform-anchor-${id}`)anchor=o});const p=new T.Vector3();anchor.getWorldPosition(p);p.project(window.__larpRenderer.camera);const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},id);
  const centre=await projectAnchor();
  // Pick the actual green Y axis using the control's raycast. Scan along it so
  // this is robust to camera fitting and device-pixel ratio.
  const hitY=await page.evaluate(({centre})=>{let control;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)control=o});const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();for(let offset=25;offset<=100;offset+=4){const x=centre.x,y=centre.y-offset;control.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(control.axis==='Y')return {x,y};}return null;},{centre});
  assert.ok(hitY,'Y translation gizmo is visible and pickable');
  await page.mouse.move(hitY.x,hitY.y);await page.mouse.down();await page.mouse.move(hitY.x,hitY.y-90,{steps:12});await page.mouse.up();
  await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).position[1]>0,id);
  const position=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).position,id);
  assert.equal(position[0],0);assert.equal(position[2],0);assert.equal(position[1]*4,Math.round(position[1]*4),'Y translation snaps to 0.25 m');
  await page.keyboard.press('Control+z');await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).position[1]===0,id);

  // X and Z arrows are also real draggable axes, not just visible decorations.
  for (const axis of ['X','Z']) {
    const center=await projectAnchor();
    const hit=await page.evaluate(({center,axis})=>{let c;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o});const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();for(let rad=18;rad<=110;rad+=5)for(let n=0;n<48;n++){const a=n*Math.PI/24,x=center.x+Math.cos(a)*rad,y=center.y+Math.sin(a)*rad;c.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(c.axis===axis)return {x,y};}return null;},{center,axis});
    assert.ok(hit,`${axis} translation arrow is pickable`);
    const delta=await page.evaluate(async({id,axis})=>{const T=await import('/node_modules/three/build/three.module.js');let a;window.__larpRenderer.scene.traverse(o=>{if(o.name===`transform-anchor-${id}`)a=o});const p=new T.Vector3();a.getWorldPosition(p);const r=window.__larpRenderer.gl.domElement.getBoundingClientRect(),start=p.clone().project(window.__larpRenderer.camera),end=p.clone().add(new T.Vector3(axis==='X'?2:0,0,axis==='Z'?2:0)).project(window.__larpRenderer.camera);return {x:(end.x-start.x)*r.width/2,y:-(end.y-start.y)*r.height/2}},{id,axis});
    await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x+delta.x,hit.y+delta.y,{steps:12});await page.mouse.up();
    const index=axis==='X'?0:2;
    await page.waitForFunction(({id,index})=>Math.abs(window.__larpProject.getItems().find(i=>i.id===id).position[index])>0.2,{id,index});
    const moved=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).position,id);
    assert.equal(moved[index]*4,Math.round(moved[index]*4));assert.equal(moved[1],0);
    await page.keyboard.press('Control+z');await page.waitForFunction(({id,index})=>window.__larpProject.getItems().find(i=>i.id===id).position[index]===0,{id,index});
  }

  await page.getByTitle('Rotate (R)').click();
  await page.waitForFunction(()=>{let c;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o});return c?.mode==='rotate'});
  const middle=await projectAnchor();
  const hitX=await page.evaluate(({middle})=>{let c;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o});const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();for(let rad=25;rad<=115;rad+=6)for(let n=0;n<36;n++){const a=n*Math.PI/18,x=middle.x+Math.cos(a)*rad,y=middle.y+Math.sin(a)*rad;c.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(c.axis==='X')return {x,y};}return null;},{middle});
  assert.ok(hitX,'X rotation ring is visible and pickable');
  await page.mouse.move(hitX.x,hitX.y);await page.mouse.down();await page.mouse.move(hitX.x+55,hitX.y+45,{steps:14});await page.mouse.up();
  await page.waitForFunction(id=>Math.abs(window.__larpProject.getItems().find(i=>i.id===id).rotationX??0)>1,id);
  const turned=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id),id);
  assert.ok(Math.abs(turned.rotationX/15-Math.round(turned.rotationX/15))<0.02,'rotation snaps to 15 degrees');
  assert.equal(await page.getByLabel('Physics mode').inputValue(), 'legacy');
  const serialized=await page.evaluate(()=>window.__larpProject.getText());
  assert.ok(serialized.includes('rotationX'));
  await page.keyboard.press('Control+z');await page.waitForFunction(id=>Math.abs(window.__larpProject.getItems().find(i=>i.id===id).rotationX??0)<0.1,id);

  // The other two rotation rings use the same XYZ representation and snap.
  for (const axis of ['Y','Z']) {
    const center=await projectAnchor();
    const hit=await page.evaluate(({center,axis})=>{let c;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o});const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();for(let rad=25;rad<=115;rad+=6)for(let n=0;n<48;n++){const a=n*Math.PI/24,x=center.x+Math.cos(a)*rad,y=center.y+Math.sin(a)*rad;c.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(c.axis===axis)return {x,y};}return null;},{center,axis});
    assert.ok(hit,`${axis} rotation ring is pickable`);
    await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x+55,hit.y+45,{steps:14});await page.mouse.up();
    const key=axis==='Y'?'rotation':'rotationZ';
    await page.waitForFunction(({id,key})=>Math.abs(window.__larpProject.getItems().find(i=>i.id===id)[key]??0)>1,{id,key});
    const value=await page.evaluate(({id,key})=>window.__larpProject.getItems().find(i=>i.id===id)[key],{id,key});
    assert.ok(Math.abs(value/15-Math.round(value/15))<0.02,`${axis} rotation snaps to 15 degrees`);
    await page.keyboard.press('Control+z');await page.waitForFunction(({id,key})=>Math.abs(window.__larpProject.getItems().find(i=>i.id===id)[key]??0)<0.1,{id,key});
  }

  // The original spline spheres still drag, on a tilted/elevated/yaw-rotated
  // conveyor's own plane instead of the global ground plane.
  const beltId=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const belt=makeItem('conveyor',[0,2,0],45,{name:'Raised path',rotationX:15,points:[[-2,0],[0,0],[2,0]]});window.__larpProject.setItems([belt]);window.__larpProject.select(belt.id);return belt.id});
  await page.getByTitle('Move (M)').click();
  await page.waitForFunction(id=>{let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.splineHandleFor===id&&o.userData.pointIndex===2)found=true});return found;},beltId);
  const points=await page.evaluate(async id=>{const T=await import('/node_modules/three/build/three.module.js');let handle;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.splineHandleFor===id&&o.userData.pointIndex===2)handle=o});const rect=window.__larpRenderer.gl.domElement.getBoundingClientRect();const screen=(p)=>{p.project(window.__larpRenderer.camera);return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2}};const start=new T.Vector3();handle.getWorldPosition(start);const end=handle.parent.localToWorld(new T.Vector3(2.75,0.86,0.5));return {start:screen(start),end:screen(end)}} ,beltId);
  await page.mouse.move(points.start.x,points.start.y);await page.mouse.down();await page.mouse.move(points.end.x,points.end.y,{steps:12});await page.mouse.up();
  await page.waitForFunction(id=>{const p=window.__larpProject.getItems().find(i=>i.id===id).points[2];return Math.abs(p[0]-2.75)<0.26&&Math.abs(p[1]-0.5)<0.26},beltId);
  const control=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).points[2],beltId);
  assert.ok(control.every(v=>Math.abs(v*4-Math.round(v*4))<1e-8),'spline spheres honor snap');
  const cameraBefore=await page.evaluate(()=>window.__larpRenderer.camera.position.toArray());
  const canvas=await page.locator('canvas').first().boundingBox();assert.ok(canvas);
  const empty={x:canvas.x+canvas.width*0.65,y:canvas.y+canvas.height*0.2};
  await page.mouse.move(empty.x,empty.y);await page.mouse.down();await page.mouse.move(empty.x+110,empty.y+55,{steps:10});await page.mouse.up();
  await page.waitForFunction(before=>window.__larpRenderer.camera.position.toArray().some((v,i)=>Math.abs(v-before[i])>0.1),cameraBefore);
  await page.mouse.click(empty.x,empty.y);
  await page.waitForFunction(()=>{let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)found=true});return !found;});
  assert.deepEqual(errors,[]);
  await page.close();console.log('3D gizmos: XYZ move/rotation, snapping, undo, orbit, deselection, save and elevated spline handles PASS');
} finally {await browser.close();}
