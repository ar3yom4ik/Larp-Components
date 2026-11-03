import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1500,height:900}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpProject&&window.__larpRenderer&&window.__larp);

  const selectAllByBox = async ids => {
    await page.getByTitle('Select (V)').click();
    await page.getByRole('button',{name:'Top',exact:true}).click();
    await page.getByRole('button',{name:'Fit',exact:true}).click(); await page.waitForTimeout(800);
    const rect=await page.evaluate(async ids=>{
      const T=await import('/node_modules/three/build/three.module.js');const {scene,camera,gl}=window.__larpRenderer;const r=gl.domElement.getBoundingClientRect();const points=[];
      scene.traverse(o=>{if(ids.includes(o.userData?.sceneItemId)){const box=new T.Box3().setFromObject(o);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);points.push({x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2});}}});
      return {left:Math.max(r.left+5,Math.min(...points.map(p=>p.x))-12),right:Math.min(r.right-5,Math.max(...points.map(p=>p.x))+12),top:Math.max(r.top+5,Math.min(...points.map(p=>p.y))-12),bottom:Math.min(r.bottom-5,Math.max(...points.map(p=>p.y))+12)};
    },ids);
    await page.mouse.move(rect.left,rect.top);await page.mouse.down();await page.mouse.move(rect.right,rect.bottom,{steps:12});await page.mouse.up();
    await page.waitForFunction(ids=>ids.every(id=>window.__larpProject.getSelection().includes(id)),ids,{timeout:10000});
    assert.equal(await page.evaluate(()=>window.__larpProject.getSelection().length),ids.length);
    await page.getByRole('button',{name:'Iso',exact:true}).click(); await page.waitForTimeout(700);
  };
  const moveY = async primary => {
    await page.getByTitle('Move (M)').click();
    await page.waitForFunction(id=>{let a;window.__larpRenderer.scene.traverse(o=>{if(o.name===`transform-anchor-${id}`)a=o});return !!a;},primary);
    const hit=await page.evaluate(async id=>{const T=await import('/node_modules/three/build/three.module.js');let anchor,control;window.__larpRenderer.scene.traverse(o=>{if(o.name===`transform-anchor-${id}`)anchor=o;if(o.isTransformControls)control=o});const p=new T.Vector3(),r=window.__larpRenderer.gl.domElement.getBoundingClientRect();anchor.getWorldPosition(p);p.project(window.__larpRenderer.camera);const cx=r.left+(p.x+1)*r.width/2,cy=r.top+(1-p.y)*r.height/2;for(let rad=16;rad<=125;rad+=5)for(let n=0;n<48;n++){const a=n*Math.PI/24,x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;control.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(control.axis==='Y')return {x,y};}return null;},primary);
    assert.ok(hit,'group Y gizmo is pickable');
    await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x,hit.y-85,{steps:12});await page.mouse.up();
  };

  const ids=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const a=makeItem('cabinet',[-2,5,0],0,{name:'Falling cabinet A'}),b=makeItem('cabinet',[2,6,0],0,{name:'Falling cabinet B'});
    for(const item of [a,b])item.props={...item.props,physicsMode:'dynamic',physicsMass:5};
    window.__larpProject.setItems([a,b]);window.__larpProject.select(null);window.__larp.setRunning(false);return [a.id,b.id];
  });
  await page.waitForFunction(ids=>ids.every(id=>!!window.__larp.getPhysicsPose(id)),ids);
  const before=await page.evaluate(ids=>{
    window.__larp.setRunning(true);for(let i=0;i<150;i++)window.__larp.step(1/60);window.__larp.setRunning(false);
    return ids.map(id=>window.__larp.getPhysicsPose(id));
  },ids);
  assert.ok(before[0].position[1]<3 && before[1].position[1]<3,'dynamic bodies fell from their authored positions');
  await selectAllByBox(ids); await moveY(ids[1]);
  await page.waitForFunction(ids=>window.__larpProject.getItems().find(i=>i.id===ids[1]).position[1]<4,ids);
  const edited=await page.evaluate(ids=>ids.map(id=>window.__larpProject.getItems().find(i=>i.id===id)),ids);
  const deltas=edited.map((item,index)=>item.position[1]-before[index].position[1]);
  assert.ok(deltas[0]>.2 && Math.abs(deltas[0]-deltas[1])<.01,`group movement starts from live, not authored, poses: ${JSON.stringify({before,edited,deltas})}`);

  // Moving a mounted detector with its conveyor preserves its mount and signal
  // links; the resolved detector follows the belt exactly once, not twice.
  const mounted=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const belt=makeItem('conveyor',[0,0,0],0,{name:'Mounted group belt',points:[[-2,0],[2,0]]});
    const laser=makeItem('laser',[0,0,0],0,{name:'Mounted group laser'});
    laser.props={...laser.props,mountedTo:belt.id,mountPosition:.5,connectedTo:'external'};
    laser.signalTargets=['external']; laser.signalRoutes=[{output:1,targetId:'external',input:1}];
    window.__larpProject.setItems([laser,belt]);window.__larpProject.select(null);window.__larp.setRunning(false);
    return {belt:belt.id,laser:laser.id};
  });
  await page.waitForFunction(ids=>window.__larpProject.getItems().length===2&&window.__larpProject.getItems().some(i=>i.id===ids.laser&&i.position[1]>.5),mounted);
  const mountedBefore=await page.evaluate(ids=>Object.fromEntries(window.__larpProject.getItems().map(i=>[i.id,i])),mounted);
  await selectAllByBox([mounted.laser,mounted.belt]);await moveY(mounted.belt);
  await page.waitForFunction(ids=>window.__larpProject.getItems().find(i=>i.id===ids.belt).position[1]>.2,mounted);
  const mountedAfter=await page.evaluate(ids=>Object.fromEntries(window.__larpProject.getItems().map(i=>[i.id,i])),mounted);
  const beltDelta=mountedAfter[mounted.belt].position[1]-mountedBefore[mounted.belt].position[1];
  const laserDelta=mountedAfter[mounted.laser].position[1]-mountedBefore[mounted.laser].position[1];
  assert.ok(Math.abs(beltDelta-laserDelta)<.001,`mounted sensor must follow belt once: ${beltDelta}, ${laserDelta}`);
  assert.equal(mountedAfter[mounted.laser].props.mountedTo,mounted.belt);
  assert.equal(mountedAfter[mounted.laser].signalTargets[0],'external');
  await page.keyboard.press('Control+z');
  await page.waitForFunction(ids=>window.__larpProject.getItems().find(i=>i.id===ids.belt).position[1]===0,mounted);
  assert.deepEqual(errors,[]);
  console.log('selection physics: group transforms use live dynamic poses and mounted sensors follow their belt with links intact OK');
} finally {await browser.close();}
