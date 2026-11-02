import assert from 'node:assert/strict';
import { Engine, type MachineRT } from '../src/sim/engine';
import { createRustMachineClock } from '../src/sim/wasm/kernel';
import { makeItem } from '../src/data/library';

const clock = createRustMachineClock();
try {
  const values = [0, -0, 0.001, 1, -1, Infinity, -Infinity, NaN];
  for (const busyTime of values) for (const remaining of values) for (const cycle of values) for (const dt of [0, 1/60, -1, NaN]) {
    const machine = {busyTime, remaining, progress: 0, cycle} as MachineRT;
    const expected = {busyTime: busyTime + dt, remaining: remaining - dt, progress: Math.min(1, 1 - (remaining - dt) / cycle)};
    clock.advance(machine, dt);
    assert.deepEqual({busyTime:machine.busyTime, remaining:machine.remaining, progress:machine.progress}, expected);
  }
  // Force actual machine cycles rather than relying on generated robots reaching machines.
  for (const kind of ['cnc', 'paint', 'inspection', 'assembly'] as const) {
    const item = makeItem(kind, [0,0,0], 0, {props:{cycleTime:1, inputProduct:'any', outputProduct:'machined', paintColor:'#123456'}});
    const js = new Engine(), rust = new Engine(); rust.machineClock=clock;
    for (const engine of [js, rust]) {
      engine.sync([structuredClone(item)]);
      const m=engine.machines.get(item.id)!;
      assert.ok(m, `${kind} must exist`);
      const t=m.table();
      const box=engine.spawn('carton',t.x,t.y+0.2,t.z);
      assert.equal(engine.process(m,box),true);
      engine.setRunning(true);
    }
    for(let i=0;i<90;i++) {
      js.step(1/60); rust.step(1/60);
      const snapshot=(e:Engine)=>{
        const m=e.machines.get(item.id)!; const b=e.boxes[0];
        return {busy:m.busy,busyTime:m.busyTime,progress:m.progress,remaining:m.remaining,cycles:m.cycles,box:{x:b.x,y:b.y,z:b.z,state:b.state,productId:b.productId,color:b.color,processed:b.processed,inspected:b.inspected}};
      };
      assert.deepEqual(snapshot(rust),snapshot(js),`${kind} frame ${i}`);
    }
    assert.equal(js.machines.get(item.id)!.cycles,1,`${kind} cycle completed`);
  }
} finally { clock.dispose(); }
assert.throws(()=>clock.advance({} as MachineRT, 1), /disposed/);
console.log('Rust machine clock: numerical edge cases and four real machine cycles match TypeScript');
