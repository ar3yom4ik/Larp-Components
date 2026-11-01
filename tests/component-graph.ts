import assert from 'node:assert/strict';
import { defaultComponentGraph, compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, insertNodeInLink, makeNode } from '../src/gen/graph/graph';
import { Engine } from '../src/sim/engine';
const graph = defaultComponentGraph();
const result = compileComponentGraph(graph);
assert.ok(result.plant, JSON.stringify(result.diagnostics));
const items = result.plant.items;
assert.deepEqual(items.map(i=>i.kind).sort(), ['cnc','conveyor','conveyor','crates','feeder','robot','robot'].sort());
const robots=items.filter(i=>i.program);
assert.equal(robots[0].program?.mode,'tend');
assert.equal(robots[1].program?.mode,'palletize');
assert.equal(robots[0].program?.targetId, robots[1].program?.sourceId);
const engine=new Engine(); engine.sync(items); engine.setRunning(true);
for(let i=0;i<180*60;i++){engine.step(1/60);await Promise.resolve();await Promise.resolve();}
assert.ok(engine.stats.placed>0, `no output: ${JSON.stringify({stats:engine.stats,robots:[...engine.robots.values()].map(r=>({status:r.status,error:r.error})), warnings:result.diagnostics})}`);
const changed = {...graph,nodes:graph.nodes.map(n=>n.type==='part.machine'?{...n,params:{kind:'kiln',cycleTime:12}}:n)};
assert.ok(compileComponentGraph(changed).plant?.items.some(i=>i.kind==='kiln' && i.props.cycleTime===12));
const extra=makeNode('part.feeder',0,0);
assert.ok(compileComponentGraph({...graph,nodes:[...graph.nodes,extra]}).plant, 'a disconnected part should be inactive, not an error');
const robot=graph.nodes.find(n=>n.type==='part.robot')!;
const pallet=graph.nodes.find(n=>n.type==='part.pallet')!;
const rewired=connect(graph,{node:robot.id,port:'out'},{node:pallet.id,port:'in'});
assert.ok(rewired.ok);
assert.equal(compileComponentGraph(rewired.graph).plant,null, 'unsupported branch must not silently build');
// Two separate connected networks become two separate physical production lines.
const second = defaultComponentGraph();
const parallel = compileComponentGraph({version: 1, nodes:[...graph.nodes,...second.nodes], links:[...graph.links,...second.links]});
assert.ok(parallel.plant, JSON.stringify(parallel.diagnostics));
const parallelFeeders = parallel.plant.items.filter(i=>i.kind==='feeder');
assert.equal(parallelFeeders.length, 2);
assert.notEqual(parallelFeeders[0].position[2], parallelFeeders[1].position[2]);
const sim2 = new Engine(); sim2.sync(parallel.plant.items); sim2.setRunning(true);
for(let i=0;i<180*60;i++){sim2.step(1/60);await Promise.resolve();await Promise.resolve();}
assert.ok(sim2.stats.placed >= 2, `parallel lines did not produce: ${sim2.stats.placed}`);
assert.ok([...sim2.robots.values()].every(r=>r.cycles>0), 'each line must operate');

// Inserting a second physical conveyor changes the scene and its connection behavior.
const firstBelt = graph.nodes.find(n=>n.type==='part.conveyor')!;
const firstRobot = graph.nodes.find(n=>n.type==='part.robot')!;
const inserted = makeNode('part.conveyor', 0, 0, {length: 3, speed: 0.5});
let expanded = {...graph, nodes:[...graph.nodes, inserted], links:graph.links.filter(l=>!(l.from.node===firstBelt.id && l.to.node===firstRobot.id))};
expanded = connect(expanded,{node:firstBelt.id,port:'out'},{node:inserted.id,port:'in'}).graph;
expanded = connect(expanded,{node:inserted.id,port:'out'},{node:firstRobot.id,port:'in'}).graph;
const expandedPlant = compileComponentGraph(expanded).plant;
assert.ok(expandedPlant);
const belts = expandedPlant.items.filter(i=>i.kind==='conveyor');
assert.equal(belts.length,3);
assert.equal(belts[0].props.stopper,false);
assert.equal(belts[1].props.speed,0.5);
assert.equal(expandedPlant.items.find(i=>i.program?.mode==='tend')?.program?.sourceId,belts[1].id);
const sim3 = new Engine(); sim3.sync(expandedPlant.items); sim3.setRunning(true);
for(let i=0;i<200*60;i++){sim3.step(1/60);await Promise.resolve();await Promise.resolve();}
assert.ok(sim3.stats.placed > 0, `connected conveyors did not produce: ${JSON.stringify(sim3.stats)}`);
console.log('physical modules: binding, settings, topology and live product flow OK');

// Drop on an existing wire is atomic and keeps the original link on incompatibility.
const wire = graph.links.find(l=>l.from.node===firstBelt.id && l.to.node===firstRobot.id)!;
const loose = makeNode('part.conveyor', 0, 0);
const insertionBase = {...graph,nodes:[...graph.nodes,loose]};
const insertedWire = insertNodeInLink(insertionBase,loose.id,wire.id);
assert.ok(insertedWire.ok);
assert.ok(insertedWire.graph.links.some(l=>l.from.node===firstBelt.id && l.to.node===loose.id));
assert.ok(insertedWire.graph.links.some(l=>l.from.node===loose.id && l.to.node===firstRobot.id));
const bad = makeNode('part.machine',0,0);
assert.equal(insertNodeInLink({...graph,nodes:[...graph.nodes,bad]},bad.id,wire.id).ok,false);
// A human operator uses the same actual source, machine and target bindings.
const humanGraph = {...graph,nodes:graph.nodes.map(n=>n.id===firstRobot.id?{...n,type:'part.human',params:{walkSpeed:1.5}}:n)};
const humanPlant = compileComponentGraph(humanGraph).plant;
assert.ok(humanPlant);
const human = humanPlant.items.find(item=>item.kind==='operator');
assert.equal(human?.props.task,'tend');
const humanSim = new Engine(); humanSim.sync(humanPlant.items); humanSim.setRunning(true);
for(let i=0;i<240*60;i++){humanSim.step(1/60);await Promise.resolve();await Promise.resolve();}
assert.ok(humanSim.stats.placed>0, `human line not producing: ${JSON.stringify({stats:humanSim.stats,humans:[...humanSim.humans.values()].map(h=>({status:h.status,completed:h.completed})),logs:humanSim.logs.slice(-3)})}`);
