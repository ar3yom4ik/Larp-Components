import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import dgram from 'node:dgram';
import http from 'node:http';
import { WebSocket } from 'ws';

const handles = new Set();
const listen = server => new Promise((resolve,reject)=>{server.once('error',reject); server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});
async function freePort(){const server=net.createServer();const port=await listen(server);await new Promise(r=>server.close(r));return port;}
async function freeUdpPort(){const s=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{s.once('error',reject);s.bind(0,'127.0.0.1',resolve)});const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function bindTcp(port){const s=net.createServer();handles.add(s);s.once('close',()=>handles.delete(s));await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(port,'0.0.0.0',resolve)});return s;}
async function bindUdp(port){const s=dgram.createSocket('udp4');handles.add(s);s.once('close',()=>handles.delete(s));await new Promise((resolve,reject)=>{s.once('error',reject);s.bind(port,'0.0.0.0',resolve)});return s;}
async function exit(child){return new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve({code:child.exitCode,signal:child.signalCode});else child.once('exit',(code,signal)=>resolve({code,signal}));});}
async function ready(port,child){for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(`helper exited early: ${child.logs()}`);try{if((await fetch(`http://127.0.0.1:${port}/multiplayer/health`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error(`helper did not start: ${child.logs()}`);}
function helper(port,udp){const c=spawn(process.execPath,[process.env.LARP_HELPER_ENTRY || 'scripts/multiplayer/server.mjs','--port',String(port),'--discovery-port',String(udp)],{stdio:['ignore','pipe','pipe']});let log='';c.stdout.on('data',d=>log+=d);c.stderr.on('data',d=>log+=d);c.logs=()=>log;return c;}
const [port,udp,occupied]=await Promise.all([freePort(),freeUdpPort(),freePort()]);
let child;let agent;
try {
 for(const signal of process.platform === 'win32' ? ['SIGTERM'] : ['SIGTERM','SIGINT','SIGHUP']) {
  child=helper(port,udp);await ready(port,child);
  const ws=new WebSocket(`ws://127.0.0.1:${port}/multiplayer/socket`,{headers:{Origin:`http://127.0.0.1:${port}`}});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  ws.send(JSON.stringify({type:'host',nickname:'Port owner',joinable:true}));
  await new Promise((resolve,reject)=>{ws.on('message',data=>{if(JSON.parse(data.toString()).type==='hosted')resolve()});ws.on('error',reject);});
  const halfOpen=net.connect(port,'127.0.0.1');await new Promise((resolve,reject)=>{halfOpen.once('connect',resolve);halfOpen.once('error',reject);});halfOpen.write('GET / HTTP/1.1\r\nHost: localhost\r\n');
  agent=new http.Agent({keepAlive:true});await new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port,path:'/multiplayer/health',agent},r=>{r.resume();r.on('end',resolve)}).on('error',reject));
  const ended=exit(child);child.kill(signal);const result=await ended;if(process.platform !== 'win32') assert.equal(result.code,0,`${signal} shuts down cleanly`); else assert.ok(result.code===0||result.signal,`${signal} ends the process`);
  const tcp=await bindTcp(port), datagram=await bindUdp(udp);await new Promise(r=>tcp.close(r));await new Promise(r=>datagram.close(r));
  ws.terminate();halfOpen.destroy();agent.destroy();child=null;agent=null;
 }
 // A busy TCP port must not kill its owner or leave discovery running.
 const existing=await bindTcp(occupied);child=helper(occupied,udp);const failed=await exit(child);assert.notEqual(failed.code,0);assert.match(child.logs(),/EADDRINUSE|address already in use/i);
 const stillOwned=await new Promise(resolve=>{const sock=net.connect(occupied,'127.0.0.1',()=>{sock.destroy();resolve(true)});sock.on('error',()=>resolve(false));});assert.equal(stillOwned,true);
 const freeUdp=await bindUdp(udp);await new Promise(r=>freeUdp.close(r));await new Promise(r=>existing.close(r));child=null;
 // A discovery bind failure must release a TCP listener opened during startup.
 const udpOwner=await bindUdp(udp);child=helper(port,udp);const udpFailed=await exit(child);assert.notEqual(udpFailed.code,0);assert.match(child.logs(),/EADDRINUSE|address already in use/i);
 const freeTcp=await bindTcp(port);await new Promise(r=>freeTcp.close(r));await new Promise(r=>udpOwner.close(r));child=null;
 console.log('helper shutdown: active HTTP/WebSocket clients, TCP/UDP rebind, repeat starts and busy-port isolation PASS');
} finally {if(child&&child.exitCode===null)child.kill('SIGKILL');agent?.destroy();for(const handle of handles)try{handle.close()}catch{}}
