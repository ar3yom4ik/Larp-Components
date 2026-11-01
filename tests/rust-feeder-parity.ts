import assert from 'node:assert/strict';
import { Engine } from '../src/sim/engine';
import { DEFAULT_GEN, FACTORY_RECIPES, generateFactory } from '../src/sim/generator';
import { makeItem } from '../src/data/library';
import { createRustFeederStepper, createRustMachineClock, createRustMachineStepper, createRustLogicStepper } from '../src/sim/wasm/kernel';
import type { SceneItem } from '../src/types';

// Each pair uses the *same* factory and input events. Feeder decisions, automatic machine workflow and automation signals are
// switched to Rust; all other behavior remains the existing TS implementation.
function state(engine: Engine) {
  return {
    time: engine.time, stats: engine.stats, signals:[...engine.signalState],
    feeders: [...engine.feeders.values()].map(f => ({id:f.id,timer:f.timer,supply:f.supply})),
    boxes: engine.boxes.map(b => ({id:b.id,x:b.x,y:b.y,z:b.z,vx:b.vx,vy:b.vy,vz:b.vz,yaw:b.yaw,state:b.state,productId:b.productId,claim:b.claim,support:b.support,palletId:b.palletId,processed:b.processed,inspected:b.inspected,assembly:b.assembly,lastMachine:b.lastMachine,color:b.color,fade:b.fade})),
    machines: [...engine.machines.values()].map(m=>({id:m.id,busy:m.busy,busyTime:m.busyTime,progress:m.progress,remaining:m.remaining,cycles:m.cycles,part:m.part?.id ?? null})),
    robots: [...engine.robots.values()].map(r=>({id:r.itemId,status:r.status,cycles:r.cycles,tip:r.tip,joints:r.joints})),
    humans: [...engine.humans.values()].map(h=>({id:h.id,x:h.x,z:h.z,stage:h.stage,status:h.status,completed:h.completed})),
  };
}
async function compare(label:string, items:SceneItem[], seconds:number) {
  const js = new Engine(), hybrid = new Engine();
  const rust = createRustFeederStepper(); hybrid.feederStepper = rust;
  const clock = createRustMachineClock(); hybrid.machineClock = clock;
  const machine = createRustMachineStepper(); hybrid.machineStepper = machine;
  const logic = createRustLogicStepper(); hybrid.logicStepper = logic;
  js.stepBudgetMs=40; hybrid.stepBudgetMs=40;
  js.sync(structuredClone(items)); hybrid.sync(structuredClone(items));
  js.setRunning(true); hybrid.setRunning(true);
  try {
    for (let frame=0;frame<seconds*60;frame++) {
      js.step(1/60); hybrid.step(1/60);
      await Promise.resolve(); await Promise.resolve();
      assert.deepEqual(state(hybrid),state(js),`${label}: frame ${frame}`);
    }
    assert.deepEqual(state(hybrid),state(js),`${label}: final state`);
  } finally { rust.dispose(); clock.dispose(); machine.dispose(); logic.dispose(); }
}
for (const recipe of FACTORY_RECIPES) {
  await compare(recipe.id,generateFactory({...DEFAULT_GEN,recipe:recipe.id,stages:recipe.id==='logistics'?0:1,fences:false,operators:false,cols:2,rows:2,layers:2}),60);
}
// Overlapping feeders exercise sequential spawn blocking; an exhausted, inactive
// and replenishable feeder exercise conditional timer/supply behavior.
const belt=makeItem('conveyor',[0,0,0],0,{points:[[0,0],[4,0]],props:{speed:0.6,active:true,stopper:true}});
const f1=makeItem('feeder',[0.8,0,0],0,{props:{interval:2,active:true,product:'carton'}});
const f2=makeItem('feeder',[0.8,0,0],0,{props:{interval:2,active:true,product:'carton'}});
const f3=makeItem('feeder',[2.5,0,0],0,{props:{interval:2,active:false,product:'carton'}});
const f4=makeItem('feeder',[3,0,0],0,{props:{interval:2,active:true,requireSupply:true,product:'carton'}});
await compare('overlapping/inactive feeders',[belt,f1,f2,f3,f4],30);
console.log('Rust feeder and automatic machine hybrid vs TypeScript: 9 generated factories + feeder edge scenario matched selected state every frame');

// JS user scripts and human walking still run in the host in both modes.
const scriptLine = generateFactory({...DEFAULT_GEN,stages:1,operators:true,staff:2});
for (const item of scriptLine) if (item.program && item.script) item.program=undefined;
await compare('JavaScript robot scripts and human staff',scriptLine,60);
const largeLine = generateFactory({...DEFAULT_GEN,stages:3,lanes:2,operators:true,staff:4});
await compare('parallel multi-cell factory',largeLine,30);

// Exercise blocked, full, dead-box, zero-supply and simultaneous-spawn paths.
import type { Box, FeederRT } from '../src/sim/engine';
let rngSeed=1234567;
const rand=()=>{rngSeed=(Math.imul(rngSeed,1664525)+1013904223)>>>0;return rngSeed/4294967296;};
const stepper=createRustFeederStepper();
try {
  for(let scenario=0;scenario<2000;scenario++) {
    const feeders:FeederRT[]=Array.from({length:1+scenario%5},(_,i)=>({id:String(i),x:Math.floor(rand()*5),z:0,yaw:0,interval:1+rand()*3,timer:rand()<0.6?0:rand(),active:rand()>0.2,productId:'carton',supply:Math.floor(rand()*4),requireSupply:rand()>0.5}));
    const boxes:Box[]=Array.from({length:scenario%23===0?180:scenario%6},()=>({x:Math.floor(rand()*5),z:0,y:rand()<0.5?1.12:0.2,state:rand()<0.2?'dead':'free'} as Box));
    const expected=structuredClone(feeders), actual=structuredClone(feeders), refBoxes=structuredClone(boxes), rustBoxes=structuredClone(boxes);
    for(const f of expected) {
      if(!f.active || (f.requireSupply && f.supply<=0))continue;
      f.timer-=1/60;
      if(f.timer>0)continue;
      const blocked=refBoxes.some(b=>b.state!=='dead' && Math.hypot(b.x-f.x,b.z-f.z)<0.5 && b.y>0.4 && b.y<1.52);
      if(blocked || refBoxes.length>=180){f.timer=0.25;continue;}
      f.timer=f.interval; f.supply-=1;
      refBoxes.push({x:f.x,y:1.12,z:f.z,state:'free'} as Box);
    }
    stepper.step(actual,rustBoxes,1/60,f=>rustBoxes.push({x:f.x,y:1.12,z:f.z,state:'free'} as Box),180);
    assert.deepEqual(actual,expected,`feeder edge scenario ${scenario}`);
    assert.deepEqual(rustBoxes,refBoxes,`spawn scenario ${scenario}`);
  }
} finally {stepper.dispose();}
console.log('Rust feeder batch: 2,000 random and capacity/blocking scenarios matched');
