import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
const url = process.env.TEST_URL || 'http://127.0.0.1:4173';
async function center(locator) { const r = await locator.boundingBox(); assert.ok(r, 'port must be visible'); return {x:r.x+r.width/2, y:r.y+r.height/2}; }
try {
  const page = await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  const ids=await page.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const source=makeItem('button',[-4,0,0],0,{name:'Drag source'}), robot=makeItem('robot',[0,0,0],0,{name:'Drag robot'}), feeder=makeItem('feeder',[4,0,0],0,{name:'Drag feeder'});window.__larpProject.setItems([source,robot,feeder]);return {source:source.id,robot:robot.id,feeder:feeder.id}});
  await page.getByRole('button',{name:'Edit signal connections'}).click();
  const out=page.getByRole('button',{name:'Signal output: Drag source'}), robot=page.getByRole('button',{name:'Signal input: Drag robot'}), feeder=page.getByRole('button',{name:'Signal input: Drag feeder'});
  async function drag(from,to) {
    const a=await center(from), b=await center(to);
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move((a.x+b.x)/2,(a.y+b.y)/2,{steps:4});
    await page.getByLabel('Signal wire preview').waitFor({state:'visible'});
    await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
  }
  const has=(target)=>page.evaluate(({source,target})=>{const i=window.__larp.items.find(x=>x.id===source);return !!(i.props.connectedTo===target||i.signalTargets?.includes(target))}, {source:ids.source,target});
  await drag(out,robot); await page.waitForFunction(({source,robot})=>window.__larp.items.find(i=>i.id===source)?.props.connectedTo===robot,ids);
  await drag(robot,feeder); await page.waitForFunction(({source,feeder})=>window.__larp.items.find(i=>i.id===source)?.props.connectedTo===feeder,ids);
  assert.equal(await has(ids.robot),false,'dragging connected IN onto another IN reroutes just that branch');
  await drag(out,robot); await page.waitForFunction(({source,robot})=>window.__larp.items.find(i=>i.id===source)?.signalTargets?.includes(robot),ids);
  const detach=await center(feeder);await page.mouse.move(detach.x,detach.y);await page.mouse.down();await page.mouse.move(detach.x+60,detach.y+80,{steps:8});await page.mouse.up();
  await page.waitForFunction(({source,robot,feeder})=>{const i=window.__larp.items.find(x=>x.id===source);return i.props.connectedTo===robot && !i.signalTargets?.includes(feeder)},ids);
  await page.keyboard.press('Control+z');
  await page.waitForFunction(({source,robot,feeder})=>{const i=window.__larp.items.find(x=>x.id===source);return i.props.connectedTo===feeder && i.signalTargets?.includes(robot)},ids);
  assert.deepEqual(errors,[]);
  await page.close();

  // Real touch events (not a synthetic click) exercise pointer capture and the
  // IN hit test while dragging from one HTML port to another.
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await phone.goto(url,{waitUntil:'networkidle',timeout:120000});
  const touch=await phone.evaluate(async()=>{const {makeItem}=await import('/src/data/library.ts');const a=makeItem('sensor',[-2,0,0],0,{name:'Touch drag source'}),b=makeItem('robot',[2,0,0],0,{name:'Touch drag robot'});window.__larpProject.setItems([a,b]);return {a:a.id,b:b.id}});
  await phone.getByRole('button',{name:'Edit signal connections'}).click();
  const a=await center(phone.getByRole('button',{name:'Signal output: Touch drag source'})), b=await center(phone.getByRole('button',{name:'Signal input: Touch drag robot'}));
  const cdp=await phone.context().newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:(a.x+b.x)/2,y:(a.y+b.y)/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(({a,b})=>window.__larp.items.find(i=>i.id===a)?.props.connectedTo===b,touch);
  await phone.close();
  console.log('signal drag: preview, reroute, branch disconnect, undo and touch PASS');
} finally {await browser.close();}
