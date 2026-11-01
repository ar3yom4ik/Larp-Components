import { Engine } from '../src/sim/engine';
import * as wasm from '../src/sim/wasm/kernel';

export function enable(engine:Engine, api:typeof wasm = wasm) {
  const feeder=api.createRustFeederStepper(), machine=api.createRustMachineStepper(), logic=api.createRustLogicStepper();
  const navigation=api.createRustNavigator(), robot=api.createRustRobotKinematics(), product=api.createRustProductIntegrator();
  engine.feederStepper=feeder;engine.machineStepper=machine;engine.logicStepper=logic;
  engine.navigator=navigation;engine.robotKinematics=robot;engine.productIntegrator=product;
  return ()=>{engine.feederStepper=null;engine.machineStepper=null;engine.logicStepper=null;engine.navigator=null;engine.robotKinematics=null;engine.productIntegrator=null;feeder.dispose();machine.dispose();logic.dispose();navigation.dispose();robot.dispose();product.dispose();};
}
export function snapshot(e:Engine) {
  return {
    time:e.time,stats:e.stats,signals:[...e.signalState],
    feeders:[...e.feeders.values()].map(f=>({id:f.id,timer:f.timer,supply:f.supply})),
    boxes:e.boxes.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z,vx:b.vx,vy:b.vy,vz:b.vz,yaw:b.yaw,tilt:b.tilt,tiltV:b.tiltV,state:b.state,support:b.support,productId:b.productId,claim:b.claim,palletId:b.palletId,processed:b.processed,inspected:b.inspected})),
    machines:[...e.machines.values()].map(m=>({id:m.id,busy:m.busy,progress:m.progress,remaining:m.remaining,busyTime:m.busyTime,cycles:m.cycles,part:m.part?.id??null})),
    robots:[...e.robots.values()].map(r=>({id:r.itemId,status:r.status,cycles:r.cycles,tip:r.tip,joints:r.joints})),
    humans:[...e.humans.values()].map(h=>({id:h.id,x:h.x,z:h.z,stage:h.stage,status:h.status,completed:h.completed})),
  };
}
export function difference(a:unknown,b:unknown,path='state'):string|null {
  if(typeof a==='number' && typeof b==='number') return Object.is(a,b) || Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)) ? null : `${path}: ${a} vs ${b}`;
  if(a===b)return null;
  if(!a || !b || typeof a!=='object' || typeof b!=='object')return `${path}: ${String(a)} vs ${String(b)}`;
  const ak=Object.keys(a),bk=Object.keys(b);if(ak.join('|')!==bk.join('|'))return `${path}: different keys or lengths`;
  for(const k of ak){const d=difference((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k],`${path}.${k}`);if(d)return d;}
  return null;
}
