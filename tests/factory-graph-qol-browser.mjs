import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
try {
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  const factoryButton=page.getByRole('button',{name:'AI Factory',exact:true}).first();
  await factoryButton.hover();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('[data-button-tooltip]').count(),0,'button name waits before appearing');
  await page.locator('[data-button-tooltip]').waitFor({state:'visible',timeout:3000});
  assert.match(await page.locator('[data-button-tooltip]').innerText(),/AI Factory/);
  await page.mouse.move(5,5);
  await page.locator('[data-button-tooltip]').waitFor({state:'detached'});

  const ids=await page.evaluate(async()=>{
    const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
    const f1=makeNode('part.feeder',40,40),f2=makeNode('part.feeder',40,350);
    const a=makeNode('part.conveyor',310,40),b=makeNode('part.conveyor',310,350);
    const m=makeNode('part.conveyor',600,120),r=makeNode('part.robot',860,120),p=makeNode('part.pallet',1120,120);
    let graph={version:1,nodes:[f1,f2,a,b,m,r,p],links:[]};
    for(const [from,to] of [[f1,a],[f2,b],[a,m],[b,m],[m,r],[r,p]]) {const result=connect(graph,{node:from.id,port:'out'},{node:to.id,port:'in'});if(!result.ok)throw Error(result.error);graph=result.graph;}
    replaceGraph(graph);
    return {f1:f1.id,f2:f2.id,a:a.id,b:b.id,m:m.id,r:r.id,wire1:graph.links.find(link=>link.from.node===f1.id).id,wire2:graph.links.find(link=>link.from.node===a.id).id};
  });
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'AI Factory'}),canvas=dialog.locator('[data-graph-canvas]');
  await dialog.getByText('Valid graph',{exact:true}).waitFor();
  const fitButton=dialog.getByRole('button',{name:'Fit all nodes'});
  await fitButton.hover(); await page.locator('[data-button-tooltip]').waitFor({state:'visible',timeout:3000});
  assert.equal(await page.locator('[data-button-tooltip]').innerText(),'Fit all nodes');
  const fitBounds=await fitButton.boundingBox(), tooltipBounds=await page.locator('[data-button-tooltip]').boundingBox(); assert.ok(fitBounds&&tooltipBounds);
  assert.ok(tooltipBounds.x+tooltipBounds.width<=1600&&tooltipBounds.x+tooltipBounds.width>=fitBounds.x-30,'tooltip flips next to a button near the right edge');
  const getGraph=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
  const f1=dialog.locator(`[data-node="${ids.f1}"]`),a=dialog.locator(`[data-node="${ids.a}"]`);
  assert.notEqual(await f1.getAttribute('data-node-color'),await a.getAttribute('data-node-color'),'node types have distinct colours');

  await f1.getByRole('button',{name:'Collapse'}).click();
  assert.equal(await f1.getByLabel('Product').count(),0,'collapsed parameters are hidden');
  const out=f1.getByRole('button',{name:'Feeder Material out output'});
  await out.waitFor({state:'visible'});
  const anchor=await dialog.locator(`[data-link-id="${ids.wire1}"]`).evaluate(path=>{
    const p=path.getPointAtLength(0),matrix=path.getScreenCTM(),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);
    return {x:q.x,y:q.y};
  });
  const dot=await out.boundingBox(); assert.ok(dot);
  assert.ok(Math.hypot(anchor.x-(dot.x+dot.width/2),anchor.y-(dot.y+dot.height/2))<2,'wire still touches collapsed port');
  await a.getByRole('button',{name:'Collapse'}).click();
  const input=a.getByRole('button',{name:'Conveyor Material in'}), inputDot=await input.boundingBox(); assert.ok(inputDot);
  const end=await dialog.locator(`[data-link-id="${ids.wire1}"]`).evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()),q=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());return {x:q.x,y:q.y}});
  assert.ok(Math.hypot(end.x-(inputDot.x+inputDot.width/2),end.y-(inputDot.y+inputDot.height/2))<2,'wire still touches collapsed input');
  await a.getByRole('button',{name:'Expand'}).click();

  // Box-select a connected feeder and conveyor, without touching the second row.
  const fb=await f1.boundingBox(),ab=await a.boundingBox(),cb=await canvas.boundingBox(); assert.ok(fb&&ab&&cb);
  await page.mouse.move(fb.x-8,fb.y-8); await page.mouse.down();
  await page.mouse.move(ab.x+ab.width+6,ab.y+ab.height+6,{steps:15}); await page.mouse.up();
  await dialog.locator('[data-multi-selection]').waitFor();
  assert.equal(await dialog.locator('[data-node][data-selected="true"]').count(),2);
  const beforeMulti=(await getGraph()).nodes.filter(node=>[ids.f1,ids.a].includes(node.id));
  const dragBox=await f1.boundingBox(); assert.ok(dragBox);
  await page.mouse.move(dragBox.x+30,dragBox.y+10); await page.mouse.down();
  await page.mouse.move(dragBox.x+64,dragBox.y+27,{steps:12}); await page.mouse.up();
  let moved=await getGraph();
  for(const old of beforeMulti) { const current=moved.nodes.find(node=>node.id===old.id); assert.equal(current.x-old.x,40); assert.equal(current.y-old.y,20); }
  await page.keyboard.press('Control+z');
  await page.waitForFunction(({id,x})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.find(node=>node.id===id).x===x,{id:beforeMulti[0].id,x:beforeMulti[0].x});
  await page.keyboard.press('Control+y');
  await page.waitForFunction(({id,x})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.find(node=>node.id===id).x===x,{id:beforeMulti[0].id,x:beforeMulti[0].x+40});
  await f1.locator('div').first().click({button:'right'});
  await dialog.getByRole('menuitem',{name:'Rearrange nodes'}).click();
  moved=await getGraph();
  assert.ok(moved.nodes.find(node=>node.id===ids.a).x>=moved.nodes.find(node=>node.id===ids.f1).x+256);
  await f1.locator('div').first().click({button:'right'});
  await dialog.getByRole('menuitem',{name:'Group selected nodes'}).click();
  const groupName=dialog.getByLabel('Group name'),groupColor=dialog.getByLabel('Group color');
  await groupName.fill('Receiving'); await groupColor.fill('#6a9bdb');
  let graph=await getGraph();
  const group=graph.groups[0]; assert.equal(group.name,'Receiving'); assert.equal(group.color,'#6a9bdb');
  assert.deepEqual(new Set(group.nodeIds),new Set([ids.f1,ids.a]));

  // Moving the backing frame moves both nodes in one edit.
  const frame=dialog.locator(`[data-group="${group.id}"]`),header=frame.locator('[data-group-header]'),hb=await header.boundingBox(); assert.ok(hb);
  const before=graph.nodes.filter(node=>group.nodeIds.includes(node.id));
  await page.mouse.move(hb.x+20,hb.y+12); await page.mouse.down(); await page.mouse.move(hb.x+80,hb.y+47,{steps:15}); await page.mouse.up();
  graph=await getGraph();
  for(const old of before) {
    const now=graph.nodes.find(node=>node.id===old.id);
    assert.equal(now.x-old.x,Math.round(60/.85)); assert.equal(now.y-old.y,Math.round(35/.85));
  }
  await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
  graph=await getGraph();
  assert.equal(graph.groups.length,2,'copy/paste duplicates frame');
  const copy=graph.groups.find(item=>item.id!==group.id); assert.equal(copy.name,'Receiving'); assert.equal(copy.color,'#6a9bdb');
  assert.equal(copy.nodeIds.length,2);
  assert.ok(graph.links.some(link=>copy.nodeIds.includes(link.from.node)&&copy.nodeIds.includes(link.to.node)),'internal wire copied');
  assert.equal(graph.links.filter(link=>copy.nodeIds.includes(link.from.node)||copy.nodeIds.includes(link.to.node)).length,1,'external wires are not copied');

  await page.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2); await page.mouse.wheel(0,2800);
  await page.waitForFunction(()=>Number(document.querySelector('[data-graph-canvas]').dataset.zoom)<.1);
  assert.equal(await frame.getAttribute('data-group-overview'),'true');
  await page.waitForFunction(id=>Number(getComputedStyle(document.querySelector(`[data-node="${id}"]`)).opacity)<0.15,ids.f1);
  assert.ok(Number(await f1.evaluate(element=>getComputedStyle(element).opacity))<0.15,'group members fade at overview scale');
  const rect=await frame.boundingBox(); assert.ok(rect);
  const proxy=await dialog.locator(`[data-link-id="${ids.wire2}"]`).evaluate(path=>{
    const p=path.getPointAtLength(0),matrix=path.getScreenCTM(),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);
    return {x:q.x,y:q.y};
  });
  assert.ok(Math.abs(proxy.x-(rect.x+rect.width))<3,'external wire is attached to overview frame');
  await dialog.getByRole('button',{name:'Fit all nodes'}).click();
  assert.ok(Number(await canvas.getAttribute('data-zoom'))>.1,'fit restores readable zoom');
  await page.reload({waitUntil:'networkidle'}); await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
  await page.getByRole('dialog',{name:'AI Factory'}).locator(`[data-group="${group.id}"]`).waitFor();
  graph=await getGraph(); assert.equal(graph.groups.length,2); assert.equal(graph.groups[0].name,'Receiving');

  // Select multiple source nodes, then make one gesture to a conveyor input.
  const bulk=await page.evaluate(async()=>{
    const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
    const f1=makeNode('part.feeder',40,40),f2=makeNode('part.feeder',40,270),belt=makeNode('part.conveyor',400,140),r=makeNode('part.robot',680,140),p=makeNode('part.pallet',960,140),r2=makeNode('part.robot',680,360),p2=makeNode('part.pallet',960,360);
    let graph={version:1,nodes:[f1,f2,belt,r,p,r2,p2],links:[]};
    for(const [from,to] of [[belt,r],[r,p],[r2,p2]]) graph=connect(graph,{node:from.id,port:'out'},{node:to.id,port:'in'}).graph;
    replaceGraph(graph);return {f1:f1.id,f2:f2.id,belt:belt.id,r2:r2.id};
  });
  await page.reload({waitUntil:'networkidle'}); await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
  const studio=page.getByRole('dialog',{name:'AI Factory'}),first=studio.locator(`[data-node="${bulk.f1}"]`),second=studio.locator(`[data-node="${bulk.f2}"]`),belt=studio.locator(`[data-node="${bulk.belt}"]`);
  await first.locator('div').first().click(); await second.locator('div').first().click({modifiers:['Shift']});
  assert.equal(await studio.locator('[data-node][data-selected="true"]').count(),2);
  const source=await first.getByRole('button',{name:'Feeder Material out output'}).boundingBox();
  const target=await belt.getByRole('button',{name:'Conveyor Material in'}).boundingBox(); assert.ok(source&&target);
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:15});await page.mouse.up();
  await page.waitForFunction(({f1,f2,belt})=>{const links=JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links;return [f1,f2].every(id=>links.some(link=>link.from.node===id&&link.to.node===belt));},bulk);
  const outputDot=await belt.getByRole('button',{name:'Conveyor Material out output'}).boundingBox();
  const robot2=studio.locator(`[data-node="${bulk.r2}"]`),inputDot2=await robot2.getByRole('button',{name:'Robot Material in'}).boundingBox(); assert.ok(outputDot&&inputDot2);
  await page.mouse.move(outputDot.x+outputDot.width/2,outputDot.y+outputDot.height/2);await page.mouse.down();await page.mouse.move(inputDot2.x+inputDot2.width/2,inputDot2.y+inputDot2.height/2,{steps:15});await page.mouse.up();
  await studio.getByText('Valid graph',{exact:true}).waitFor();
  await studio.getByRole('button',{name:'Build factory',exact:true}).click();
  await page.waitForFunction(()=>window.__larpProject.getItems().filter(item=>item.props.sharedBeltId).length===2);
  const scene=await page.evaluate(()=>window.__larpProject.getItems());
  const workers=scene.filter(item=>item.props.sharedBeltId);
  assert.equal(new Set(workers.map(item=>item.program.sourceId)).size,1,'both robots share the built conveyor');
  assert.equal(scene.filter(item=>item.props.mergeTargetId).length,2,'direct feeders produce physical inlets');
  assert.deepEqual(errors,[]);
  console.log('factory graph QoL: delayed tooltip, collapsed anchors, colours, box/group move/copy/save, overview zoom, fit and bulk wiring PASS');
  await page.close();
} finally { await browser.close(); }
