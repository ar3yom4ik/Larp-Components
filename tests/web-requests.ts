import assert from 'node:assert/strict';
import {downloadWebBytes,withWebDeadline} from '../src/utils/webRequests';
import {polyHavenModels} from '../src/utils/polyhaven';

const original=globalThis.fetch;
try {
  globalThis.fetch=async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(6));controller.enqueue(new Uint8Array(6));controller.close();}}),{headers:{'content-length':'2'}});
  await assert.rejects(downloadWebBytes('https://example.test/model',{limit:10}),/exceeds.*limit/i,'the actual stream, not a misleading header, enforces the limit');
  globalThis.fetch=async()=>new Response(new Uint8Array(12),{headers:{'content-length':'12'}});
  await assert.rejects(downloadWebBytes('https://example.test/model',{limit:10}),/exceeds.*limit/i);
  globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3]));
  assert.deepEqual([...new Uint8Array(await downloadWebBytes('https://example.test/model',{limit:10}))],[1,2,3]);
  globalThis.fetch=async()=>new Promise<Response>(()=>{});
  await assert.rejects(downloadWebBytes('https://example.test/hung',{limit:10,timeoutMs:20}),/timed out/i,'a stalled provider cannot leave a ghost forever');
  const controller=new AbortController();
  const pending=downloadWebBytes('https://example.test/hung',{limit:10,signal:controller.signal});controller.abort();
  await assert.rejects(pending,error=>(error as Error).name==='AbortError');
  await assert.rejects(withWebDeadline(()=>new Promise(()=>{}),undefined,20),/timed out/i,'even a non-abortable parse is bounded');

  let release!:(value:Response)=>void, requests=0;
  globalThis.fetch=async()=>{requests++;return new Promise<Response>(resolve=>{release=resolve;});};
  const first=new AbortController();
  const cancelled=polyHavenModels(first.signal);first.abort();
  await assert.rejects(cancelled,error=>(error as Error).name==='AbortError');
  const second=polyHavenModels();
  release(new Response(JSON.stringify({chair:{name:'Chair',categories:['Furniture'],tags:[]}})));
  assert.equal((await second)[0].name,'Chair');
  assert.equal(requests,1,'cancelling one browser does not corrupt the shared catalog request');
} finally {globalThis.fetch=original;}
console.log('web requests: stream limits, stuck provider/parse deadlines, cancellation and shared catalog recovery OK');
