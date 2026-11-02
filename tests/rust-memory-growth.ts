import assert from 'node:assert/strict';
import { Engine, RobotRT, type ProductSupport } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { createRustFeederStepper, createRustMachineStepper, createRustNavigator, createRustProductIntegrator, createRustRobotKinematics } from '../src/sim/wasm/kernel';

// Populate cached views, then force repeated growth of the *shared* Wasm memory
// through other bridges. Detached views must be refreshed before reading/writing.
const feeder=createRustFeederStepper(),machine=createRustMachineStepper(),product=createRustProductIntegrator(),robot=createRustRobotKinematics();
const navigators:ReturnType<typeof createRustNavigator>[]=[];
const e=new Engine();const machineItem=makeItem('cnc',[0,0,0],0);
const robotItem=makeItem('robot',[0,0,0],0);const rt=new RobotRT(1,robotItem);
e.sync([machineItem]);const m=e.machines.get(machineItem.id)!;
const box=e.spawn('carton',0,1,0);
const support:ProductSupport={top:0,kind:1,conveyor:false,lat:0,tx:0,tz:0,along:0,speed:0,blocked:false,stopper:false,length:0};
const f={id:'f',x:5,z:5,yaw:0,interval:1,timer:0,active:true,supply:2,requireSupply:false,productId:'carton'};
function exercise() {
  const b=structuredClone(box);
  assert.equal(product.integrate(b,support,1/60),false);assert.ok(Number.isFinite(b.y));
  const angles=robot.solve(rt.toLocal(rt.tip),rt.spec);assert.ok(Number.isFinite(angles.shoulder));
  assert.equal(typeof robot.reach(rt.toLocal(rt.tip),rt.spec),'boolean');
  m.busy=true;m.part=box;m.remaining=2;m.busyTime=0;m.progress=0;
  assert.equal(machine.step(m,[],1/60).action,3);assert.ok(Number.isFinite(m.remaining));
  f.timer=0;f.supply=2;
  let spawned=0;feeder.step([f],[],1/60,()=>{spawned++;},180);
  assert.equal(spawned,1);assert.equal(f.supply,1);
}
try {
  exercise();
  for(let i=0;i<16;i++) navigators.push(createRustNavigator());
  exercise();
  // Grow memory inside the spawn callback while the feeder is consuming results.
  const first={...f,id:'first',x:0,z:0,timer:0,supply:2};
  const second={...f,id:'second',x:10,z:0,timer:0,supply:2};
  let callbacks=0;
  feeder.step([first,second],[],1/60,()=>{
    callbacks++;
    if(callbacks===1) for(let i=0;i<32;i++) navigators.push(createRustNavigator());
  },180);
  assert.equal(callbacks,2);assert.equal(first.supply,1);assert.equal(second.supply,1);
  // Another round tests repeated rather than just the first growth event.
  for(let i=0;i<16;i++) navigators.push(createRustNavigator());
  exercise();
} finally {for(const n of navigators)n.dispose();feeder.dispose();machine.dispose();product.dispose();robot.dispose();}
console.log('Rust bridge cached views survive repeated shared Wasm memory growth');
