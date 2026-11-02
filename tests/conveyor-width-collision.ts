import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {Engine, BELT_TOP} from '../src/sim/engine';
import {buildFloorPlan} from '../src/utils/floorPlan';
import {parseProject, serializeProject} from '../src/utils/project';

const belt = makeItem('conveyor', [0,0,0], 0, {points:[[-4,0],[4,0]], props:{width:2,speed:5,active:true,physicsMode:'kinematic'}});
const probe = makeItem('cabinet',[0,10,10],0,{props:{physicsMode:'dynamic'}});
const engine = new Engine(); engine.sync([belt,probe]);
const runtime = engine.conveyors.get(belt.id)!;
assert.equal(runtime.half,1);
assert.ok(runtime.query(0,.9)?.inside, 'custom width supports workpieces off the original narrow belt');
assert.equal(runtime.query(0,1.05)?.inside,false);
assert.equal(buildFloorPlan([belt]).paths[0].width,2);
assert.equal(runtime.speed,5, 'speed is not restricted to the old slider range');
const part = engine.spawn('carton',-3,BELT_TOP+.13,.8);
engine.setRunning(true); for(let i=0;i<12;i++) engine.step(1/60);
assert.ok(part.x > -2.4, `wide belt moves a part near its edge at high speed: ${part.x}`);
const body = engine.rigidBodies.body(belt.id)!;
assert.ok(body.shapes.length <= 13, `straight conveyor collision surface is welded: ${body.shapes.length} shapes`);

const items = Array.from({length:650}, (_,i) => makeItem('feeder',[i,0,0]));
items[0].signalTargets = items.slice(1).map(item => item.id);
const project = parseProject(serializeProject({items,projectName:'Large',layoutName:'Large',activeLayoutId:null}));
assert.equal(project.items.length,650,'projects no longer reject over 500 components');
assert.equal(project.items[0].signalTargets?.length,649,'connections are not artificially limited');
console.log('conveyor width, welded physics, unrestricted speed and large projects OK');
