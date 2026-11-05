import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {pathToFileURL} from 'node:url';
import {unzipSync} from 'fflate';
import {chromium} from 'playwright';
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const [aPort,bPort,udp]=await Promise.all([port(),port(),port()]);
const temp=await mkdtemp(path.join(tmpdir(),'larp-lan-package-'));
const files=unzipSync(await readFile('dist/Larp_Multiplayer.zip'));
for(const name of ['Larp_Multiplayer.cjs','Larp_Factory_V3.html','Larp_Multiplayer.bat','Larp_Multiplayer.sh','README.txt','THIRD_PARTY_LICENSES/npm/yjs@13.6.33/LICENSE']) assert.ok(files[name],`${name} included`);
const batch=new TextDecoder().decode(files['Larp_Multiplayer.bat']);
assert.ok(batch.includes('\r\n')&&!/(?<!\r)\n/.test(batch),'Windows launcher uses CRLF');
for(const name of ['Larp_Multiplayer.cjs','Larp_Factory_V3.html']) await writeFile(path.join(temp,name),files[name]);
const children=[];
function start(p){const c=spawn(process.execPath,[path.join(temp,'Larp_Multiplayer.cjs'),'--port',String(p),'--discovery-port',String(udp)],{cwd:temp,stdio:['ignore','pipe','pipe']});let log='';c.stdout.on('data',d=>log+=d);c.stderr.on('data',d=>log+=d);c.logs=()=>log;children.push(c);return c;}
const ca=start(aPort),cb=start(bPort);let browser;
async function wait(fn,label){const end=Date.now()+45000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error(`${label}: timeout\n${children.map(c=>c.logs()).join('\n')}`);}
try{
 await wait(()=>ca.logs().includes('LAN discovery')&&cb.logs().includes('LAN discovery'),'packaged helpers started');
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const errors=[];
 const make=async url=>{const ctx=await browser.newContext({viewport:{width:1400,height:900}});await ctx.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{waitUntil:'load',timeout:120000});await p.locator('.larp-app').waitFor({timeout:90000});return p;};
 const local=await make(pathToFileURL(path.join(temp,'Larp_Factory_V3.html')).href);
 await local.getByRole('button',{name:'CONNECTIVITY',exact:true}).click();await local.getByRole('button',{name:'Multiplayer',exact:true}).click();
 await local.getByRole('alert').filter({hasText:'Open the app through the LAN helper'}).waitFor();await local.close();
 const host=await make(`http://127.0.0.1:${aPort}/`),guest=await make(`http://127.0.0.1:${bPort}/`);
 for(const p of [host,guest]){await p.getByRole('button',{name:'CONNECTIVITY',exact:true}).click();await p.getByRole('button',{name:'Multiplayer',exact:true}).click();}
 const hd=host.getByRole('dialog',{name:'Multiplayer'}),gd=guest.getByRole('dialog',{name:'Multiplayer'});
 await hd.getByLabel('Nickname').fill('Packaged host');await hd.getByRole('button',{name:'Host session'}).click();await hd.getByText('You are the host').waitFor();
 await gd.getByText('Packaged host',{exact:true}).waitFor({timeout:20000});await gd.getByLabel('Nickname').fill('Packaged guest');await gd.getByRole('button',{name:'Join',exact:true}).click();
 await hd.getByText('wants to join your session.').waitFor();await hd.getByRole('button',{name:'Accept'}).click();await gd.getByText('Connected to host').waitFor();
 await hd.getByRole('button',{name:'Close',exact:true}).click();await gd.getByRole('button',{name:'Close',exact:true}).click();
 const before=await host.evaluate(()=>window.__larp.items.filter(i=>i.kind==='button').length);
 await guest.getByRole('button',{name:'Push button',exact:true}).click();await host.waitForFunction(n=>window.__larp.items.filter(i=>i.kind==='button').length>n,before);
 for(const p of [host,guest]) await p.getByRole('button',{name:'Chat',exact:true}).last().click();
 await guest.getByLabel('Chat message',{exact:true}).fill('Packaged chat');await guest.getByRole('button',{name:'Send',exact:true}).click();await host.getByLabel('Chat messages').getByText('Packaged chat').waitFor();
 assert.deepEqual(errors,[]);console.log('packaged LAN ZIP: real helpers, standalone app, discovery, approval, shared scene and chat PASS');
}finally{if(browser)await browser.close();for(const c of children)c.kill('SIGTERM');await Promise.all(children.map(c=>new Promise(r=>{if(c.exitCode!==null)r();else c.once('exit',r);})));await rm(temp,{recursive:true,force:true});}
