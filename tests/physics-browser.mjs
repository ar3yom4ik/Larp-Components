import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1500,height:950}}), errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({graphicsRevision:4, graphics:'low', gfx:{shadows:false, contactShadows:false, ao:false, pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173', {waitUntil:'networkidle',timeout:120000});

  // A selected spline point gets a real Y-axis control and local height snaps.
  const beltId = await page.evaluate(async () => {
    const {makeItem} = await import('/src/data/library.ts');
    const belt = makeItem('conveyor', [0,0,0], 0, {name:'3D path', points:[[-2,0],[0,0],[2,0]], pointHeights:[0,0,0]});
    window.__larpProject.setItems([belt]); window.__larpProject.select(belt.id); window.__larp.setRunning(false); return belt.id;
  });
  await page.getByTitle('Move (M)').click();
  await page.getByLabel('Point 3 Y').focus();
  await page.waitForFunction(id => {let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.name===`spline-transform-anchor-${id}-2`)found=true});return found;},beltId);
  const centre = await page.evaluate(async id => {
    const T=await import('/node_modules/three/build/three.module.js'); let anchor;
    window.__larpRenderer.scene.traverse(o=>{if(o.name===`spline-transform-anchor-${id}-2`)anchor=o});
    const p=new T.Vector3();anchor.getWorldPosition(p);p.project(window.__larpRenderer.camera);
    const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
  },beltId);
  const hitY=await page.evaluate(({centre})=>{let c;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o});const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();for(let d=25;d<=100;d+=4){const x=centre.x,y=centre.y-d;c.pointerHover({x:(x-r.left)/r.width*2-1,y:1-(y-r.top)/r.height*2,button:0});if(c.axis==='Y')return {x,y};}return null;},{centre});
  assert.ok(hitY,'spline Y arrow must be pickable');
  await page.mouse.move(hitY.x,hitY.y); await page.mouse.down(); await page.mouse.move(hitY.x,hitY.y-90,{steps:12}); await page.mouse.up();
  await page.waitForFunction(id=>(window.__larpProject.getItems().find(i=>i.id===id).pointHeights?.[2] ?? 0) > .2,beltId);
  const edited=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id),beltId);
  assert.equal(edited.pointHeights[2]*4, Math.round(edited.pointHeights[2]*4),'point height uses quarter-metre snap');
  assert.deepEqual(edited.points[2],[2,0],'vertical drag leaves X/Z unchanged');
  assert.ok((await page.evaluate(()=>window.__larpProject.getText())).includes('pointHeights'));
  await page.getByRole('button',{name:'Reverse flow'}).last().click();
  await page.waitForFunction(({id,h})=>window.__larpProject.getItems().find(i=>i.id===id).pointHeights[0]===h,{id:beltId,h:edited.pointHeights[2]});
  console.log('browser: vertical point gizmo and reverse flow OK');

  // Import a real STL, choose it in the feeder, and verify its actual model is
  // rendered as the moving part, not the stock carton proxy.
  await page.getByRole('button',{name:'Import 3D model',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Import 3D model'});
  await modal.getByLabel('Choose model files').setInputFiles('tests/fixtures/cube.stl');
  await modal.getByRole('button',{name:'Import model',exact:true}).click();
  await modal.waitFor({state:'detached',timeout:60000});
  const ids=await page.evaluate(async () => {
    const {makeItem}=await import('/src/data/library.ts');
    const source=window.__larpProject.getItems().find(i=>i.kind==='imported-model');
    const feeder=makeItem('feeder',[0,0,0],0,{name:'Custom feeder',props:{active:true,interval:.5,product:'carton'}});
    const belt=makeItem('conveyor',[0,0,0],0,{points:[[-2,0],[2,0]],props:{speed:.5,active:true,stopper:true}});
    const button=makeItem('button',[-4,0,0],0,{props:{signal:false,connectedTo:feeder.id}});
    window.__larpProject.setItems([{...source,visible:false,scale:.3},belt,feeder,button]);window.__larpProject.select(feeder.id);
    return {source:source.id,feeder:feeder.id,button:button.id};
  });
  await page.getByRole('button',{name:'Spawn product',exact:true}).click();
  await page.getByRole('option',{name:/cube/i}).click();
  await page.waitForFunction(({source,feeder})=>window.__larpProject.getItems().find(i=>i.id===feeder).props.product===`imported:${source}`,ids);
  const loaded=await page.evaluate(({source,button})=>{
    const item=window.__larpProject.getItems().find(i=>i.id===source);
    window.__larp.reset();window.__larp.setRunning(true);window.__larp.setButton(button,true);
    for(let i=0;i<90;i++)window.__larp.step(1/60);
    return {size:item.imported.sourceSize, boxes:window.__larp.boxes.map(b=>({id:b.id,product:b.productId,hx:b.hx,hy:b.hy,hz:b.hz}))};
  },ids);
  assert.deepEqual(loaded.size,[1000,1000,1000]);
  assert.ok(loaded.boxes.some(b=>b.product===`imported:${ids.source}` && Math.abs(b.hx-.15)<1e-5));
  await page.waitForFunction(()=>{let part=false,mesh=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.importedWorkpiece)part=true;if(o.userData?.isImportedModel&&String(o.userData.itemId).startsWith('workpiece-'))mesh=true});return part&&mesh;},null,{timeout:60000});
  await page.evaluate(({source})=>{window.__larp.setRunning(false);window.__larpProject.setItems(window.__larpProject.getItems().map(i=>i.id===source?{...i,scale:.5}:i));},ids);
  await page.waitForFunction(({source})=>window.__larp.items.find(i=>i.id===source)?.scale===.5,ids);
  await page.waitForTimeout(300);
  await page.waitForFunction(async()=>{
    const T=await import('/node_modules/three/build/three.module.js');let part;
    window.__larpRenderer.scene.traverse(o=>{if(o.userData?.importedWorkpiece)part=o});
    if(!part)return false;
    const size=new T.Box3().setFromObject(part).getSize(new T.Vector3());
    return Math.abs(size.x-.3)<.03&&Math.abs(size.y-.3)<.03&&Math.abs(size.z-.3)<.03;
  },null,{timeout:30000});
  console.log('browser: imported model feeder and real workpiece mesh OK');

  // All component types expose the mode and weight; visible body motion and
  // live runtime anchors are driven by the same solver pose.
  const dynamic=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const deck=makeItem('platform',[0,0,0],0,{props:{width:4,depth:4,height:2}});
    const cabinet=makeItem('cabinet',[0,5,0],0,{name:'Falling cabinet'});
    window.__larpProject.setItems([deck,cabinet]);window.__larpProject.select(cabinet.id);window.__larp.setRunning(false);return {deck:deck.id,cabinet:cabinet.id};
  });
  assert.equal(await page.getByLabel('Physics mode').inputValue(),'legacy');
  await page.getByLabel('Physics mode').selectOption('kinematic');
  await page.waitForFunction(({cabinet})=>window.__larp.rigidBodies.active&&!!window.__larp.rigidBodies.body(cabinet),dynamic);
  await page.getByLabel('Physics mode').selectOption('dynamic');
  await page.getByLabel('Weight (kg)').fill('25');
  await page.waitForFunction(({cabinet})=>window.__larpProject.getItems().find(i=>i.id===cabinet).props.physicsMass===25,dynamic);
  await page.evaluate(()=>{window.__larp.reset();window.__larp.setRunning(true);for(let i=0;i<240;i++)window.__larp.step(1/60);});
  await page.waitForFunction(({cabinet})=>{const p=window.__larp.getPhysicsPose(cabinet);return p&&p.position[1]<2.2;},dynamic);
  await page.waitForFunction(({cabinet})=>{let item;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.sceneItemId===cabinet)item=o});return item&&Math.abs(item.position.y-window.__larp.getPhysicsPose(cabinet).position[1])<.05;},dynamic);
  const body = await page.evaluate(({cabinet})=>({pose:window.__larp.getPhysicsPose(cabinet),mass:window.__larp.rigidBodies.body(cabinet).mass}),dynamic);
  assert.ok(Math.abs(body.pose.position[1]-2)<.1); assert.equal(body.mass,25);
  await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByLabel('Physics mode').selectOption('kinematic');
  await page.waitForFunction(({cabinet})=>{let item;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.sceneItemId===cabinet)item=o});return !window.__larp.getPhysicsPose(cabinet)&&item&&Math.abs(item.position.y-5)<.01;},dynamic);
  await page.getByLabel('Physics mode').selectOption('dynamic');
  await page.evaluate(()=>window.__larp.reset());
  assert.ok(Math.abs((await page.evaluate(({cabinet})=>window.__larp.getPhysicsPose(cabinet).position[1],dynamic))-5)<1e-5);

  const wiring=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const target=makeItem('feeder',[3,0,0],0,{name:'Wire receiver'});
    const source=makeItem('button',[-2,4,0],0,{name:'Falling switch',props:{connectedTo:target.id,physicsMode:'dynamic',physicsMass:4}});
    window.__larpProject.setItems([source,target]);window.__larpProject.select(null);window.__larp.setRunning(false);return {source:source.id,target:target.id};
  });
  await page.getByRole('button',{name:'Edit signal connections'}).click();
  const sourcePort=page.getByRole('button',{name:'Signal output: Falling switch'});
  await sourcePort.waitFor({state:'visible'});
  const beforePort=await sourcePort.boundingBox();
  const wirePoint=async()=>page.evaluate(({source,target})=>{let tube;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)tube=o.getObjectByName('signal-cable')});const p=tube?.geometry.parameters.path.getPoint(0);return p&&[p.x,p.y,p.z];},wiring);
  await page.waitForFunction(({source,target})=>{let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)found=true});return found;},wiring);
  const beforeWire=await wirePoint();
  await page.evaluate(()=>{window.__larp.setRunning(true);for(let i=0;i<240;i++)window.__larp.step(1/60);window.__larp.setRunning(false);});
  await page.waitForFunction(async({source,target})=>{
    let tube;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)tube=o.getObjectByName('signal-cable')});
    if(!tube)return false;
    const {signalAnchor}=await import('/src/utils/signalPorts.ts');
    const item=window.__larpProject.getItems().find(i=>i.id===source),pose=window.__larp.getPhysicsPose(source),expected=signalAnchor({...item,...pose},'source');
    const p=tube.geometry.parameters.path.getPoint(0);return Math.abs(p.y-expected[1])<.04&&pose.position[1]<.2;
  },wiring);
  const afterWire=await wirePoint(), afterPort=await sourcePort.boundingBox();
  assert.ok(beforeWire[1]-afterWire[1]>3.5,'cable follows its falling source');
  assert.ok(Math.abs(beforePort.y-afterPort.y)>20,'draggable source port follows its falling component');
  await page.evaluate(({source})=>window.__larpProject.select(source),wiring);
  await page.getByLabel('Physics mode').selectOption('kinematic');
  await page.waitForFunction(({source,target})=>{let tube;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)tube=o.getObjectByName('signal-cable')});return !window.__larp.getPhysicsPose(source)&&tube?.geometry.parameters.path.getPoint(0).y>4.7;},wiring);
  await page.waitForFunction(({source})=>{const r=document.querySelector(`[data-signal-output="${source}"]`)?.getBoundingClientRect();return r&&r.y<600;},wiring);
  console.log('browser: moving signal cable and draggable port follow physics pose and reset when made kinematic OK');

  await page.getByPlaceholder('Search components...').fill('Elevated Platform');
  assert.ok((await page.getByText('Elevated Platform',{exact:true}).count())>0);
  await page.getByPlaceholder('Search components...').fill('Industrial Stairs');
  assert.ok((await page.getByText('Industrial Stairs',{exact:true}).count())>0);
  assert.deepEqual(errors,[]);
  console.log('browser: physics controls, dynamic viewport, reset, platform and stairs catalogue OK');
} finally { await browser.close(); }
