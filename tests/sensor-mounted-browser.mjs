import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 const ids=await page.evaluate(async()=>{
   const {makeItem}=await import('/src/data/library.ts');
   const belt=makeItem('conveyor',[0,3,0],0,{name:'Falling belt',points:[[-2,0],[2,0]],props:{physicsMode:'dynamic',physicsMass:20,width:1,active:false}});
   const feeder=makeItem('feeder',[3,0,2],0,{name:'Receiving feeder'});
   const sensor=makeItem('sensor',[0,0,0],0,{name:'Mounted detector',props:{mountedTo:belt.id,mountPosition:.5,radius:.7,connectedTo:feeder.id}});
   window.__larpProject.setItems([belt,sensor,feeder]);window.__larp.setRunning(true);return {belt:belt.id,sensor:sensor.id,feeder:feeder.id};
 });
 await page.waitForFunction(({belt})=>window.__larp.getPhysicsPose(belt)?.position[1]<2.5,ids,{timeout:30000});
 await page.getByRole('button',{name:'Edit signal connections'}).click();
 await page.waitForFunction(({sensor,feeder})=>{let wire,port;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===sensor&&o.userData.targetId===feeder)wire=o;if(o.userData?.signalPortFor===sensor)port=o});return !!(wire&&port&&window.__larpRenderer.scene.getObjectByName(`proximity-radius-${sensor}`));},ids,{timeout:30000});
 await page.waitForTimeout(2000);
 const result=await page.evaluate(({sensor,feeder})=>{
   const live=window.__larp.getLiveItem(sensor);let wire,port;window.__larpRenderer.scene.traverse(o=>{if(o.userData?.signalWire&&o.userData.sourceId===sensor&&o.userData.targetId===feeder)wire=o;if(o.userData?.signalPortFor===sensor)port=o});
   const ring=window.__larpRenderer.scene.getObjectByName(`proximity-radius-${sensor}`),endpoint=wire.children.find(o=>o.geometry?.type==='SphereGeometry');
   return {live:live.position,ring:ring.position.toArray(),port:port.position.toArray(),endpoint:endpoint.position.toArray()};
 },ids);
 assert.ok(Math.abs(result.ring[1]-result.live[1]-.04)<.1,JSON.stringify(result));
 assert.ok(Math.abs(result.port[1]-result.live[1]-.55)<.1,JSON.stringify(result));
 assert.ok(Math.abs(result.endpoint[1]-result.live[1]-.15)<.1,JSON.stringify(result));
 assert.deepEqual(errors,[]);console.log('mounted sensor: moving belt, signal wire, port and proximity radius follow live pose OK');
}finally{await browser.close()}
