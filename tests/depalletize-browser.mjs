import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1700,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 const ids=await page.evaluate(async()=>{
   const {makeItem}=await import('/src/data/library.ts');
   const source=makeItem('crates',[-.9,0,0],0,{name:'Stock',props:{cols:2,rows:1,layers:1,product:'carton'}}),
     target=makeItem('crates',[-.9,0,2.9],0,{name:'Output',props:{cols:2,rows:1,layers:1,retainFull:true}}),
     sensor=makeItem('color-sensor',[-1,0,1.9],0,{name:'Inspector'}),robot=makeItem('robot',[.3,0,1.45],0,{name:'Sorter'});
   window.__larpProject.setItems([source,target,sensor,robot]);window.__larpProject.select(source.id);window.__larp.setRunning(false);
   return {source:source.id,target:target.id,sensor:sensor.id,robot:robot.id};
 });
 const inspector=page.locator('aside.app-properties');
 await inspector.getByLabel('Prefill pallet').check();
 await inspector.getByRole('button',{name:'Add fill product'}).click();await inspector.getByPlaceholder('Search name or tag...').fill('apple');await inspector.getByRole('option',{name:/Apple/}).click();
 await page.waitForFunction(id=>{const p=window.__larpProject.getItems().find(i=>i.id===id).props;return p.prefill && JSON.parse(p.fillProducts).includes('apple');},ids.source);
 await page.evaluate(()=>window.__larp.reset());
 await page.waitForFunction(()=>new Set(window.__larp.boxes.map(b=>b.productId)).size===2);
 await page.evaluate(id=>window.__larpProject.select(id),ids.robot);
 await page.getByRole('button',{name:'Program',exact:true}).last().click();
 await page.locator('.program-robots').getByRole('button',{name:'Sorter',exact:true}).click();
 await page.getByLabel('Source',{exact:true}).selectOption(ids.source);
 await page.getByLabel('Destination',{exact:true}).selectOption(ids.target);
 await page.getByLabel('Inspect with color sensor (optional)').selectOption(ids.sensor);
 await page.getByRole('button',{name:'Link task',exact:true}).click();
 await page.waitForFunction(ids=>{const p=window.__larpProject.getItems().find(i=>i.id===ids.robot)?.program;return p?.sourceKind==='pallet'&&p.sourceId===ids.source&&p.inspectSensorId===ids.sensor;},ids);
 // Edit the same settings in an actual AI Factory node and build its graph.
 const graphIds=await page.evaluate(async()=>{
   const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
   const src=makeNode('part.pallet',30,40,{rows:1,layers:1}),robot=makeNode('part.robot',350,40,{detection:'none'}),out=makeNode('part.pallet',690,40,{cols:2,rows:1,layers:1}),sensor=makeNode('part.color-sensor',350,310,{mountedTo:'none'});
   let graph={version:1,signalSchema:2,nodes:[src,robot,out,sensor],links:[]};for(const [x,y] of [[src,robot],[robot,out]]){const result=connect(graph,{node:x.id,port:'out'},{node:y.id,port:'in'});if(!result.ok)throw Error(result.error);graph=result.graph;}replaceGraph(graph);return {src:src.id,robot:robot.id,sensor:sensor.id};
 });
 await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.__larp.setRunning(false));
 await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'AI Factory'}),nodeInspector=dialog.locator('.factory-studio-inspector');
 await dialog.getByRole('button',{name:'Fit all nodes'}).click();await dialog.locator(`[data-node="${graphIds.src}"] .cursor-grab`).click();
 await nodeInspector.getByLabel('Prefill pallet').check();await nodeInspector.getByLabel('Columns',{exact:true}).fill('11');
 await nodeInspector.getByRole('button',{name:'Add fill product'}).click();await nodeInspector.getByPlaceholder('Search name or tag...').fill('apple');await nodeInspector.getByRole('option',{name:/Apple/}).click();
 await dialog.locator(`[data-node="${graphIds.robot}"] .cursor-grab`).click();await nodeInspector.getByLabel('Inspect color with sensor').selectOption(graphIds.sensor);
 await dialog.getByText('Valid graph',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.program?.sourceKind==='pallet'));
 const built=await page.evaluate(()=>({items:window.__larpProject.getItems(),boxes:window.__larp.boxes}));
 const robot=built.items.find(i=>i.program?.sourceKind==='pallet'),stock=built.items.find(i=>i.id===robot.program.sourceId);
 assert.equal(stock.props.cols,11);assert.equal(stock.props.prefill,true);assert.ok(JSON.parse(stock.props.fillProducts).includes('apple'));
 assert.equal(built.items.find(i=>i.id===robot.program.inspectSensorId)?.kind,'color-sensor');assert.equal(built.boxes.length,11);
 assert.deepEqual(errors,[]);console.log('depalletizing UI: prefill, mixed picker, task binding, sensor and AI Factory pallet source PASS');
} finally {await browser.close();}
