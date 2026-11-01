import assert from 'node:assert/strict';
import { Engine, RobotRT, type V3 } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { DEFAULT_GEN, generateFactory } from '../src/sim/generator';
import { createRustRobotKinematics } from '../src/sim/wasm/kernel';

let seed=0x12348765;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const kinematics=createRustRobotKinematics();
try {
  for(const kind of ['robot','cobot','kuka','fanuc'] as const) {
    for(let i=0;i<5000;i++) {
      const item=makeItem(kind,[(random()-0.5)*20,0,(random()-0.5)*20],(random()-0.5)*360,{scale:0.4+random()*2});
      const js=new RobotRT(1,item),rust=new RobotRT(1,item);rust.kinematics=kinematics;
      const point:V3=[item.position[0]+(random()-0.5)*6,(random()-0.2)*4,item.position[2]+(random()-0.5)*6];
      assert.equal(rust.reach(point),js.reach(point),`${kind} reach ${i}`);
      js.tip=[...point];rust.tip=[...point];js.solve();rust.solve();
      for(const key of ['waist','shoulder','elbow','wrist'] as const) {
        const a=js.joints[key],b=rust.joints[key];
        assert.ok(Object.is(a,b) || (Number.isNaN(a)&&Number.isNaN(b)) || Math.abs(a-b)<1e-10,`${kind} ${key} case ${i}: ${a} vs ${b}`);
      }
    }
  }
  // Compare a working visual robot factory every frame, not only isolated math.
  const items=generateFactory({...DEFAULT_GEN,stages:1,operators:false,fences:false});
  const js=new Engine(),rust=new Engine();rust.robotKinematics=kinematics;
  for(const e of [js,rust]) {e.sync(structuredClone(items));e.setRunning(true);}
  for(let frame=0;frame<130*60;frame++) {
    js.step(1/60);rust.step(1/60);await Promise.resolve();await Promise.resolve();
    assert.deepEqual(rust.stats,js.stats,`factory counters frame ${frame}`);
    for(const [id,a] of js.robots) {
      const b=rust.robots.get(id)!;
      assert.equal(b.status,a.status,`robot status frame ${frame}`);
      assert.equal(b.cycles,a.cycles,`robot cycles frame ${frame}`);
      for(const key of ['waist','shoulder','elbow','wrist'] as const) assert.ok(Math.abs(a.joints[key]-b.joints[key])<1e-10,`factory ${key} frame ${frame}`);
    }
  }
  assert.ok(js.stats.placed>0,'factory must produce');
  // JavaScript authored robot programs remain host-executed and complete.
  const item=makeItem('robot',[0,0,0],0,{script:'await robot.home(); await robot.wait(0.1); await robot.grip(); await robot.release(); log("script complete");'});
  const engine=new Engine();engine.robotKinematics=kinematics;engine.sync([item]);engine.setRunning(true);
  for(let i=0;i<300;i++){engine.step(1/60);await Promise.resolve();await Promise.resolve();}
  assert.ok(engine.logs.some(l=>l.text.includes('script complete')),'JavaScript robot script did not complete');
  assert.equal(engine.logs.some(l=>l.level==='error'),false);
  // Assigning the backend after sync and clearing it must affect existing robots.
  engine.robotKinematics=null;assert.equal(engine.robots.get(item.id)!.kinematics,null);
  engine.robotKinematics=kinematics;assert.equal(engine.robots.get(item.id)!.kinematics,kinematics);
} finally {kinematics.dispose();}
assert.throws(()=>kinematics.reach([0,0,0],{shoulder:1,L1:1,L2:1,Lw:1,base:1}),/disposed/);
console.log('Rust robot kinematics: 20,000 reach/solve comparisons, 130-second factory and JavaScript script passed');
