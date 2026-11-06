import { performance } from 'node:perf_hooks';
import { makeItem } from '../src/data/library';
import { Engine } from '../src/sim/engine';

// Reproducible, headless CPU micro-benchmark (not a browser FPS claim).
// Rows are spaced so bodies fall and settle without deliberately interpenetrating.
for (const count of [25,100,250]) {
  const items=Array.from({length:count},(_,i)=>makeItem('cabinet',[(i%20)*1.2,5+Math.floor(i/100),Math.floor(i/20)*1.2],0,{props:{physicsMode:'dynamic',physicsMass:30}}));
  const engine=new Engine();engine.sync(items);engine.setRunning(true);
  const measure=(frames:number)=>{
    const times:number[]=[];
    for(let i=0;i<frames;i++){const start=performance.now();engine.step(1/60);times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);
    return {mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)]};
  };
  const falling=measure(90);
  measure(450); // let the solver settle and sleep
  const sleeping=measure(180);
  const awake=items.filter(item=>engine.rigidBodies.body(item.id)?.sleepState !== 2).length;
  console.log(`${count} dynamic bodies (${awake} awake at end): falling mean ${falling.mean.toFixed(2)} ms, p95 ${falling.p95.toFixed(2)} ms; settled mean ${sleeping.mean.toFixed(2)} ms, p95 ${sleeping.p95.toFixed(2)} ms per 1/60s step`);
}
