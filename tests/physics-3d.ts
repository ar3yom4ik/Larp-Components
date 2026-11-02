import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeItem } from '../src/data/library';
import { Engine, ConveyorRT, BELT_TOP, DT } from '../src/sim/engine';
import { RigidBodyWorld } from '../src/sim/rigidBodies';
import { Vec3 as CannonVec3, Box as CannonBox } from 'cannon-es';
import { samplePath } from '../src/sim/spline';
import { beltGeometry } from '../src/components/ModelKit';
import { importedProductId, getProduct } from '../src/data/products';
import { itemLocalToWorld } from '../src/utils/transform';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';
import { parseProject, serializeProject } from '../src/utils/project';
import type { ImportedModelData } from '../src/types';

function tick(engine: Engine, seconds: number) {
  engine.setRunning(true);
  for (let i = 0; i < seconds * 60; i++) engine.step(1 / 60);
}
function near(a: number, b: number, tolerance: number, message: string) { assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`); }

// 3D arc length and mesh geometry use the same point heights as simulation.
{
  const path = samplePath([[0, 0], [4, 0]], .1, [0, 2]);
  near(path.length, Math.sqrt(20), 1e-8, '3D spline length');
  near(path.y[0], 0, 1e-10, 'first height'); near(path.y.at(-1)!, 2, 1e-10, 'last height');
  const geo = beltGeometry(path, .62, BELT_TOP), pos = geo.getAttribute('position');
  near(pos.getY(0), BELT_TOP, 1e-5, 'mesh start'); near(pos.getY(pos.count - 1), BELT_TOP + 2, 1e-5, 'mesh end'); geo.dispose();
  const belt = makeItem('conveyor', [1, 1, -3], 30, {rotationX: 12, rotationZ: -17, points: [[0, 0], [4, 0]], pointHeights: [0, 2]});
  const engine = new Engine(); engine.sync([belt]); const rt = engine.conveyors.get(belt.id)!;
  const start = itemLocalToWorld(belt, [0, BELT_TOP, 0], false), end = itemLocalToWorld(belt, [4, BELT_TOP + 2, 0], false);
  near(rt.pointAt(0).x, start[0], 1e-8, 'tilted belt x'); near(rt.pointAt(0).y, start[1], 1e-8, 'tilted belt y');
  near(rt.pointAt(rt.length).y, end[1], 1e-8, 'tilted belt end y');
  const disk = serializeProject({projectName:'3D', layoutName:'3D', activeLayoutId:null, items:[belt]});
  const restored = parseProject(readProjectArchive(createProjectArchive(disk))).items[0];
  assert.deepEqual(restored.pointHeights, [0, 2]);
  const old = parseProject(serializeProject({projectName:'old', layoutName:'old', activeLayoutId:null, items:[makeItem('conveyor')]})).items[0];
  assert.equal(old.pointHeights, undefined);
}

// A part stays on the belt going uphill AND downhill, without floating or
// falling through. The stopper retains it at the far end.
for (const heights of [[0, 2], [2, 0]]) {
  const belt = makeItem('conveyor', [0, 0, 0], 0, { points: [[0, 0], [4, 0]], pointHeights: heights, props: { speed: .6, active: true, stopper: true } });
  const engine = new Engine(); engine.sync([belt]);
  const part = engine.spawn('carton', .25, BELT_TOP + heights[0] + .35, 0); tick(engine, 8);
  const rt = engine.conveyors.get(belt.id)!, q = rt.query(part.x, part.z, part.y - part.hy)!;
  assert.equal(part.support, 2, `part remains on slope ${heights}`);
  assert.ok(part.x > 3.6 && part.x < 4, `part reached stopper ${heights}: ${part.x}`);
  near(part.y - part.hy, q.y, .025, `part follows support height ${heights}`);
}

// Faces are tested in their real XYZ basis, not as horizontal approximations.
{
  const pallet = makeItem('crates', [0, 1, 0], 20, {rotationZ: 20});
  const engine = new Engine(); engine.sync([pallet]);
  const location = itemLocalToWorld(pallet, [.35, .15, 0]);
  const part = engine.spawn('carton', location[0], location[1] + .13 + .08, location[2]); tick(engine, .5);
  const actual = itemLocalToWorld(pallet, [.35, .15, 0]);
  near(part.y - part.hy, actual[1], .09, 'tilted pallet surface');
}

// Dynamic bodies fall onto a kinematic raised deck; pose is transient and
// reset returns to the authored layout. Weight is the actual solver mass.
{
  const platform = makeItem('platform', [0, 0, 0], 0, {props:{width:4, depth:4, height:2.4}});
  const cabinet = makeItem('cabinet', [0, 6, 0], 0, {props:{physicsMode:'dynamic', physicsMass:37}});
  const engine = new Engine(); engine.sync([platform, cabinet]);
  assert.equal(engine.rigidBodies.body(cabinet.id)?.mass, 37);
  tick(engine, 4);
  const pose = engine.getPhysicsPose(cabinet.id)!;
  near(pose.position[1], 2.4, .08, 'cabinet landed on platform');
  near(engine.getLiveItem(cabinet.id)!.position[1], pose.position[1], .03, 'operational pose tracks body');
  assert.deepEqual(cabinet.position, [0, 6, 0], 'authored pose is unchanged');
  assert.equal(engine.rigidBodies.hasAwakeBodies(), false, 'settled body goes to sleep');
  engine.rigidBodies.body(cabinet.id)!.applyImpulse(new CannonVec3(100,0,0));
  tick(engine, .2); assert.ok(engine.getPhysicsPose(cabinet.id)!.position[0] > .02, 'an impulse wakes a sleeping body');
  engine.setRunning(false); engine.reset(); near(engine.getPhysicsPose(cabinet.id)!.position[1], 6, 1e-8, 'reset pose');
}

// A dynamic belt or roller must keep driving its workpiece, including while
// falling. Solver friction must not cancel the specialized conveyor motor.
for (const kind of ['conveyor', 'roller'] as const) {
  const belt = makeItem(kind, [0, 3, 0], 0, {points:[[-2,0],[2,0]], props:{speed:.6, active:true, stopper:true, physicsMode:'dynamic', physicsMass:100}});
  const engine = new Engine(); engine.sync([belt]);
  const part = engine.spawn('carton', -1, 3 + BELT_TOP + .13, 0);
  tick(engine, .5);
  const fallingPose = engine.getPhysicsPose(belt.id)!;
  near(part.y - part.hy, fallingPose.position[1] + BELT_TOP, .04, `${kind} workpiece follows the falling support`);
  tick(engine, 2.5);
  const rt = engine.conveyors.get(belt.id)!, pose = engine.getPhysicsPose(belt.id)!;
  assert.ok(pose.position[1] < .2, `${kind} falls and lands`);
  assert.ok(part.x > .5 && part.x < 1, `${kind} still transports its part with physics enabled: ${part.x}`);
  assert.equal(part.support, 2, `${kind} still supports the part`);
  near(part.y - part.hy, rt.query(part.x, part.z)!.y, .04, `${kind} part rests on live belt`);
  engine.sync([{...belt, props:{...belt.props, active:false}}]);
  const stoppedAt = part.x; tick(engine, 1);
  assert.ok(Math.abs(part.x - stoppedAt) < .06, `${kind} motor still stops`);
  engine.sync([{...belt, props:{...belt.props, active:true}}]);
  tick(engine, 5);
  assert.ok(part.x < 1.9 && part.x > 1.5, `${kind} stopper retains part after restart`);
}

// Adaptive support refresh also considers rotation at the far end of a long
// moving conveyor, rather than only displacement of its origin.
{
  const belt = makeItem('conveyor', [0,5,0], 0, {points:[[-6,0],[6,0]], props:{active:false, physicsMode:'dynamic', physicsMass:500}});
  const engine = new Engine(); engine.sync([belt]);
  const part = engine.spawn('carton', 5, 5 + BELT_TOP + .13, 0);
  engine.rigidBodies.body(belt.id)!.angularVelocity.set(0, 0, .4);
  engine.setRunning(true);
  for (let i=0; i<30; i++) {
    engine.step(DT);
    const live = new ConveyorRT({...belt, ...engine.getPhysicsPose(belt.id)!});
    const surface = live.query(part.x, part.z, part.y - part.hy);
    assert.ok(surface?.inside, 'workpiece remains over rotating belt');
    near(part.y - part.hy, surface.y, .04, 'workpiece follows rotating belt');
  }
}

// The friction exemption is pair-specific: ordinary supports still slow a
// sliding workpiece, while the belt/workpiece contact stays tangentially free.
for (const kind of ['cabinet', 'conveyor', 'roller'] as const) {
  const isBelt = kind !== 'cabinet';
  const support = makeItem(kind, [0,0,0], 0, {props:{physicsMode:isBelt ? 'dynamic' : 'kinematic', physicsMass:100000, active:false}});
  const engine = new Engine(); engine.sync([support]);
  const top = isBelt ? BELT_TOP : 2;
  const part = engine.spawn('carton', -.3, top + .131, 0); part.vx = .8;
  // Advance a simple gravity prediction, then let the real contact bridge
  // correct it; no conveyor motor or other app-level damping is involved.
  for (let i=0; i<20; i++) {
    part.vy -= 9.81 * DT; part.x += part.vx * DT; part.y += part.vy * DT;
    engine.rigidBodies.step(DT, [part], () => 1);
  }
  near(part.y - part.hy, top, .04, `${kind} contact still supports workpiece`);
  assert.ok(isBelt ? part.vx > .7 : Math.abs(part.vx) < .1, `${kind} has the intended workpiece friction: ${part.vx}`);
}
// Belt surfaces do not become frictionless to other equipment.
for (const kind of ['cabinet', 'conveyor'] as const) {
  const top = kind === 'cabinet' ? 2 : BELT_TOP;
  const support = makeItem(kind, [0,0,0], 0, {props:{physicsMode:'kinematic', active:false}});
  const load = makeItem('cabinet', [0,top,0], 0, {scale:.2, props:{physicsMode:'dynamic', physicsMass:5}});
  const engine = new Engine(); engine.sync([support, load]);
  for (let i=0; i<30; i++) engine.rigidBodies.step(DT, [], () => 1);
  const body = engine.rigidBodies.body(load.id)!; body.velocity.set(.8, 0, 0); body.wakeUp();
  for (let i=0; i<20; i++) engine.rigidBodies.step(DT, [], () => 1);
  assert.ok(Math.abs(engine.getPhysicsPose(load.id)!.position[0]) < .04, `${kind} retains equipment-to-equipment friction`);
}

// Explicitly kinematic colliders affect workpieces too; collision impulses
// must stop a moving product rather than passing through the wall.
{
  const wall = makeItem('wall', [0, 0, 0], 0, {rotationZ: 15, props:{physicsMode:'kinematic'}});
  const engine = new Engine(); engine.sync([wall]);
  const part = engine.spawn('carton', 0, .8, 1.2); part.vz = -4;
  tick(engine, .45);
  assert.ok(part.z > .12, `part passed through rotated wall: z=${part.z}`);
}

// A functioning signal-driven feeder keeps its output and follows its body.
{
  const feeder = makeItem('feeder', [0, 4, 0], 0, {props:{active:true, interval:.5, product:'carton', physicsMode:'dynamic', physicsMass:8}});
  const button = makeItem('button', [4, 0, 0], 0, {props:{signal:false, connectedTo:feeder.id}});
  const engine = new Engine(); engine.sync([feeder, button]); tick(engine, 3);
  const pose = engine.getPhysicsPose(feeder.id)!; assert.ok(pose.position[1] < 1, 'feeder fell');
  engine.setButton(button.id, true); tick(engine, .5);
  assert.equal(engine.stats.spawned, 1, 'dynamic feeder responds to signal');
  assert.ok(engine.boxes[0].y < 2, 'part spawns at moving feeder, not original height');
}

// Imported assets keep their real dimensions, mass and identity through feeder,
// project archive and robot grip checks; hidden source models remain usable.
{
  const imported: ImportedModelData = {asset:{id:'tiny', entry:'part.stl', files:[{path:'part.stl', dataUrl:'data:application/octet-stream;base64,AA=='}]}, axis:'z', units:'mm', materials:[], meshCount:1, triangleCount:12, sourceSize:[300, 200, 100]};
  const source = makeItem('imported-model', [5,0,0], 0, {name:'Custom component', scale:2, visible:false, imported, props:{physicsMass:4}});
  const id = importedProductId(source);
  const feeder = makeItem('feeder', [0,0,0], 0, {props:{active:true, interval:.5, product:id}});
  const robot = makeItem('robot', [2,0,0], 0, {props:{payload:3, gripper:'vacuum'}});
  const engine = new Engine(); engine.sync([source, feeder, robot]);
  const product = getProduct(id, engine.items);
  assert.deepEqual(product.size, [.6, .2, .4]); assert.equal(product.mass, 4);
  tick(engine, 1); const part = engine.boxes[0]; assert.equal(part.productId, id); near(part.hy, .1, 1e-8, 'imported height');
  assert.equal(engine.canGrip(engine.robots.get(robot.id)!, part), false, 'weight affects robot payload');
  const text = serializeProject({projectName:'imports', layoutName:'imports', activeLayoutId:null, items:[source, feeder]});
  const items = parseProject(readProjectArchive(createProjectArchive(text))).items;
  assert.equal(items[1].props.product, id); assert.deepEqual(items[0].imported!.sourceSize, [300,200,100]);
  assert.deepEqual(getProduct(id, items).size, [.6,.2,.4]);
  const pallet=makeItem('crates',[0,0,4],0,{props:{product:id,cols:3,rows:2,layers:1,gap:.04,physicsMode:'kinematic'}});
  const physics=new Engine();physics.sync([source,pallet]);
  const width=()=>((physics.rigidBodies.body(pallet.id)!.shapes[0] as CannonBox).halfExtents.x*2);
  const oldWidth=width();physics.sync([{...source,scale:3},pallet]);
  assert.ok(width()>oldWidth+.8,'pallet collider updates when imported product size changes');
  getProduct(id,physics.items).size.forEach((v,i)=>near(v,[.9,.3,.6][i],1e-8,'updated imported size'));
}

// Coincident conveyor footprints remain separate physical layers.
{
  const lower=makeItem('conveyor',[0,0,0],0,{points:[[-2,0],[2,0]],props:{speed:.6,active:true,stopper:true}});
  const upper=makeItem('conveyor',[0,2,0],0,{points:[[-2,0],[2,0]],props:{speed:.6,active:true,stopper:true}});
  const engine=new Engine();engine.sync([lower,upper]);
  const a=engine.spawn('carton',-1.4,BELT_TOP+.13,0),b=engine.spawn('carton',-1.4,2+BELT_TOP+.13,0);
  tick(engine,2);
  assert.equal(a.convId,lower.id,'lower part remains on lower belt');
  assert.equal(b.convId,upper.id,'upper part remains on upper belt');
  near(a.y, BELT_TOP+a.hy,.04,'lower layer height');near(b.y, 2+BELT_TOP+b.hy,.04,'upper layer height');
  assert.ok(a.x>-.8&&b.x>-.8,'both layers move independently');
}

// Very long belts use bounded compound proxies instead of thousands of shapes.
{
  const belt=makeItem('conveyor',[0,0,0],0,{points:[[-100,0],[100,0]],props:{physicsMode:'dynamic',physicsMass:100}});
  const world=new RigidBodyWorld();world.sync([belt]);
  assert.ok(world.body(belt.id)!.shapes.length<=256,'long-belt collider complexity is capped');
}

// A real solver collision transfers momentum to another movable component;
// the same impulse accelerates a lighter component more than a heavier one.
{
  const light=makeItem('cabinet',[-.55,0,0],0,{props:{physicsMode:'dynamic',physicsMass:10}});
  const heavy=makeItem('cabinet',[.55,0,0],0,{props:{physicsMode:'dynamic',physicsMass:40}});
  const world=new RigidBodyWorld(); world.sync([light,heavy]);
  const a=world.body(light.id)!, b=world.body(heavy.id)!;
  a.applyImpulse(new CannonVec3(30,0,0)); const lightSpeed=a.velocity.x;
  b.applyImpulse(new CannonVec3(30,0,0)); const heavySpeed=b.velocity.x;
  assert.ok(lightSpeed > heavySpeed*3.9, 'mass changes acceleration for the same impulse');
  b.velocity.set(0,0,0);
  let transferred=0; for(let i=0;i<60;i++){world.step(1/60,[],()=>1);transferred=Math.max(transferred,b.velocity.x);}
  assert.ok(transferred>.1, 'dynamic components transfer collision momentum');
  assert.ok(world.pose(light.id)!.position[0] < world.pose(heavy.id)!.position[0], 'colliding bodies do not pass through each other at ordinary speeds');
}

// Both the lightweight and dynamic worker paths can climb the stepped flight,
// walk out onto the elevated deck, and keep their normal patrol behavior.
for (const mode of ['kinematic','dynamic'] as const) {
  const flight=makeItem('stairs',[0,0,0],0,{props:{width:1.5,length:4,height:2}});
  const deck=makeItem('platform',[4,0,0],0,{props:{width:4,depth:4,height:2}});
  const worker=makeItem('operator',[-2.2,0,0],0,{points:[[0,0],[6,0]],props:{task:'patrol',walkSpeed:1,physicsMode:mode,physicsMass:80}});
  const e=new Engine();e.sync([flight,deck,worker]);e.setRunning(true);tick(e,7);
  const person=e.humans.get(worker.id)!;
  assert.ok(person.x>2.2 && person.y>1.9, `${mode} worker reaches the deck via stairs`);
  assert.equal(person.status,'patrol');
  near(e.rigidBodies.body(worker.id)!.position.x,person.x,.02,`${mode} worker collider follows navigation`);
}

// Enlarging stairs keeps risers walkable and simulation/collider dimensions aligned.
for (const mode of ['kinematic','dynamic'] as const) {
  const flight=makeItem('stairs',[0,0,0],0,{scale:2,props:{width:1.5,length:4,height:2}});
  const deck=makeItem('platform',[8,0,0],0,{scale:2,props:{width:4,depth:4,height:2}});
  const worker=makeItem('operator',[-4.2,0,0],0,{points:[[0,0],[12,0]],props:{task:'patrol',walkSpeed:1,physicsMode:mode,physicsMass:80}});
  const engine=new Engine();engine.sync([flight,deck,worker]);tick(engine,12);
  const person=engine.humans.get(worker.id)!;
  assert.ok(person.x>4.2&&person.y>3.9, `${mode} worker can climb scaled stairs`);
}

// The normal robot input queue, work cycle and operation-end output survive
// dynamic rigid-body motion and runtime support/index refreshes.
{
  const belt=makeItem('conveyor',[-2,0,0],0,{points:[[0,0],[1,0],[2,0]],props:{speed:.6,active:true,stopper:true}});
  const pallet=makeItem('crates',[-.3,0,2.9],0,{props:{product:'carton',cols:3,rows:2,layers:4,gap:.04}});
  const feeder=makeItem('feeder',[6,0,0],0,{props:{active:true,product:'carton',interval:.5}});
  const plc=makeItem('plc',[7,0,0],0,{props:{connectedTo:feeder.id}});
  const robot=makeItem('robot',[.3,0,1.45],0,{props:{gripper:'vacuum',speed:70,outputMode:'operation-end',connectedTo:plc.id,physicsMode:'dynamic',physicsMass:100},program:{mode:'palletize',sourceId:belt.id,targetId:pallet.id,repeat:true,delay:0,clearance:.3}});
  const button=makeItem('button',[-4,0,0],0,{props:{signal:false,connectedTo:robot.id}});
  const e=new Engine();e.sync([belt,pallet,feeder,plc,robot,button]);e.spawn('carton',-.35,BELT_TOP+.13,0);e.setRunning(true);tick(e,5);
  assert.equal(e.robots.get(robot.id)!.cycles,0,'dynamic robot still waits for a signal');
  e.setButton(button.id,true);e.setButton(button.id,false);tick(e,15);
  assert.equal(e.robots.get(robot.id)!.cycles,1,'dynamic robot completes the original work cycle');
  assert.equal(e.stats.spawned,2,'robot operation-end signal reaches its connected feeder');
}

console.log('physics 3D: slopes, tilted supports, sleeping/collisions, stairs, dynamic robot/signals and imported products OK');
