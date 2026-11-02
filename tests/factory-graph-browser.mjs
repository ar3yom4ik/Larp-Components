import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => localStorage.setItem('larp-appearance', JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
 const ids=await page.evaluate(async()=>{const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');const f1=makeNode('part.feeder',30,40),f2=makeNode('part.feeder',30,210),a=makeNode('part.conveyor',240,40),b=makeNode('part.conveyor',240,210),m=makeNode('part.conveyor',480,110),r=makeNode('part.robot',730,110),p=makeNode('part.pallet',960,110),loose=makeNode('part.conveyor',30,430);let g={version:1,nodes:[f1,f2,a,b,m,r,p,loose],links:[]};for(const [x,y] of [[f1,a],[f2,b],[a,m],[b,m],[m,r],[r,p]]){const c=connect(g,{node:x.id,port:'out'},{node:y.id,port:'in'});if(!c.ok)throw Error(c.error);g=c.graph}replaceGraph(g);return {f1:f1.id,f2:f2.id,a:a.id,b:b.id,m:m.id,loose:loose.id};});
 await page.reload({waitUntil:'networkidle'});
 await page.evaluate(()=>window.__larp.setRunning(false));
 await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'AI Factory'});
 await dialog.getByText('Valid graph',{exact:true}).waitFor();
 const getGraph=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
 const node=dialog.locator(`[data-node="${ids.f1}"]`);const start=await node.boundingBox();assert.ok(start);
 await page.evaluate(()=>{window.__graphWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='larp-factory-component-graph-v1')window.__graphWrites++;return original.call(this,k,v)}});
 const before=(await getGraph()).nodes.find(n=>n.id===ids.f1);const status=await dialog.locator('.factory-studio-status').innerText();const preview=await dialog.locator('.factory-studio-preview').innerHTML();
 await page.mouse.move(start.x+45,start.y+12);await page.mouse.down();await page.mouse.move(start.x+125,start.y+72,{steps:30});
 assert.equal(await page.evaluate(()=>window.__graphWrites),0,'drag preview must not write or create history on every movement');
 const during=(await getGraph()).nodes.find(n=>n.id===ids.f1);assert.equal(during.x,before.x);assert.equal(during.y,before.y);
 await page.mouse.up();await page.waitForFunction(({id,x})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.find(n=>n.id===id).x===x,{id:ids.f1,x:before.x+Math.round(80/0.85)});
 assert.equal(await page.evaluate(()=>window.__graphWrites),1,'one final drag commit');
 assert.equal(await dialog.locator('.factory-studio-status').innerText(),status,'canvas positioning does not recompile the factory');
 assert.equal(await dialog.locator('.factory-studio-preview').innerHTML(),preview,'position-only edit keeps preview result and IDs stable');
 await page.keyboard.press('Control+z');await page.waitForFunction(({id,x})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.find(n=>n.id===id).x===x,{id:ids.f1,x:before.x});
 await page.keyboard.press('Control+y');await page.waitForFunction(({id,x})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.find(n=>n.id===id).x===x,{id:ids.f1,x:before.x+Math.round(80/0.85)});
 // Select the target conveyor and choose the alternate physical merge geometry.
 const merge=dialog.locator(`[data-node="${ids.m}"]`);await merge.locator('div').first().click();
 await merge.getByLabel('Merge layout').selectOption('side');
 assert.equal((await getGraph()).nodes.find(n=>n.id===ids.m).params.mergeStyle,'side');
 // Removing one thickened wire hit area must leave the other input intact.
 const g=await getGraph(), removed=g.links.find(l=>l.from.node===ids.b&&l.to.node===ids.m),remaining=g.links.find(l=>l.from.node===ids.a&&l.to.node===ids.m);assert.ok(removed&&remaining);
 const pt=await dialog.locator(`[data-link-id="${removed.id}"]`).evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()/2),m=path.getScreenCTM(),q=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:q.x,y:q.y}});
 await page.mouse.click(pt.x,pt.y);await page.waitForFunction(id=>!JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(l=>l.id===id),removed.id);
 assert.ok((await getGraph()).links.some(l=>l.id===remaining.id),'other input remains connected');
 // Reattach the second line with a genuine output-to-input gesture.
 const output=dialog.locator(`[data-node="${ids.b}"]`).getByRole('button',{name:'Conveyor Material out output'}), input=merge.getByRole('button',{name:'Conveyor Material in'});
 const o=await output.boundingBox(),i=await input.boundingBox();assert.ok(o&&i);
 await page.mouse.move(o.x+o.width/2,o.y+o.height/2);await page.mouse.down();await page.mouse.move(i.x+i.width/2,i.y+i.height/2,{steps:12});await page.mouse.up();
 await page.waitForFunction(({from,to})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(l=>l.from.node===from&&l.to.node===to),{from:ids.b,to:ids.m});
 assert.ok((await getGraph()).links.some(l=>l.id===remaining.id),'attaching another head preserves the first');
 // A loose conveyor can still be dropped onto an existing material wire.
 const pathPoint=await dialog.locator(`[data-link-id="${remaining.id}"]`).evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()/2),m=path.getScreenCTM(),q=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:q.x,y:q.y}});
 const loose=dialog.locator(`[data-node="${ids.loose}"]`),box=await loose.boundingBox();assert.ok(box);
 await page.mouse.move(box.x+40,box.y+12);await page.mouse.down();await page.mouse.move(pathPoint.x-20,pathPoint.y-15,{steps:18});await page.waitForTimeout(150);await page.mouse.up();
 await page.waitForFunction(({a,loose,m})=>{const l=JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links;return l.some(x=>x.from.node===a&&x.to.node===loose)&&l.some(x=>x.from.node===loose&&x.to.node===m)},ids);
 await page.keyboard.press('Control+z');await page.waitForFunction(id=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(l=>l.id===id),remaining.id);
 await dialog.getByText('Valid graph',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.props.mergeStyle==='side'));
 const scene=await page.evaluate(()=>window.__larpProject.getItems());assert.ok(scene.filter(i=>i.props.mergeTargetId).length>=2,'both merge connectors are built in the scene');
 assert.deepEqual(errors,[]);await page.close();console.log('factory graph: live drag preview, single commit, undo, stable compile, multiple inputs, wire insertion and side-entry build PASS');
} finally {await browser.close();}
