import assert from 'node:assert/strict';
import { defaultComponentGraph, compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, findCycles, makeNode, parseGraph, removeNode, serializeGraph, setParam } from '../src/gen/graph/graph';
import { attachPickupSensorToLink, ensurePickupSensor, upgradePickupSensors } from '../src/gen/graph/pickupSensors';
import { channelColor, channelMode, setChannel, signalRows } from '../src/gen/graph/signal';
import { copyGraphSelection, pasteGraphSelection } from '../src/gen/graph/layout';
import { makeItem } from '../src/data/library';
import { Engine, BELT_TOP } from '../src/sim/engine';
import { signalChannelKey } from '../src/utils/signalChannels';
import { signalTargets, signalTargetsPatch } from '../src/utils/signalPorts';
import { serializeProject, parseProject } from '../src/utils/project';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';
import type { NodeGraph } from '../src/gen/graph/types';

const wire = (graph:NodeGraph, from:string, out:string, to:string, input:string) => {
  const result = connect(graph,{node:from,port:out},{node:to,port:input});
  assert.ok(result.ok,result.error); return result.graph;
};
const tick = (engine:Engine,n=1) => { for (let i=0;i<n;i++) engine.step(1/60); };

// Starter sensors are graph nodes, with actual signal wires as well as the
// independent, direct material-flow edge. They compile at robot pickup points.
const starter = defaultComponentGraph();
assert.equal(starter.signalSchema,2);
const graphSensors = starter.nodes.filter(node => node.type === 'part.laser');
assert.equal(graphSensors.length,2);
for (const sensor of graphSensors) {
  const input = starter.links.find(link => link.to.node === sensor.id && link.to.port === 'mount');
  const output = starter.links.find(link => link.from.node === sensor.id && link.from.port === 'signal-out-1');
  assert.ok(input && output);
  assert.equal(starter.nodes.find(node => node.id === input.from.node)?.type,'part.conveyor');
  assert.equal(starter.nodes.find(node => node.id === output.to.node)?.type,'part.robot');
  assert.ok(starter.links.some(link => link.from.node === input.from.node && link.from.port === 'out' && link.to.node === output.to.node && link.to.port === 'in'));
  assert.deepEqual(signalRows(starter,sensor),[1,2],'connected row grows a new pair');
}
const defaultPlant = compileComponentGraph(starter).plant!;
assert.ok(defaultPlant);
for (const sensor of defaultPlant.items.filter(item => item.kind === 'laser')) {
  const robot = defaultPlant.items.find(item => item.program && signalTargets(sensor).includes(item.id));
  const belt = defaultPlant.items.find(item => item.id === sensor.props.mountedTo);
  assert.ok(robot && belt);
  assert.equal(robot.program!.sourceId,belt.id);
  assert.ok(Number(sensor.props.mountPosition) > .8,'detector is near the end of its pickup conveyor');
}
const deleted = removeNode(starter,graphSensors[0].id);
assert.equal(compileComponentGraph(deleted).plant?.items.filter(item => item.kind === 'laser').length,1,'deleting an explicit sensor never resurrects a hidden one');

// Old v1 graphs are migrated once; proximity and no-sensor preferences remain.
const robots = starter.nodes.filter(node => node.type === 'part.robot');
const old:NodeGraph = {
  version:1,
  nodes:starter.nodes.filter(node => !graphSensors.includes(node)).map(node => node.id === robots[0].id ? {...node,params:{...node.params,detection:'proximity'}} : node.id === robots[1].id ? {...node,params:{...node.params,detection:'none'}} : node),
  links:starter.links.filter(link => !graphSensors.some(sensor => sensor.id === link.from.node || sensor.id === link.to.node)),
};
const upgraded = upgradePickupSensors(parseGraph(old));
assert.equal(upgraded.nodes.filter(node => node.type === 'part.sensor').length,1);
assert.equal(upgraded.nodes.filter(node => node.type === 'part.laser').length,0);
assert.equal(upgradePickupSensors(upgraded),upgraded,'migration is idempotent');
const duplicate = parseGraph({...old,nodes:[...old.nodes,{...old.nodes[0],type:'part.laser'}]});
assert.equal(new Set(duplicate.nodes.map(node => node.id)).size,duplicate.nodes.length,'duplicate saved node IDs cannot alias a detector');
assert.equal(duplicate.nodes[0].id,old.nodes[0].id,'the original node retains existing links');
assert.equal(compileComponentGraph(old).plant?.items.filter(item => item.kind === 'sensor').length,1,'legacy graphs build with migrated detection');

// Reconnecting a robot's material source moves its automatic sensor to the new
// belt without touching manual signal wires or making duplicate sensors.
const belt = starter.nodes.find(node => node.type === 'part.conveyor')!;
const robot = robots[0];
const inserted = makeNode('part.conveyor',600,400);
let rewired:NodeGraph = {...starter,nodes:[...starter.nodes,inserted],links:starter.links.filter(link => !(link.from.node === belt.id && link.from.port === 'out' && link.to.node === robot.id && link.to.port === 'in'))};
rewired = wire(rewired,belt.id,'out',inserted.id,'in');
rewired = wire(rewired,inserted.id,'out',robot.id,'in');
rewired = ensurePickupSensor(rewired,inserted.id,robot.id);
const movedSensor = rewired.nodes.find(node => node.id === graphSensors[0].id)!;
assert.ok(rewired.links.some(link => link.from.node === inserted.id && link.to.node === movedSensor.id && link.to.port === 'mount'));
const movedPlant = compileComponentGraph(rewired).plant!;
const tend = movedPlant.items.find(item => item.program?.mode === 'tend')!;
const detector = movedPlant.items.find(item => item.kind === 'laser' && signalTargets(item).includes(tend.id))!;
assert.equal(detector.props.mountedTo,tend.program!.sourceId);

// Dropping a loose sensor onto a material link adds signal wiring without
// replacing that material link or an existing robot input.
{
  const loose = makeNode('part.sensor',500,500,{radius:1.2});
  const base:NodeGraph = {...starter,nodes:[...starter.nodes,loose]};
  const material = base.links.find(link => link.from.node === belt.id && link.from.port === 'out' && link.to.node === robot.id && link.to.port === 'in')!;
  const attached = attachPickupSensorToLink(base,loose.id,material.id);
  assert.ok(attached.ok);
  assert.ok(attached.graph.links.some(link => link.id === material.id),'material wire remains intact');
  assert.ok(attached.graph.links.some(link => link.from.node === belt.id && link.to.node === loose.id && link.to.port === 'mount'));
  assert.ok(attached.graph.links.some(link => link.from.node === loose.id && link.to.node === robot.id && link.to.port === 'signal-in-2'));
  assert.equal(attached.graph.nodes.find(node => node.id === loose.id)?.params.radius,1.2);
}

// Independent functions, inherited/per-output colours and port numbers survive
// graph export, parse, copy/paste and scene project/archive serialization.
let settings = setParam(starter,graphSensors[0].id,'wireColor','#123456');
settings = setParam(settings,graphSensors[0].id,'range',1.75);
settings = setParam(settings,graphSensors[0].id,'autoRange',false);
settings = setParam(settings,graphSensors[0].id,'normallyClosed',true);
settings = setChannel(settings,graphSensors[0].id,1,{mode:'clear'});
settings = setChannel(settings,graphSensors[0].id,2,{mode:'relay',color:'#ff9900'});
const restored = parseGraph(serializeGraph(settings));
const restoredSensor = restored.nodes.find(node => node.id === graphSensors[0].id)!;
assert.equal(channelColor(restoredSensor,1),'#123456');
assert.equal(channelColor(restoredSensor,2),'#ff9900');
assert.equal(channelMode(restoredSensor,1),'clear');
assert.equal(channelMode(restoredSensor,2),'relay');
const copy = pasteGraphSelection(restored,copyGraphSelection(restored,[restoredSensor.id]));
assert.deepEqual(copy.nodes[0].io,restoredSensor.io);
const compiledSettings = compileComponentGraph(restored).plant!;
const editedLaser = compiledSettings.items.find(item => item.kind === 'laser' && item.props.wireColor === '#123456')!;
assert.equal(editedLaser.props.range,1.75,'authored mounted range is not overwritten by automatic width fitting');
assert.equal(editedLaser.props.normallyClosed,true);
assert.equal(editedLaser.signalChannels?.find(channel => channel.port === 2)?.color,'#ff9900');
const disk = serializeProject({projectName:'I/O',layoutName:'Signals',activeLayoutId:null,items:compiledSettings.items});
const loaded = parseProject(readProjectArchive(createProjectArchive(disk)));
assert.deepEqual(loaded.items.find(item => item.id === editedLaser.id)?.signalChannels,editedLaser.signalChannels);
assert.deepEqual(loaded.items.find(item => item.id === editedLaser.id)?.signalRoutes,editedLaser.signalRoutes);
assert.deepEqual(signalTargets(loaded.items.find(item => item.id === editedLaser.id)!),signalTargets(editedLaser));
const patched = {...editedLaser,...signalTargetsPatch(editedLaser,[])};
assert.equal(signalTargets(patched).length,0,'scene disconnect removes generated routes too');

// Runtime signal feedback is legal; material loops and mixed port types remain invalid.
const feederNode = starter.nodes.find(node => node.type === 'part.feeder')!;
const feedback = connect(starter,{node:robots[1].id,port:'signal-out-1'},{node:feederNode.id,port:'signal-in-1'});
assert.ok(feedback.ok,feedback.error);
assert.deepEqual(findCycles(feedback.graph),[]);
assert.ok(compileComponentGraph(feedback.graph).plant,'signal feedback does not invalidate material topology');
assert.equal(connect(starter,{node:robot.id,port:'out'},{node:belt.id,port:'in'}).ok,false,'material cycle rejected');
assert.equal(connect(starter,{node:robot.id,port:'signal-out-1'},{node:belt.id,port:'in'}).ok,false,'signal cannot enter material input');
const sparse = wire(starter,graphSensors[0].id,'signal-out-1000000',feederNode.id,'signal-in-1000000');
assert.deepEqual(signalRows(sparse,sparse.nodes.find(node => node.id === graphSensors[0].id)!),[1,2,1000000,1000001]);
assert.equal(parseGraph(serializeGraph(sparse)).links.length,sparse.links.length,'sparse ports parse without allocating a million rows');

// Two independent PLC channels relay and invert different inputs to different
// feeders. A short pulse is queued even if it ends before the simulation step.
const f1 = makeItem('feeder',[0,0,0],0,{props:{interval:.5,active:true,product:'carton'},signalChannels:[{port:1,mode:'spawned'}]});
const f2 = makeItem('feeder',[5,0,0],0,{props:{interval:.5,active:true,product:'carton'},signalChannels:[{port:1,mode:'spawned'}]});
const plc = makeItem('plc',[2,0,0],0,{signalChannels:[{port:1,mode:'relay',color:'#ff0000'},{port:2,mode:'invert',color:'#00ff00'}],signalRoutes:[{output:1,targetId:f1.id,input:1},{output:2,targetId:f2.id,input:1}]});
const b1 = makeItem('button',[-3,0,0],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:plc.id,input:1}]});
const b2 = makeItem('button',[8,0,0],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:plc.id,input:2}]});
const e = new Engine(); e.sync([f1,f2,plc,b1,b2]); e.setRunning(true); tick(e,10);
assert.equal(e.stats.spawned,1,'inverted connected input starts high once');
assert.equal(e.signalState.get(signalChannelKey(plc.id,1)),false);
assert.equal(e.signalState.get(signalChannelKey(plc.id,2)),true);
e.setButton(b1.id,true); tick(e,3);
assert.equal(e.stats.spawned,2,'first PLC channel triggers its feeder independently');
assert.equal(e.signalState.get(signalChannelKey(plc.id,1)),true);
e.setButton(b2.id,true); tick(e,3);
assert.equal(e.signalState.get(signalChannelKey(plc.id,2)),false,'second PLC function is independently inverted');
e.boxes.length = 0; tick(e,35); e.setButton(b2.id,false); tick(e,4);
assert.equal(e.stats.spawned,3,'second channel produces a new rising edge on release');
const beforeEdit = e.stats.spawned;
e.sync([f1,f2,{...plc,props:{...plc.props,wireColor:'#abcdef'}},b1,b2]); tick(e,60);
assert.equal(e.stats.spawned,beforeEdit,'unrelated scene edits do not replay channel edges');

// A pickup sensor can be enabled by one input and provides independent detected
// and clear outputs. It sees a part only while its input is high.
const gatedBelt = makeItem('conveyor',[0,0,0],0,{points:[[-2,0],[2,0]],props:{active:false}});
const proximity = makeItem('sensor',[0,0,0],0,{props:{mountedTo:gatedBelt.id,mountPosition:.5,radius:.5},signalChannels:[{port:1,mode:'detected'},{port:2,mode:'clear'}]});
const gate1 = makeItem('button',[-3,0,0],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:proximity.id,input:1},{output:1,targetId:proximity.id,input:2}]});
const p = new Engine(); p.sync([gatedBelt,proximity,gate1]); p.spawn('glass',0,BELT_TOP+.13,0); p.setRunning(true); tick(p,5);
assert.equal(p.signalState.get(signalChannelKey(proximity.id,1)),false,'disabled sensor output is low');
p.setButton(gate1.id,true); tick(p,4);
assert.equal(p.signalState.get(signalChannelKey(proximity.id,1)),true,'enabled proximity sees transparent part');
assert.equal(p.signalState.get(signalChannelKey(proximity.id,2)),false);
p.boxes.length=0; tick(p,3);
assert.equal(p.signalState.get(signalChannelKey(proximity.id,1)),false);
assert.equal(p.signalState.get(signalChannelKey(proximity.id,2)),true,'separate clear output responds independently');
p.setButton(gate1.id,false); tick(p,3);
assert.equal(p.signalState.get(signalChannelKey(proximity.id,2)),false,'disabled clear output is also low');

// Short manual pulses survive between engine steps in a numbered channel too.
{
  const feeder = makeItem('feeder',[0,0,0],0,{props:{interval:.5,active:true,product:'carton'},signalChannels:[{port:1,mode:'spawned'}]});
  const button = makeItem('button',[-2,0,0],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:feeder.id,input:1}]});
  const engine = new Engine(); engine.sync([feeder,button]); engine.setRunning(true);
  engine.setButton(button.id,true); engine.setButton(button.id,false); tick(engine);
  assert.equal(engine.stats.spawned,1,'short numbered button pulse is queued');
  engine.boxes.length=0; tick(engine,80); assert.equal(engine.stats.spawned,1);
}

// Machine inputs gate the start of a cycle but do not interrupt an ongoing one.
{
  const machine = makeItem('cnc',[0,0,0],0,{props:{cycleTime:.5,inputProduct:'any',outputProduct:'machined'},signalChannels:[{port:1,mode:'busy'},{port:2,mode:'ready'}]});
  const button = makeItem('button',[-3,0,0],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:machine.id,input:1}]});
  const engine = new Engine(); engine.sync([machine,button]); engine.setRunning(true);
  const rt = engine.machines.get(machine.id)!, table=rt.table();
  const part=engine.spawn('billet',table.x,table.y+.13,table.z);
  assert.equal(engine.process(rt,part),false,'low machine input prevents starting');
  engine.setButton(button.id,true); assert.equal(engine.process(rt,part),true);
  tick(engine,2); assert.equal(engine.signalState.get(signalChannelKey(machine.id,1)),true);
  assert.equal(engine.signalState.get(signalChannelKey(machine.id,2)),false);
  engine.setButton(button.id,false); tick(engine,45);
  assert.equal(rt.busy,false,'already-started cycle finishes even if input drops');
  assert.equal(engine.signalState.get(signalChannelKey(machine.id,2)),true);
}

// Two robot outputs can report motion and operation completion independently.
{
  const multi = setChannel(setChannel(starter,robots[0].id,1,{mode:'moving'}),robots[0].id,2,{mode:'operation-end'});
  const plant = compileComponentGraph(multi).plant!;
  const robot = plant.items.find(item => item.program?.mode === 'tend')!;
  const engine = new Engine(); engine.sync(plant.items); engine.setRunning(true);
  assert.equal(robot.props.outputMode,'moving','legacy robot output matches numbered channel 1');
  let moving=false, complete=false;
  for (let i=0;i<100*60 && !(moving && complete);i++) {
    engine.step(1/60); await Promise.resolve(); await Promise.resolve();
    moving ||= engine.signalState.get(signalChannelKey(robot.id,1)) === true;
    complete ||= engine.signalState.get(signalChannelKey(robot.id,2)) === true;
  }
  assert.ok(moving && complete,'moving and operation-end outputs both emit their own states');
}

// A continuously blocked pickup beam must not strand a queue of touching
// workpieces. Sensor presence remains a level gate even after its first edge;
// push-buttons and other trigger sources still queue discrete rising edges.
{
  const engine = new Engine(); engine.sync(defaultPlant.items); engine.setRunning(true);
  for (let i=0;i<180*60;i++) { engine.step(1/60); await Promise.resolve(); await Promise.resolve(); }
  assert.ok(engine.stats.placed >= 7,`starter graph stopped producing: ${JSON.stringify(engine.stats)}`);
  assert.ok(engine.stats.events.some(time => time > 120),`no production after 120 seconds: ${JSON.stringify(engine.stats)}`);
  assert.equal(engine.stats.lost,0);
}

// Real feedback: one manually seeded part travels through the factory, then a
// robot operation-end channel requests the next part from the upstream feeder.
const seed = makeNode('part.button',0,400,{signal:true,wireColor:'#3344ff'});
let loop:NodeGraph = {...starter,nodes:[...starter.nodes,seed]};
loop = wire(loop,seed.id,'signal-out-1',feederNode.id,'signal-in-1');
loop = wire(loop,robots[0].id,'signal-out-1',feederNode.id,'signal-in-2');
const loopPlant = compileComponentGraph(loop).plant;
assert.ok(loopPlant);
const feedbackSim = new Engine(); feedbackSim.sync(loopPlant.items); feedbackSim.setRunning(true);
for (let i=0;i<180*60;i++) { feedbackSim.step(1/60); await Promise.resolve(); await Promise.resolve(); }
assert.ok(feedbackSim.stats.spawned>=2,`feedback failed to request more parts: ${JSON.stringify(feedbackSim.stats)}`);
assert.ok(feedbackSim.stats.placed>0,`feedback line did not produce: ${JSON.stringify(feedbackSim.stats)}`);
console.log('factory graph signal nodes: migration, placement, I/O growth, modes, feedback, colors, runtime and archive OK');
