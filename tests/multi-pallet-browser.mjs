import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1700,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 const ids=await page.evaluate(async()=>{
   const {defaultComponentGraph}=await import('/src/gen/graph/componentCompile.ts'),{makeNode}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
   const graph=defaultComponentGraph(),p=graph.nodes.find(n=>n.type==='part.pallet'),link=graph.links.find(l=>l.to.node===p.id&&l.to.port==='in'),r=graph.nodes.find(n=>n.id===link.from.node),second=makeNode('part.pallet',p.x,p.y+260);
   graph.nodes.push(second);replaceGraph(graph);return {robot:r.id,first:p.id,second:second.id};
 });
 await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.__larp.setRunning(false));
 await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'AI Factory'});
 await dialog.getByRole('button',{name:'Fit all nodes'}).click();
 const out=dialog.locator(`[data-node="${ids.robot}"] [data-output-port="out"]`),input=dialog.locator(`[data-node="${ids.second}"] [data-input-port="in"]`);
 const a=await out.boundingBox(),b=await input.boundingBox();assert.ok(a&&b);
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
 await page.waitForFunction(({robot,second})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(l=>l.from.node===robot&&l.to.node===second),ids);
 const graph=await page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
 assert.ok(graph.links.some(l=>l.from.node===ids.robot&&l.to.node===ids.first),'adding a second destination preserves the first link');
 await dialog.getByText('Valid graph',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.program?.targetIds?.length===2));
 const robot=await page.evaluate(()=>window.__larpProject.getItems().find(i=>i.program?.targetIds?.length===2));
 const pallets=await page.evaluate(()=>window.__larpProject.getItems().filter(i=>i.kind==='crates'));
 assert.equal(pallets.length,2);assert.equal(new Set(robot.program.targetIds).size,2);
 // The ordinary visual task editor can remove and re-add the second target.
 await page.getByRole('button',{name:'Program',exact:true}).last().click();
 await page.locator('.program-robots').getByRole('button',{name:robot.name,exact:true}).click();
 const second=pallets.find(p=>p.id===robot.program.targetIds[1]);
 const checkbox=page.getByRole('checkbox',{name:`Additional pallet: ${second.name}`});await checkbox.waitFor();assert.equal(await checkbox.isChecked(),true);
 await checkbox.uncheck();await page.getByRole('button',{name:'Link task',exact:true}).click();
 await page.waitForFunction(id=>!window.__larpProject.getItems().find(i=>i.id===id).program.targetIds,robot.id);
 await checkbox.check();await page.getByRole('button',{name:'Link task',exact:true}).click();
 await page.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id).program.targetIds?.length===2,robot.id);
 assert.deepEqual(errors,[]);console.log('multi-pallet UI: graph fan-out and visual-task target editing PASS');
} finally {await browser.close();}
