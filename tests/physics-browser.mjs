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
  assert.equal(await page.getByRole('button',{name:'Remove saved workpiece'}).count(),0,'a live scene model cannot be removed as a saved-only definition');
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
  // Delete the imported scene object: its saved workpiece definition and
  // asset must still drive and render the feeder, including after export.
  await page.evaluate(({source})=>window.__larpProject.select(source),ids);
  await page.getByRole('button',{name:'Delete',exact:true}).last().click();
  await page.waitForFunction(({source})=>!window.__larpProject.getItems().some(i=>i.id===source),ids);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.waitForFunction(({source})=>window.__larpProject.getItems().some(i=>i.id===source),ids);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await page.waitForFunction(({source})=>!window.__larpProject.getItems().some(i=>i.id===source),ids);
  await page.evaluate(({feeder})=>window.__larpProject.select(feeder),ids);
  await page.waitForFunction(({source})=>window.__larp.items.some(i=>i.id===source && i.visible===false),ids);
  const saved=await page.evaluate(async({source,button})=>{
    const text=window.__larpProject.getText();
    const {parseProject}=await import('/src/utils/project.ts');
    const parsed=parseProject(text);
    window.__larp.reset();window.__larp.setRunning(true);window.__larp.setButton(button,true);
    for(let i=0;i<90;i++)window.__larp.step(1/60);
    return {catalog:parsed.workpieces?.map(i=>i.id),items:parsed.items.map(i=>i.id),
      boxes:window.__larp.boxes.map(b=>({product:b.productId,hx:b.hx}))};
  },ids);
  assert.ok(saved.catalog.includes(ids.source) && !saved.items.includes(ids.source),'deleted source is a catalog definition, not a scene object');
  assert.ok(saved.boxes.some(b=>b.product===`imported:${ids.source}` && Math.abs(b.hx-.25)<1e-5),'feeder still spawns the independently saved model');
  await page.waitForFunction(()=>{let rendered=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.isImportedModel&&String(o.userData.itemId).startsWith('workpiece-'))rendered=true});return rendered;},null,{timeout:60000});
  assert.match(await page.getByRole('button',{name:'Spawn product',exact:true}).innerText(),/cube/i);
  // Wait for the real IndexedDB autosave, then reload the page rather than
  // merely parsing an in-memory export.
  await page.waitForFunction(async({source})=>{
    const {loadAutosave}=await import('/src/utils/projectStore.ts');
    const {parseProject}=await import('/src/utils/project.ts');
    const saved=await loadAutosave();if(!saved)return false;
    const p=parseProject(saved.text);return !p.items.some(i=>i.id===source)&&p.workpieces?.some(i=>i.id===source&&i.imported?.collision?.boxes?.length);
  },ids,{timeout:30000});
  await page.reload({waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(({source,feeder})=>window.__larpProject?.getItems().some(i=>i.id===feeder)&&!window.__larpProject.getItems().some(i=>i.id===source)&&window.__larpProject.getWorkpieces().some(i=>i.id===source),ids,{timeout:30000});
  await page.evaluate(({feeder})=>{
    window.__larpProject.select(feeder);
    window.__larpProject.setItems(window.__larpProject.getItems().map(i=>i.id===feeder?{...i,props:{...i.props,physicsMode:'kinematic'}}:i));
  },ids);
  await page.waitForFunction(({feeder})=>window.__larp.rigidBodies.active && !!window.__larp.rigidBodies.body(feeder),ids);
  await page.evaluate(({source,button})=>{
    window.__larp.reset();window.__larp.setRunning(true);window.__larp.setButton(button,true);
    for(let i=0;i<90;i++)window.__larp.step(1/60);
    if(window.__larp.rigidBodies.body(source))throw new Error('catalog created a ghost scene body');
  },ids);
  await page.waitForFunction(({source})=>window.__larp.boxes.some(b=>b.productId===`imported:${source}`),ids);
  assert.ok(await page.evaluate(()=>window.__larp.rigidBodies.world.bodies.some(b=>b.collisionFilterGroup===4 && b.shapes.length>1)), 'restored workpiece has its mesh-derived compound collider');
  await page.waitForFunction(()=>{let rendered=false;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.isImportedModel&&String(o.userData.itemId).startsWith('workpiece-'))rendered=true});return rendered;},null,{timeout:60000});
  assert.match(await page.getByRole('button',{name:'Spawn product',exact:true}).innerText(),/cube/i);
  // A retained definition can also be intentionally removed to free project
  // space. Confirmation, component references and undo/redo stay coherent.
  const machineId=await page.evaluate(async({source})=>{
    const {makeItem}=await import('/src/data/library.ts');
    const machine=makeItem('cnc',[5,0,0],0,{props:{inputProduct:`imported:${source}`,outputProduct:`imported:${source}`}});
    window.__larpProject.setItems([...window.__larpProject.getItems(),machine]);return machine.id;
  },ids);
  const remove=page.getByRole('button',{name:'Remove saved workpiece',exact:true});
  await remove.waitFor({state:'visible'});
  page.once('dialog',dialog=>dialog.dismiss());
  await remove.click();
  assert.ok(await page.evaluate(({source})=>window.__larpProject.getWorkpieces().some(i=>i.id===source),ids),'cancelling preserves the saved workpiece');
  page.once('dialog',dialog=>dialog.accept());
  await remove.click();
  await page.waitForFunction(({source,feeder,machine})=>!window.__larpProject.getWorkpieces().some(i=>i.id===source)&&window.__larpProject.getItems().find(i=>i.id===feeder).props.product==='carton'&&window.__larpProject.getItems().find(i=>i.id===machine).props.inputProduct==='carton'&&window.__larpProject.getItems().find(i=>i.id===machine).props.outputProduct==='carton',{...ids,machine:machineId});
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.waitForFunction(({source,feeder,machine})=>window.__larpProject.getWorkpieces().some(i=>i.id===source)&&window.__larpProject.getItems().find(i=>i.id===feeder).props.product===`imported:${source}`&&window.__larpProject.getItems().find(i=>i.id===machine).props.inputProduct===`imported:${source}`,{...ids,machine:machineId});
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await page.waitForFunction(({source})=>!window.__larpProject.getWorkpieces().some(i=>i.id===source),ids);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.waitForFunction(({source})=>window.__larpProject.getWorkpieces().some(i=>i.id===source),ids);
  console.log('browser: saved workpiece cleanup, confirmation and undo/redo OK');
  // Legacy definitions without size or collider metadata are measured even
  // if their source was never rendered and is already absent from the scene.
  const legacyId=await page.evaluate(({source})=>{
    const saved=window.__larpProject.getWorkpieces().find(i=>i.id===source);
    const legacy={...saved,id:'legacy-hidden-workpiece',name:'Legacy hidden workpiece',scale:.4,
      imported:{...saved.imported,asset:{...saved.imported.asset,id:'legacy-hidden-asset'},sourceSize:undefined,collision:undefined}};
    const current=window.__larpProject.getItems();
    window.__larpProject.setItems([...current,legacy]);
    window.__larpProject.setItems(current);
    return legacy.id;
  },ids);
  await page.waitForFunction(id=>{
    const model=window.__larpProject.getWorkpieces().find(i=>i.id===id)?.imported;
    return !window.__larpProject.getItems().some(i=>i.id===id)&&model?.sourceSize?.[0]===1000&&model?.collision?.boxes?.length>1&&window.__larp.items.some(i=>i.id===id&&i.imported?.sourceSize);
  },legacyId,{timeout:60000});
  const legacy=await page.evaluate(async id=>{
    const {parseProject}=await import('/src/utils/project.ts');
    const stored=parseProject(window.__larpProject.getText()).workpieces.find(i=>i.id===id);
    const part=window.__larp.spawn(`imported:${id}`,0,2,0);
    return {size:stored.imported.sourceSize,shapes:stored.imported.collision.boxes.length,half:part.hx};
  },legacyId);
  assert.deepEqual(legacy.size,[1000,1000,1000]);assert.ok(legacy.shapes>1&&Math.abs(legacy.half-.2)<1e-6,'hidden legacy workpiece has measured size and collider');
  console.log('browser: legacy hidden workpiece measured without a scene instance OK');
  console.log('browser: deleted source survives undo/redo, autosave and reload without ghost bodies');
  console.log('browser: imported model feeder and real workpiece mesh OK');

  // Waypoint controls persist relative heights, allow restoring automatic
  // heights, and drive a worker through stairs between overlapping floors.
  const patrol=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');
    const stairs=makeItem('stairs',[0,0,0],0,{props:{width:1.5,length:4,height:2}});
    const deck=makeItem('platform',[4,0,0],0,{props:{width:4,depth:4,height:2}});
    const worker=makeItem('operator',[4,0,1],0,{points:[[0,0],[0,0]],props:{task:'patrol',walkSpeed:1}});
    window.__larpProject.setItems([stairs,deck,worker]);window.__larpProject.select(worker.id);window.__larp.setRunning(false);return worker.id;
  });
  assert.equal(await page.getByLabel('Waypoint 1 Y').inputValue(),'');
  await page.getByLabel('Waypoint 1 Y').fill('0');
  await page.getByLabel('Waypoint 2 Y').fill('2');
  await page.waitForFunction(id=>JSON.stringify(window.__larpProject.getItems().find(i=>i.id===id).pointHeights)==='[0,2]',patrol);
  const route=await page.evaluate(async id=>{
    const {parseProject}=await import('/src/utils/project.ts');const parsed=parseProject(window.__larpProject.getText());
    window.__larp.reset();window.__larp.setRunning(true);for(let i=0;i<32*60;i++)window.__larp.step(1/60);
    return {heights:parsed.items.find(i=>i.id===id).pointHeights,stage:window.__larp.humans.get(id).stage};
  },patrol);
  assert.deepEqual(route.heights,[0,2]);assert.ok(route.stage>=3,'worker walked up and down the stairs');
  await page.getByRole('button',{name:'Use automatic heights'}).click();
  await page.waitForFunction(id=>!window.__larpProject.getItems().find(i=>i.id===id).pointHeights,patrol);
  assert.equal(await page.getByLabel('Waypoint 2 Y').inputValue(),'');
  console.log('browser: multi-floor patrol height controls and round trip OK');

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
  const wirePoint=async()=>page.evaluate(({source,target})=>{let tube;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)tube=o.getObjectByName('signal-cable')});const p=tube?.geometry.parameters.path.getPoint(0);return p&&[p.x,p.y,p.z];},wiring);
  await page.waitForFunction(({source})=>!!window.__larp.rigidBodies.body(source),wiring);
  // Reset after React has synced the new scene: a slow frame or a pending UI
  // running-state effect must not let the source fall before the baseline.
  await page.evaluate(()=>{window.__larp.setRunning(false);window.__larp.reset();});
  await page.waitForFunction(({source,target})=>{let tube;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===source&&o.userData.targetId===target)tube=o.getObjectByName('signal-cable')});return window.__larp.getPhysicsPose(source)?.position[1]>3.9&&tube?.geometry.parameters.path.getPoint(0).y>4.7;},wiring);
  const beforePort=await sourcePort.boundingBox(), beforeWire=await wirePoint();
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
