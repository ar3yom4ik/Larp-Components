import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { WebSocket } from 'ws';
import * as Y from 'yjs';

async function freePort() { const server=net.createServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const port=server.address().port; await new Promise(r=>server.close(r)); return port; }
const ports=await Promise.all([freePort(),freePort(),freePort()]);
const [hostPort, guestPort, discoveryPort]=ports;
function helper(port) { const child=spawn(process.execPath,['scripts/multiplayer/server.mjs','--port',String(port),'--discovery-port',String(discoveryPort)],{stdio:['ignore','pipe','pipe']}); let log=''; child.stdout.on('data',d=>log+=d); child.stderr.on('data',d=>log+=d); child.logs=()=>log; return child; }
const children=[helper(hostPort),helper(guestPort)];
const sockets=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn, label, timeout=12000) { const end=Date.now()+timeout; while(Date.now()<end) {const value=fn();if(value)return value;await sleep(40);} throw new Error(`Timed out: ${label}\n${children.map(c=>c.logs()).join('\n')}`); }
function connect(port) { return new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/multiplayer/socket`,{headers:{Origin:`http://127.0.0.1:${port}`}});ws.queue=[];ws.on('message',(data,binary)=>ws.queue.push(binary ? data : JSON.parse(data.toString())));ws.on('open',()=>{sockets.push(ws);resolve(ws)});ws.on('error',reject);}); }
const send=(ws,value)=>ws.send(JSON.stringify(value));
async function take(ws,type,pred=()=>true) { return waitFor(()=>{const index=ws.queue.findIndex(m=>!Buffer.isBuffer(m)&&m.type===type&&pred(m));if(index<0)return null;return ws.queue.splice(index,1)[0]},type); }
try {
  await waitFor(()=>children.every(c=>c.logs().includes('LAN discovery')),'helpers started');
  // A remote web page cannot silently operate a local helper via WebSocket.
  await new Promise(resolve => { const bad = new WebSocket(`ws://127.0.0.1:${hostPort}/multiplayer/socket`, {headers:{Origin:'https://evil.example'}}); bad.on('error',resolve); bad.on('open',()=>{bad.terminate();throw Error('cross-origin socket accepted');}); });
  const host=await connect(hostPort), guest=await connect(guestPort);
  await take(host,'ready'); await take(guest,'ready');
  send(host,{type:'host',nickname:'',joinable:true}); assert.match((await take(host,'error')).message,/nickname/i);
  send(host,{type:'host',nickname:'Alice',joinable:true}); const hosted=await take(host,'hosted'); assert.equal(hosted.owner,'Alice');
  const ownerDoc=new Y.Doc(); ownerDoc.getMap('items').set('one',{name:'test'}); host.send(Y.encodeStateAsUpdate(ownerDoc));
  send(guest,{type:'discover'});
  let listed=await take(guest,'sessions',m=>m.sessions.some(s=>s.nickname==='Alice')); const session=listed.sessions.find(s=>s.nickname==='Alice');
  send(guest,{type:'join',id:session.id,nickname:'Bob'}); await take(guest,'joining'); await take(guest,'pending');
  let request=await take(host,'request'); assert.equal(request.nickname,'Bob');
  send(host,{type:'approve',requestId:request.requestId,accept:false}); assert.match((await take(guest,'denied')).reason,/declined/i);
  await waitFor(()=>guest.queue.some(m=>!Buffer.isBuffer(m)&&m.type==='sessions'),'session list restored');
  send(guest,{type:'join',id:session.id,nickname:'Bob'}); await take(guest,'joining'); await take(guest,'pending'); request=await take(host,'request');
  send(host,{type:'approve',requestId:request.requestId,accept:true}); const joined=await take(guest,'joined'); assert.equal(joined.owner,'Alice');
  const payload=await waitFor(()=>{const i=guest.queue.findIndex(Buffer.isBuffer); return i<0?null:guest.queue.splice(i,1)[0]},'initial Yjs snapshot');
  const guestDoc=new Y.Doc(); Y.applyUpdate(guestDoc,payload); assert.deepEqual(guestDoc.getMap('items').get('one'),{name:'test'});
  const memberEvent=await take(host,'members',m=>m.members.length===2); assert.deepEqual(memberEvent.members.map(m=>m.nickname).sort(),['Alice','Bob']);
  guestDoc.getMap('items').set('two',{name:'guest edit'}); guest.send(Y.encodeStateAsUpdate(guestDoc));
  const update=await waitFor(()=>{const i=host.queue.findIndex(Buffer.isBuffer); return i<0?null:host.queue.splice(i,1)[0]},'guest edit reaches host'); Y.applyUpdate(ownerDoc,update); assert.deepEqual(ownerDoc.getMap('items').get('two'),{name:'guest edit'});
  send(guest,{type:'chat',text:'Hello host'}); assert.equal((await take(host,'chat')).message.sender,'Bob'); assert.equal((await take(guest,'chat')).message.text,'Hello host');
  send(guest,{type:'presence',pose:{position:[1,2,3],quaternion:[0,0,0,1]}}); assert.deepEqual((await take(host,'presence')).pose.position,[1,2,3]);
  send(guest,{type:'action',action:'reset'}); assert.equal((await take(host,'action')).action,'reset');
  send(guest,{type:'simulation',state:{time:999}}); await sleep(300); assert.ok(!host.queue.some(m=>m.type==='simulation'),'guests cannot forge simulation snapshots');
  send(host,{type:'simulation',state:{time:12}}); assert.equal((await take(guest,'simulation')).state.time,12);
  const bob=memberEvent.members.find(m=>m.nickname==='Bob'); send(host,{type:'kick',id:bob.id}); assert.match((await take(guest,'kicked')).reason,/removed/i);
  await take(host,'members',m=>m.members.length===1);
  send(host,{type:'joinable',value:false}); await take(host,'members',m=>m.joinable===false);
  send(host,{type:'leave'}); assert.match((await take(host,'ended')).reason,/ended/i);
  // Stopping the helper with a real guest sends an end notice and releases TCP.
  send(host,{type:'host',nickname:'Alice again',joinable:true});await take(host,'hosted');send(guest,{type:'discover'});
  listed=await take(guest,'sessions',m=>m.sessions.some(s=>s.nickname==='Alice again'));const session2=listed.sessions.find(s=>s.nickname==='Alice again');
  send(guest,{type:'join',id:session2.id,nickname:'Bob'});await take(guest,'joining');await take(guest,'pending');request=await take(host,'request');send(host,{type:'approve',requestId:request.requestId,accept:true});await take(guest,'joined');
  const stopped=new Promise(resolve=>children[0].once('exit',resolve));children[0].kill('SIGTERM');assert.match((await take(guest,'ended')).reason,/helper stopped|disconnected/i);await stopped;
  const replacement=net.createServer();await new Promise((resolve,reject)=>{replacement.once('error',reject);replacement.listen(hostPort,'0.0.0.0',resolve)});await new Promise(resolve=>replacement.close(resolve));
  console.log('LAN helper: real UDP discovery, nickname, deny/accept, CRDT sync, chat, camera, simulation authority, kick and active-session shutdown OK');
} finally { for(const ws of sockets) ws.terminate(); for(const child of children) if(child.exitCode===null&&child.signalCode===null) child.kill('SIGTERM'); await Promise.all(children.map(c=>new Promise(r=>{if(c.exitCode!==null||c.signalCode!==null)r();else c.once('exit',r)}))); }
