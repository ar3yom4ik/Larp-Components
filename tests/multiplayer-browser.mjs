import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

async function port() { const s=net.createServer(); await new Promise(r=>s.listen(0,'127.0.0.1',r)); const value=s.address().port; await new Promise(r=>s.close(r)); return value; }
const [helperA,helperB,viteA,viteB,udp]=await Promise.all([port(),port(),port(),port(),port()]);
const children=[];
function start(args,env={}) { const p=spawn(process.execPath,args,{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);p.logs=()=>log;children.push(p);return p; }
const ha=start(['scripts/multiplayer/server.mjs','--port',String(helperA),'--discovery-port',String(udp),'--html','__no_standalone_for_test__.html']),hb=start(['scripts/multiplayer/server.mjs','--port',String(helperB),'--discovery-port',String(udp),'--html','__no_standalone_for_test__.html']);
const va=start(['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port',String(viteA),'--strictPort'],{LARP_MULTIPLAYER_PORT:String(helperA)});
const vb=start(['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port',String(viteB),'--strictPort'],{LARP_MULTIPLAYER_PORT:String(helperB)});
async function wait(fn,label,timeout=60000) {const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error(`${label}: timeout\n${children.map(p=>p.logs()).join('\n')}`)}
let browser;
try {
 // Probe actual endpoints instead of parsing Vite's console output: CI may
 // insert ANSI colour sequences inside its "Local:" label.
 const ready=async (port,path='/')=>{try{return (await fetch(`http://127.0.0.1:${port}${path}`)).ok}catch{return false}};
 await wait(async()=>{const checks=await Promise.all([ready(helperA,'/multiplayer/health'),ready(helperB,'/multiplayer/health'),ready(viteA),ready(viteB)]);return checks.every(Boolean);},'servers ready');
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errors=[];
 const makePage=async url=>{const context=await browser.newContext({viewport:{width:1500,height:900}});await context.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{waitUntil:'networkidle',timeout:120000});return p;};
 const alice=await makePage(`http://127.0.0.1:${viteA}/`),bob=await makePage(`http://127.0.0.1:${viteB}/`);
 for(const page of [alice,bob]) {await page.getByRole('button',{name:'CONNECTIVITY',exact:true}).click();await page.getByRole('button',{name:'Multiplayer',exact:true}).click();await page.getByRole('dialog',{name:'Multiplayer'}).waitFor();}
 const a=alice.getByRole('dialog',{name:'Multiplayer'}),b=bob.getByRole('dialog',{name:'Multiplayer'});
 assert.equal(await a.getByRole('button',{name:'Host session'}).isDisabled(),true,'hosting requires a nickname');
 await a.getByLabel('Nickname').fill('Alice'); await a.getByRole('button',{name:'Host session'}).click();
 await a.getByText('You are the host').waitFor();
 await b.getByText('Alice',{exact:true}).waitFor({timeout:20000});
 assert.equal(await b.getByRole('button',{name:'Join',exact:true}).isDisabled(),true,'joining requires a nickname');
 await b.getByLabel('Nickname').fill('Bob'); await b.getByRole('button',{name:'Join',exact:true}).click();
 await a.getByText('wants to join your session.').waitFor();await a.getByRole('button',{name:'Deny'}).click();await b.getByRole('alert').filter({hasText:'declined'}).waitFor();
 await b.getByRole('button',{name:'Join',exact:true}).click();await a.getByText('wants to join your session.').waitFor();await a.getByRole('button',{name:'Accept'}).click();
 await b.getByText('Connected to host').waitFor();await a.getByText('Bob',{exact:true}).waitFor();
 await wait(async()=>await bob.evaluate(()=>window.__larp.networkGuest),'guest simulation authority');
 await wait(async()=>await alice.evaluate(()=>window.__larpProject.multiplayer.getState().players.some(p=>p.nickname==='Bob'&&p.pose)) && await bob.evaluate(()=>window.__larpProject.multiplayer.getState().players.some(p=>p.nickname==='Alice'&&p.pose)),'camera presence');
 await wait(async()=>await alice.evaluate(()=>window.__larpRemoteCameras?.().some(c=>c.nickname==='Bob')) && await bob.evaluate(()=>window.__larpRemoteCameras?.().some(c=>c.nickname==='Alice')),'3D camera avatars');
 assert.deepEqual(await alice.evaluate(()=>window.__larpRemoteCameras().map(c=>c.nickname)),['Bob']);
 assert.deepEqual(await bob.evaluate(()=>window.__larpRemoteCameras().map(c=>c.nickname)),['Alice']);
 const aliceViewBefore=await bob.evaluate(()=>window.__larpProject.multiplayer.getState().players.find(p=>p.nickname==='Alice').pose.position);
 await bob.evaluate(async()=>{(await import('/src/viewportCommands.ts')).sendViewportCommand({type:'view',preset:'top'});});
 await wait(async()=>{const pose=await alice.evaluate(()=>window.__larpProject.multiplayer.getState().players.find(p=>p.nickname==='Bob')?.pose?.position);return pose&&pose[1]>30;},'guest camera moved');
 const aliceViewAfter=await bob.evaluate(()=>window.__larpProject.multiplayer.getState().players.find(p=>p.nickname==='Alice').pose.position);
 assert.deepEqual(aliceViewAfter,aliceViewBefore,'another user camera movement does not move yours');
 await a.getByRole('button',{name:'Close',exact:true}).click();await b.getByRole('button',{name:'Close',exact:true}).click();
 // A real UI edit in Bob's scene is replicated to Alice's scene and inspector.
 await bob.getByRole('button',{name:'Push button',exact:true}).click();
 const buttonId=await bob.evaluate(()=>window.__larpProject.getItems().filter(i=>i.kind==='button').at(-1).id);
 await alice.waitForFunction(id=>window.__larpProject.getItems().some(i=>i.id===id),buttonId);
 const nameField=bob.locator('aside.app-properties input').first();await nameField.fill('Shared switch');
 await alice.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id)?.name==='Shared switch',buttonId);
 // Two clients changing different fields at once converge without whole-scene overwrites.
 await Promise.all([
   alice.evaluate(id=>{const app=window.__larpProject;app.multiplayer.beginEdit();app.setItems(app.getItems().map(i=>i.id===id?{...i,props:{...i.props,activeDuration:3}}:i));},buttonId),
   bob.evaluate(id=>{const app=window.__larpProject;app.multiplayer.beginEdit();app.setItems(app.getItems().map(i=>i.id===id?{...i,props:{...i.props,address:'S-42'}}:i));},buttonId),
 ]);
 for(const page of [alice,bob]) await page.waitForFunction(id=>{const p=window.__larpProject.getItems().find(i=>i.id===id)?.props;return p?.activeDuration===3&&p?.address==='S-42';},buttonId,{timeout:30000});
 // A local undo must not roll back a collaborator's intervening edit.
 await bob.evaluate(id=>{const app=window.__larpProject;app.multiplayer.beginEdit();app.setItems(app.getItems().map(i=>i.id===id?{...i,name:'Bob local edit'}:i));},buttonId);
 await alice.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id)?.name==='Bob local edit',buttonId);
 await alice.evaluate(id=>{const app=window.__larpProject;app.multiplayer.beginEdit();app.setItems(app.getItems().map(i=>i.id===id?{...i,props:{...i.props,activeDuration:7}}:i));},buttonId);
 await bob.waitForFunction(id=>window.__larpProject.getItems().find(i=>i.id===id)?.props.activeDuration===7,buttonId);
 await bob.evaluate(()=>window.__larpProject.multiplayer.undo());
 for(const page of [alice,bob]) await page.waitForFunction(id=>{const item=window.__larpProject.getItems().find(i=>i.id===id);return item?.name==='Shared switch'&&item.props.activeDuration===7;},buttonId,{timeout:30000});
 // Pressing a button on the guest is executed by the authoritative host.
 await bob.getByRole('button',{name:'Press button',exact:true}).click();
 await alice.waitForFunction(id=>window.__larp.signalState.get(id)===true,buttonId);
 await bob.waitForFunction(id=>window.__larp.signalState.get(id)===true,buttonId);
 // The guest can pause and resume the one shared simulation.
 await bob.getByRole('button',{name:'Pause',exact:true}).first().click();
 for(const page of [alice,bob]) await page.waitForFunction(()=>!window.__larp.running);
 const times=await Promise.all([alice.evaluate(()=>window.__larp.time),bob.evaluate(()=>window.__larp.time)]);assert.ok(Math.abs(times[0]-times[1])<.5,`shared timeline ${times}`);
 await bob.getByRole('button',{name:'Play',exact:true}).first().click();for(const page of [alice,bob]) await page.waitForFunction(()=>window.__larp.running);
 for(const page of [alice,bob]) await page.getByRole('button',{name:'Chat',exact:true}).last().click();
 await bob.getByLabel('Chat message',{exact:true}).fill('Hello Alice');await bob.getByRole('button',{name:'Send',exact:true}).click();
 await alice.getByLabel('Chat messages').getByText('Hello Alice').waitFor();
 // The host may remove a guest without terminating the host session.
 await alice.getByRole('button',{name:'Multiplayer',exact:true}).click();await a.getByRole('button',{name:'Kick',exact:true}).click();
 await wait(async()=>await bob.evaluate(()=>window.__larpProject.multiplayer.getState().status==='idle'),'guest kicked');
 assert.equal(await alice.evaluate(()=>window.__larpProject.multiplayer.getState().status),'host');
 assert.equal(await bob.evaluate(()=>window.__larp.networkGuest),false);
 assert.deepEqual(errors,[]);
 console.log('multiplayer UI: discovery, approval/denial, shared edits, simulation, camera avatars, chat and kick PASS');
} finally {if(browser)await browser.close();for(const p of children)p.kill('SIGTERM');await Promise.all(children.map(p=>new Promise(r=>{if(p.exitCode!==null)r();else p.once('exit',r);})));}
