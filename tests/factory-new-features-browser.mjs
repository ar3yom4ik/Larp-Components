import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1700,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});await page.evaluate(()=>window.__larp.setRunning(false));
 await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'AI Factory'}),inspector=dialog.locator('.factory-studio-inspector');
 await dialog.getByRole('button',{name:'Add node',exact:true}).click();
 const search=dialog.getByLabel('Search parts'),palette=dialog.locator('.factory-studio-palette');
 await search.fill('color sensor');const entry=palette.getByRole('button',{name:'Color sensor',exact:true});
 const color=await entry.evaluate(el=>el.style.color);await entry.click();
 const sensor=dialog.locator('[data-node-type="part.color-sensor"]');assert.equal(await sensor.count(),1);
 const nodeColor=await sensor.getAttribute('data-node-color');
 const cssColor=await page.evaluate(hex=>{const e=document.createElement('span');e.style.color=hex;return e.style.color},nodeColor);
 assert.equal(color,cssColor,'palette entry uses the canvas node color');
 assert.equal(await sensor.locator('[data-input-port^="signal-in-"]').count(),0,'sensor has no signal input');
 await inspector.getByRole('button',{name:'Material 1',exact:true}).click();await inspector.locator('[data-material-option="product:apple"]').click();
 await inspector.getByRole('button',{name:'Material 2',exact:true}).click();await inspector.locator('[data-material-option="product:carton"]').click();
 await inspector.getByLabel('Output colour 2',{exact:true}).fill('#11aa44');
 assert.equal(await inspector.getByLabel('Material 3',{exact:true}).count(),1,'each selection adds another material/output');
 await dialog.getByRole('button',{name:'Fit all nodes'}).click();
 const belt=dialog.locator('[data-node-type="part.conveyor"]').first(),robot=dialog.locator('[data-node-type="part.robot"]').first();
 async function drag(from,to){const a=await from.boundingBox(),b=await to.boundingBox();assert.ok(a&&b);await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:18});await page.mouse.up()}
 await drag(belt.locator('[data-output-port="attach"]'),sensor.locator('[data-input-port="mount"]'));
 await drag(sensor.locator('[data-output-port="signal-out-2"]'),robot.locator('[data-input-port="signal-in-2"]'));
 // Configure a different workflow on robot input 2 through the real editor.
 await robot.locator('.cursor-grab').click();
 const targetSelect=inspector.getByLabel('Input destination 2');
 await targetSelect.waitFor();
 const palletId=await targetSelect.locator('option').evaluateAll(options=>options.find(option=>option.textContent.includes('Pallet'))?.value);
 assert.ok(palletId);await targetSelect.selectOption(palletId);
 await inspector.getByLabel('Input workflow 2').selectOption('palletize');
 // Add independent building nodes through the visible menu; their settings
 // compile into the same editable scene components as the catalog.
 for(const [query,name,type,material] of [['elevated platform','Elevated platform','platform','wood'],['industrial stairs','Industrial stairs','stairs','rubber'],['spline wall','Spline wall','wall','white']]){
   if(!await palette.isVisible())await dialog.getByRole('button',{name:'Add node',exact:true}).click();
   await search.fill(query);const option=palette.getByRole('button',{name,exact:true}),paint=await option.evaluate(el=>el.style.color);await option.click();
   const node=dialog.locator(`[data-node-type="part.${type}"]`);assert.equal(await node.count(),1);
   const actual=await node.getAttribute('data-node-color');assert.equal(paint,await page.evaluate(hex=>{const e=document.createElement('span');e.style.color=hex;return e.style.color},actual));
   await inspector.getByRole('button',{name:'Surface material'}).click();await inspector.locator(`[data-material-option="${material}"]`).click();
   if(type==='platform')await inspector.getByLabel('Height (m)').fill('4');
   if(type==='wall')await inspector.getByLabel('Height (m)').fill('3.5');
 }
 await dialog.getByText('Valid graph',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>window.__larpProject.getItems().some(i=>i.kind==='color-sensor'));
 const built=await page.evaluate(()=>window.__larpProject.getItems());
 const colorSensor=built.find(i=>i.kind==='color-sensor');assert.ok(colorSensor.props.mountedTo);assert.equal(colorSensor.signalChannels.find(c=>c.port===2).color,'#11aa44');assert.equal(colorSensor.signalChannels.find(c=>c.port===2).material,'#b89a6c');assert.ok(colorSensor.signalRoutes.some(r=>r.output===2&&r.input===2));
 const targetRobot=built.find(i=>i.id===colorSensor.signalRoutes.find(r=>r.output===2&&r.input===2).targetId);
 assert.equal(targetRobot.programs['2'].mode,'palletize');
 assert.equal(built.find(i=>i.id===targetRobot.programs['2'].targetId).kind,'crates','input 2 targets the selected pallet');
 assert.notEqual(targetRobot.programs['2'].targetId,targetRobot.program.targetId,'input 2 has an independent workflow');
 assert.equal(built.find(i=>i.kind==='platform').props.surfaceMaterial,'wood');assert.equal(built.find(i=>i.kind==='platform').props.height,4);assert.equal(built.find(i=>i.kind==='stairs').props.surfaceMaterial,'rubber');assert.equal(built.find(i=>i.kind==='wall').props.height,3.5);assert.equal(built.find(i=>i.kind==='wall').points.length,2);
 assert.deepEqual(errors,[]);console.log('factory new features: colored menu, source-only material sensor, numbered wires, input workflows and building nodes PASS');
}finally{await browser.close()}
