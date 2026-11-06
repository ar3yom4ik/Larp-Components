import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1650,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 const id=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const robot=makeItem('robot',[2,0,-2],35,{name:'Teaching arm',rotationX:8,rotationZ:-5,scale:1.2,props:{speed:100,outputMode:'operation-end'}});window.__larpProject.setItems([robot]);window.__larpProject.select(robot.id);return robot.id;});
 await page.getByTitle('PTP teaching').click();const panel=page.getByRole('dialog',{name:'PTP teaching'});await panel.waitFor();
 if(await panel.getByRole('button',{name:'Pause',exact:true}).count())await panel.getByRole('button',{name:'Pause',exact:true}).click();
 await page.waitForFunction(()=>!window.__larp.running);
 await panel.getByRole('button',{name:'Teach current TCP'}).click();
 const first=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[0].position,id);
 const before=await page.evaluate(id=>({tip:[...window.__larp.robots.get(id).tip],base:[...window.__larpProject.getItems().find(i=>i.id===id).position]}),id);
 await page.waitForFunction(id=>{let anchor=false,control=false;window.__larpRenderer.scene.traverse(o=>{if(o.name===`ptp-anchor-${id}`)anchor=true;if(o.isTransformControls)control=true});return anchor&&control},id);
 async function dragAxis(axis,metres) {
  const drag=await page.evaluate(async ({id,axis,metres})=>{
   const T=await import('/node_modules/three/build/three.module.js');let c,a;window.__larpRenderer.scene.traverse(o=>{if(o.isTransformControls)c=o;if(o.name===`ptp-anchor-${id}`)a=o});
   const rect=window.__larpRenderer.gl.domElement.getBoundingClientRect(),pos=new T.Vector3();a.getWorldPosition(pos);
   const screen=(p)=>{p.project(window.__larpRenderer.camera);return{x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2}};
   const centre=screen(pos.clone()),end=screen(pos.clone().add(new T.Vector3(axis==='X'?metres:0,axis==='Y'?metres:0,axis==='Z'?metres:0)));let hit;
   for(let rad=20;rad<110&&!hit;rad+=4)for(let n=0;n<72;n++){const theta=n*Math.PI/36,x=centre.x+Math.cos(theta)*rad,y=centre.y+Math.sin(theta)*rad;c.pointerHover({x:(x-rect.left)/rect.width*2-1,y:1-(y-rect.top)/rect.height*2,button:0});if(c.axis===axis){hit={x,y};break;}}
   return {centre,end,hit};
  },{id,axis,metres});
  assert.ok(drag.hit,`${axis} PTP gizmo is visible and pickable`);
  await page.mouse.move(drag.hit.x,drag.hit.y);await page.mouse.down();await page.mouse.move(drag.hit.x+drag.end.x-drag.centre.x,drag.hit.y+drag.end.y-drag.centre.y,{steps:16});await page.mouse.up();
 }
 await dragAxis('Y',.5);
 await page.waitForFunction(({id,before})=>Math.abs(window.__larp.robots.get(id).tip[1]-before.tip[1])>.1,{id,before});
 const afterJog=await page.evaluate(id=>({tip:[...window.__larp.robots.get(id).tip],item:window.__larpProject.getItems().find(i=>i.id===id)}),id);
 assert.deepEqual(afterJog.item.position,before.base,'PTP jog never drags the base');assert.deepEqual(afterJog.item.ptp.points[0].position,first,'jogging does not overwrite a taught point');
 await panel.getByRole('button',{name:'Teach current TCP'}).click();
 await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points.length===2,id);
 const second=await page.evaluate(id=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[1].position,id);
 assert.ok(Math.hypot(...second.map((x,i)=>x-first[i]))>.1);
 const marker=await page.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js');let marker;window.__larpRenderer.scene.traverse(o=>{if(o.name==='ptp-point-1')marker=o});const p=new T.Vector3();marker.getWorldPosition(p);p.project(window.__larpRenderer.camera);const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}});
 await page.mouse.click(marker.x,marker.y);await panel.getByLabel('PTP point name').waitFor();assert.equal(await panel.getByLabel('PTP point name').inputValue(),'PTP 1','3D marker selects its waypoint');
 await panel.getByRole('button',{name:'Edit point',exact:true}).click();
 await dragAxis('X',.5);
 await page.waitForFunction(({id,first})=>{const p=window.__larpProject.getItems().find(i=>i.id===id).ptp.points[0].position;return Math.hypot(...p.map((n,i)=>n-first[i]))>.1},{id,first});
 const afterEdit=await page.evaluate(id=>({tip:[...window.__larp.robots.get(id).tip],item:window.__larpProject.getItems().find(i=>i.id===id)}),id);
 assert.deepEqual(afterEdit.tip,afterJog.tip,'editing a point does not move the robot');assert.deepEqual(afterEdit.item.position,before.base);
 await page.keyboard.press('Control+z');await page.waitForFunction(({id,first})=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[0].position.every((n,i)=>Math.abs(n-first[i])<1e-6),{id,first});
 await page.keyboard.press('Control+Shift+z');await page.waitForFunction(({id,position})=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[0].position.every((n,i)=>Math.abs(n-position[i])<1e-6),{id,position:afterEdit.item.ptp.points[0].position});
 await panel.getByRole('button',{name:'Touch up from TCP'}).click();
 await page.waitForFunction(({id,second})=>{const p=window.__larpProject.getItems().find(i=>i.id===id).ptp.points[0].position;return p.every((n,i)=>Math.abs(n-second[i])<1e-6)},{id,second});
 await panel.getByLabel('PTP point name').fill('Approach');await panel.getByLabel('PTP speed (%)').fill('55');await panel.getByLabel('PTP dwell (s)').fill('0.2');
 await panel.getByRole('button',{name:'Move point down'}).click();
 await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[1].name==='Approach',id);
 // Native number inputs must accept a leading minus and retain sub-millimetre precision.
 const xInput=panel.getByLabel('PTP X',{exact:true});await xInput.click();await xInput.press('Control+a');await xInput.pressSequentially('-0.7654',{delay:20});
 assert.equal(await xInput.inputValue(),'-0.7654');await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).ptp.points[1].position[0]===-0.7654,id);
 await xInput.fill('100');await panel.getByRole('alert').getByText('Target is outside robot reach.').waitFor();
 await panel.getByLabel('PTP X',{exact:true}).fill(String(second[0]));
 await panel.getByLabel('Enable PTP program').check();
 const saved=await page.evaluate(()=>window.__larpProject.getText());assert.match(saved,/"ptp"/);assert.match(saved,/Approach/);
 // The teach pendant obeys the application's resize convention.
 const initial=await panel.boundingBox(),grip=panel.getByRole('separator',{name:'Resize window'});await grip.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');const enlarged=await panel.boundingBox();assert.ok(enlarged.width>initial.width&&enlarged.height>initial.height);
 await page.getByTitle('Play (Space)').first().click();
 await page.waitForFunction(id=>window.__larp.robots.get(id).cycles>=1,id,{timeout:30000});
 assert.equal(await page.evaluate(id=>window.__larp.robots.get(id).status!=='error',id),true);
 await page.getByTitle('Pause (Space)').first().click();
 await panel.getByRole('button',{name:'Close PTP teaching'}).click();assert.equal(await panel.count(),0);
 // Ctrl-double-click uses the separate viewport duplicate path; it must retain PTP data too.
 const base=await page.evaluate(async id=>{const T=await import('/node_modules/three/build/three.module.js');let group;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.robotJoint==='waist'&&o.userData.itemId===id)group=o});const p=group.localToWorld(new T.Vector3(0,.27,0));p.project(window.__larpRenderer.camera);const r=window.__larpRenderer.gl.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}},id);
 await page.keyboard.down('Control');await page.mouse.dblclick(base.x,base.y);await page.keyboard.up('Control');
 await page.waitForFunction(id=>window.__larpProject.getItems().some(i=>i.id!==id&&i.name==='Teaching arm copy'),id);
 const duplicate=await page.evaluate(id=>({source:window.__larpProject.getItems().find(i=>i.id===id).ptp,copy:window.__larpProject.getItems().find(i=>i.id!==id&&i.name==='Teaching arm copy').ptp}),id);assert.deepEqual(duplicate.copy,duplicate.source);
 // The real AI Factory inspector edits and builds an isolated PTP robot.
 const nodeId=await page.evaluate(async()=>{const {makeNode}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');const node=makeNode('part.robot',100,100,{ptpEnabled:true,ptpX:3,ptpZ:-2});replaceGraph({version:1,signalSchema:2,nodes:[node],links:[]});return node.id;});
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
 const dialog=page.getByRole('dialog',{name:'AI Factory'}),inspector=dialog.locator('.factory-studio-inspector');
 await dialog.locator(`[data-node="${nodeId}"] .cursor-grab`).click();
 await inspector.getByRole('button',{name:'Add PTP point'}).click();const nodeZ=inspector.getByLabel('Node PTP 1 Z');await nodeZ.click();await nodeZ.press('Control+a');await nodeZ.pressSequentially('-0.4',{delay:20});assert.equal(await nodeZ.inputValue(),'-0.4');await inspector.getByLabel('PTP speed (%) 1').fill('60');
 await dialog.getByText('Valid graph',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.ptp?.enabled&&i.position[0]===3));
 const built=await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.ptp?.enabled));assert.equal(built.ptp.points[0].position[2],-.4);assert.equal(built.ptp.points[0].speed,60);
 assert.deepEqual(errors,[]);
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mobileErrors=[];
 phone.on('pageerror',e=>mobileErrors.push(e.message));await phone.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await phone.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 await phone.getByRole('button',{name:'PTP',exact:true}).click();const mobilePanel=phone.getByRole('dialog',{name:'PTP teaching'});await mobilePanel.waitFor();
 await mobilePanel.getByRole('button',{name:'Teach current TCP'}).click();assert.equal(await mobilePanel.getByRole('button',{name:/Select PTP point 1/}).count(),1);
 const bounds=await mobilePanel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844,'phone teach window stays inside viewport');
 assert.equal(await mobilePanel.getByRole('separator',{name:'Resize window'}).count(),1);assert.deepEqual(mobileErrors,[]);await phone.close();
 console.log('PTP UI: real XYZ jogging and waypoint gizmos, teach/touch-up/order, reach feedback, resizing, save, playback, AI Factory and mobile PASS');
} finally {await browser.close();}
