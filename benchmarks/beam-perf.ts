import {performance} from 'node:perf_hooks';
import {makeItem} from '../src/data/library';
import {makeBeamBlocker} from '../src/sim/rigidBodies';
import {makeBeamBlocker as baselineBeamBlocker} from 'virtual:baseline-beam';
import type {Vec3} from '../src/types';

// A deliberately sparse field: most rays miss most compound equipment. This
// measures only beam/shape tests, not a whole simulation frame or browser FPS.
const items=Array.from({length:120},(_,i)=>makeItem(i%3?'cabinet':'feeder',[(i%12)*3-18,0,Math.floor(i/12)*4-18],i*17));
const rays=Array.from({length:12},(_,i)=>[[i*1.5-9,1,-20],[i*1.5-9,1,20]] as [Vec3,Vec3]);
const before=items.map(item=>baselineBeamBlocker(item,items)),after=items.map(item=>makeBeamBlocker(item,items));
for(let i=0;i<items.length;i++)for(const [a,b] of rays)if(before[i](a,b)!==after[i](a,b))throw new Error(`beam mismatch for item ${i}`);
function run(checks:typeof after) {
 let hits=0;const start=performance.now();
 for(let i=0;i<1200;i++)for(const [a,b] of rays)for(const check of checks)if(check(a,b))hits++;
 return {ms:performance.now()-start,hits};
}
console.log(JSON.stringify({baseline:process.env.TS_BENCH_BASELINE,items:items.length,rays:rays.length,checksPerTrial:items.length*rays.length*1200,note:'sparse beam microbenchmark only; no renderer, simulation frame or initialization'}));
for(let trial=0;trial<3;trial++) {
 const previous=run(before),current=run(after);
 if(previous.hits!==current.hits)throw new Error('beam hit count changed');
 console.log(JSON.stringify({trial:trial+1,before:previous,after:current,speedup:previous.ms/current.ms}));
}
