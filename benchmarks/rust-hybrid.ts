import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { Engine } from '../src/sim/engine';
import { Engine as PreRustEngine } from 'virtual:pre-rust-engine';
import * as oldBridge from 'virtual:old-rust-bridge';
import { DEFAULT_GEN, generateFactory, parsePrompt } from '../src/sim/generator';
import { enable, snapshot, difference } from './hybrid-utils';
import type { SceneItem } from '../src/types';

// Compare the last pre-Rust commit, the current TypeScript engine, and the
// same host with every experimental Rust subsystem active. This is NOT a comparison against a fully ported engine.
const cases = [
  {name:'robot-cell',items:()=>generateFactory({...DEFAULT_GEN,stages:1,operators:false,fences:false})},
  {name:'human-cell',items:()=>generateFactory(parsePrompt('metalworking line with 1 cell, human operator',DEFAULT_GEN))},
  {name:'multi-line',items:()=>generateFactory({...DEFAULT_GEN,stages:3,lanes:2,operators:true,staff:4,fences:false})},
];
function percentile(values:number[],p:number){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*p)];}
function summarize(values:number[]) {return {totalMs:values.reduce((a,b)=>a+b,0),medianMs:percentile(values,.5),p95Ms:percentile(values,.95),p99Ms:percentile(values,.99)};}
async function trial(items:SceneItem[], warmup:number, duration:number) {
  const ts=new Engine(),hybrid=new Engine(),preRust=new PreRustEngine(),oldHybrid=new Engine();
  const dispose=enable(hybrid), disposeOld=enable(oldHybrid,oldBridge);
  ts.stepBudgetMs=40;hybrid.stepBudgetMs=40;preRust.stepBudgetMs=40;oldHybrid.stepBudgetMs=40;
  ts.sync(structuredClone(items));hybrid.sync(structuredClone(items));preRust.sync(structuredClone(items));oldHybrid.sync(structuredClone(items));ts.setRunning(true);hybrid.setRunning(true);preRust.setRunning(true);oldHybrid.setRunning(true);
  const a:number[]=[],b:number[]=[],c:number[]=[],d:number[]=[];let firstMismatch:string|null=null,firstPreRustMismatch:string|null=null,firstOldHybridMismatch:string|null=null;
  try {
    for(let frame=0;frame<(warmup+duration)*60;frame++){
      const measure=frame>=warmup*60;
      // Alternate ordering; only Engine.step is timed, not parity checking or yields.
      const measureStep=(e:Engine,results:number[])=>{const start=performance.now();e.step(1/60);const elapsed=performance.now()-start;if(measure)results.push(elapsed);};
      const engines:[[Engine,number[]],[Engine,number[]],[Engine,number[]],[Engine,number[]]]=[[preRust,c],[ts,a],[oldHybrid,d],[hybrid,b]];
      for(let i=0;i<engines.length;i++){const [e,result]=engines[(i+frame)%engines.length];measureStep(e,result);}
      await Promise.resolve();await Promise.resolve();
      if(frame%60===0) {
        if(!firstMismatch) {const d=difference(snapshot(ts),snapshot(hybrid));if(d) firstMismatch=`frame ${frame}: ${d}`;}
        if(!firstPreRustMismatch) {const delta=difference(snapshot(preRust),snapshot(hybrid));if(delta) firstPreRustMismatch=`frame ${frame}: ${delta}`;}
        if(!firstOldHybridMismatch) {const delta=difference(snapshot(oldHybrid),snapshot(hybrid));if(delta) firstOldHybridMismatch=`frame ${frame}: ${delta}`;}
      }
    }
    if(!firstMismatch){const d=difference(snapshot(ts),snapshot(hybrid));if(d)firstMismatch=`final: ${d}`;}
    return {preRust:summarize(c),typescript:summarize(a),oldHybrid:summarize(d),hybrid:summarize(b),firstMismatch,firstPreRustMismatch,firstOldHybridMismatch,oldHybridStats:oldHybrid.stats,preRustStats:preRust.stats,typescriptStats:ts.stats,hybridStats:hybrid.stats,preRustSimTime:preRust.time,typescriptSimTime:ts.time,hybridSimTime:hybrid.time};
  }finally{ts.setRunning(false);hybrid.setRunning(false);preRust.setRunning(false);oldHybrid.setRunning(false);disposeOld();dispose();}
}
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0]?.model,platform:os.platform(),note:'Only Engine.step is timed; no rendering, browser, GPU or initialization. Parity checks sample selected state once per simulated second with 1e-8 relative tolerance.'}));
for(const test of cases) {
  const items=test.items();
  for(let run=1;run<=3;run++) {
    const result=await trial(items,20,60);
    console.log(JSON.stringify({scene:test.name,run,itemCount:items.length,...result}));
  }
}
