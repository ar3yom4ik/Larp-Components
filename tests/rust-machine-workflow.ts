import assert from 'node:assert/strict';
import { Engine, TABLE_TOP } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { createRustMachineStepper } from '../src/sim/wasm/kernel';

function snapshot(e:Engine, id:string) {
  const m=e.machines.get(id)!;
  return {
    busy:m.busy, remaining:m.remaining, busyTime:m.busyTime, progress:m.progress, cycles:m.cycles,
    part:m.part?.id ?? null,
    boxes:e.boxes.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z,vx:b.vx,vy:b.vy,vz:b.vz,hx:b.hx,hy:b.hy,hz:b.hz,r:b.r,state:b.state,claim:b.claim,productId:b.productId,color:b.color,assembly:b.assembly,processed:b.processed,inspected:b.inspected,lastMachine:b.lastMachine,fade:b.fade})),
  };
}
for (const kind of ['cnc','paint','inspection','assembly'] as const) {
  for (const mode of ['normal','blocked','wrong-product','empty','missing-part'] as const) {
    const item=makeItem(kind,[0,0,0],0,{props:{cycleTime:0.7,inputProduct:mode==='wrong-product'?'billet':'any',outputProduct:'machined',requiredParts:2,paintColor:'#123456'}});
    const js=new Engine(), hybrid=new Engine(), stepper=createRustMachineStepper();
    hybrid.machineStepper=stepper;
    try {
      for (const e of [js,hybrid]) {
        e.sync([structuredClone(item)]);
        const machine=e.machines.get(item.id)!; const t=machine.table();
        if(mode!=='empty' && mode!=='missing-part') {
          const first=e.spawn('carton',t.x,TABLE_TOP+0.2,t.z);
          first.y=TABLE_TOP+first.hy;
          if(mode==='blocked') first.claim=1;
          if(kind==='assembly') {
            const extra=e.spawn('carton',t.x+0.06,TABLE_TOP+0.2,t.z);
            extra.y=TABLE_TOP+extra.hy;
          }
        }
        if(mode==='missing-part') { machine.busy=true; machine.part=null; machine.remaining=0.2; }
        e.setRunning(true);
      }
      for(let frame=0;frame<100;frame++) {
        js.step(1/60); hybrid.step(1/60);
        assert.deepEqual(snapshot(hybrid,item.id), snapshot(js,item.id),`${kind}/${mode} frame ${frame}`);
      }
      if(mode==='normal') assert.equal(js.machines.get(item.id)!.cycles,1,`${kind} should complete a cycle`);
      if(mode==='blocked' || mode==='wrong-product' || mode==='empty' || mode==='missing-part') assert.equal(js.machines.get(item.id)!.cycles,0,`${kind}/${mode} must not complete a cycle`);
    } finally { stepper.dispose(); }
  }
}
// Randomized candidate ordering, proximity, claims and product compatibility.
let seed=24681357;
const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
for(let scenario=0;scenario<500;scenario++) {
  const kind=scenario%2===0?'assembly':'cnc';
  const item=makeItem(kind,[0,0,0],0,{props:{cycleTime:1,requiredParts:1+scenario%4,inputProduct:scenario%3?'any':'billet'}});
  const spec=Array.from({length:scenario%8},()=>({dx:(random()-0.5)*1.4,dz:(random()-0.5)*1.4,dy:(random()-0.5)*0.3,claim:random()<0.2,repeat:random()<0.2,product:random()<0.5?'carton':'billet'}));
  const js=new Engine(),hybrid=new Engine(),stepper=createRustMachineStepper(); hybrid.machineStepper=stepper;
  try {
    for(const e of [js,hybrid]) {
      e.sync([structuredClone(item)]); const m=e.machines.get(item.id)!; const t=m.table();
      for(const v of spec) {
        const b=e.spawn(v.product,t.x+v.dx,TABLE_TOP+0.2,t.z+v.dz);
        b.y=TABLE_TOP+b.hy+v.dy; b.claim=v.claim?1:0; b.lastMachine=v.repeat?m.id:null;
      }
      e.setRunning(true);
    }
    js.step(1/60); hybrid.step(1/60);
    assert.deepEqual(snapshot(hybrid,item.id),snapshot(js,item.id),`random machine scenario ${scenario}`);
  } finally {stepper.dispose();}
}
console.log('Rust machine workflow: automatic cycles, blocked, mismatched input, empty, missing-part and 500 randomized scenarios match TypeScript');
