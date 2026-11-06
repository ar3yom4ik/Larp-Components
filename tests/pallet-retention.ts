import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {Engine,BELT_TOP} from '../src/sim/engine';
import {programToCode} from '../src/sim/programCode';
import type {RobotProgram} from '../src/types';

async function advance(e:Engine,seconds:number) { for(let i=0;i<seconds*60;i++){e.step(1/60); await Promise.resolve(); await Promise.resolve();} }
for (const mode of ['visual','script'] as const) {
  const belt=makeItem('conveyor',[-2,0,0],0,{points:[[0,0],[1,0],[2,0]],props:{speed:.6,active:true,stopper:true}});
  const pallet=makeItem('crates',[-.3,0,2.9],0,{props:{product:'carton',cols:1,rows:1,layers:1,retainFull:true}});
  const program:RobotProgram={mode:'palletize',sourceId:belt.id,targetId:pallet.id,repeat:true,delay:0,clearance:.3};
  const robot=makeItem('robot',[.3,0,1.45],0,{props:{gripper:'vacuum',speed:70},...(mode==='visual'?{program}:{script:programToCode(program)})});
  const e=new Engine();e.sync([belt,pallet,robot]); e.spawn('carton',-.35,BELT_TOP+.13,0);e.setRunning(true);
  await advance(e,25);
  assert.equal(e.pallets.get(pallet.id)!.cursor,1,`${mode}: fills the pallet`);
  assert.equal(e.robots.get(robot.id)!.cycles,1,`${mode}: first placement completed`);
  const first=e.boxes.find(b=>b.palletId===pallet.id);
  assert.ok(first && first.state==='free',`${mode}: filled pallet remains visible`);
  e.spawn('carton',-.35,BELT_TOP+.13,0);await advance(e,25);
  assert.equal(e.robots.get(robot.id)!.cycles,1,`${mode}: waits instead of reusing the occupied slot`);
  assert.equal(e.pallets.get(pallet.id)!.shipped,0);
  e.replacePallet(pallet.id); await advance(e,25);
  assert.equal(e.robots.get(robot.id)!.cycles,2,`${mode}: resumes after manual replacement`);
  assert.equal(e.pallets.get(pallet.id)!.cursor,1);
}
{
  const belt=makeItem('conveyor',[0,0,0],0,{points:[[-1.5,0],[1.5,0]],props:{speed:.3,active:true,stopper:true}});
  const pallet=makeItem('crates',[1.2,0,3],0,{props:{cols:1,rows:1,layers:1,retainFull:true}});
  const human=makeItem('operator',[1.2,0,1],0,{props:{task:'carry',sourceId:belt.id,targetId:pallet.id,walkSpeed:1}});
  const e=new Engine();e.sync([belt,pallet,human]);e.spawn('carton',1.1,BELT_TOP+.13,0);e.setRunning(true);
  await advance(e,35);
  assert.equal(e.pallets.get(pallet.id)!.cursor,1,'human fills pallet');
  e.spawn('carton',1.1,BELT_TOP+.13,0);await advance(e,25);
  assert.equal(e.humans.get(human.id)!.completed,1,'human waits when full');
  assert.equal(e.pallets.get(pallet.id)!.shipped,0);
  e.replacePallet(pallet.id);await advance(e,35);
  assert.equal(e.humans.get(human.id)!.completed,2,'human resumes after replacement');
}
console.log('pallet retention: visual robot, script, human, replacement and resume OK');
