import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { Engine } from '../src/sim/engine';
import { Engine as BaselineEngine } from 'virtual:baseline-ts-engine';
import { DEFAULT_GEN, generateFactory, parsePrompt } from '../src/sim/generator';
import { makeItem } from '../src/data/library';
import { snapshot, difference } from './hybrid-utils';
import type { SceneItem } from '../src/types';

const cases=[
  {name:'robot-cell',items:()=>generateFactory({...DEFAULT_GEN,stages:1,operators:false,fences:false})},
  {name:'human-cell',items:()=>generateFactory(parsePrompt('metalworking line with 1 cell, human operator',DEFAULT_GEN))},
  {name:'dense-multiline',items:()=>generateFactory({...DEFAULT_GEN,stages:3,lanes:3,operators:true,staff:6,fences:false})},
  {name:'crowded-transfers',items:()=>[
    makeItem('conveyor',[0,0,0],0,{points:[[-10,0],[0,0]],props:{speed:0.7,active:true}}),
    makeItem('conveyor',[0,0,0],0,{points:[[0,0],[10,0]],props:{speed:0.7,active:true,stopper:true}}),
  ], prepare:(e:Engine,items:SceneItem[])=>{
    for(let i=0;i<60;i++){
      const b=e.spawn('carton',-9.6+i*0.32,0.66+0.13,0);
      if(i%5!==0){b.support=2;b.convId=items[i%7===0?1:i<30?0:1].id;b.convS=i*0.32;b.convLat=0;}
    }
  }},
];
const parity=process.argv.includes('--parity');
function percentile(a:number[],p:number){const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.floor((sorted.length-1)*p)];}
function summary(a:number[]){return {totalMs:a.reduce((x,y)=>x+y,0),medianMs:percentile(a,.5),p95Ms:percentile(a,.95),p99Ms:percentile(a,.99)};}
async function run(items:SceneItem[], prepare?: (engine:Engine, items:SceneItem[]) => void) {
  const before=new BaselineEngine(),after=new Engine();
  for(const e of [before,after]){e.stepBudgetMs=40;e.sync(structuredClone(items));prepare?.(e,items);e.setRunning(true);}
  const warmup=parity?0:20,seconds=parity?90:160,bt:number[]=[],at:number[]=[];
  let mismatch:string|null=null;
  try {
    for(let frame=0;frame<(warmup+seconds)*60;frame++){
      const measure=(e:Engine,t:number[])=>{const t0=performance.now();e.step(1/60);if(frame>=warmup*60)t.push(performance.now()-t0);};
      if(frame%2===0){measure(before,bt);measure(after,at);}else{measure(after,at);measure(before,bt);}
      await Promise.resolve();await Promise.resolve();
      if((parity||frame%60===0)&&!mismatch) {const d=difference(snapshot(before),snapshot(after));if(d)mismatch=`frame ${frame}: ${d}`;}
    }
    if(!mismatch) mismatch=difference(snapshot(before),snapshot(after));
    return {before:summary(bt),after:summary(at),mismatch,beforeStats:before.stats,afterStats:after.stats,beforeTime:before.time,afterTime:after.time,boxes:after.boxes.length};
  }finally{before.setRunning(false);after.setRunning(false);}
}
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0]?.model,mode:parity?'per-frame parity':'timing',baseline:process.env.TS_BENCH_BASELINE || '88a60d3',note:'Engine.step only; no rendering, browser, GPU, initialization or parity checks; tolerance 1e-8.'}));
for(const scenario of cases){const items=scenario.items();for(let trial=1;trial<=(parity?1:3);trial++){
  const result=await run(items,scenario.prepare);console.log(JSON.stringify({scene:scenario.name,itemCount:items.length,trial,...result}));
  if(result.mismatch){process.exitCode=1;}
}}
