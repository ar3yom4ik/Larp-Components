import assert from 'node:assert/strict';
import { compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, makeNode } from '../src/gen/graph/graph';
import type { GraphNode, NodeGraph } from '../src/gen/graph/types';
import { Engine } from '../src/sim/engine';
import { parseProject, serializeProject } from '../src/utils/project';

function wire(graph:NodeGraph,from:GraphNode,to:GraphNode) {
  const result=connect(graph,{node:from.id,port:'out'},{node:to.id,port:'in'});
  assert.ok(result.ok,result.error); return result.graph;
}
for(const style of ['multi-head','side']) {
  const f1=makeNode('part.feeder',0,0,{product:'carton',interval:2});
  const f2=makeNode('part.feeder',0,100,{product:'billet',interval:2});
  const belt=makeNode('part.conveyor',300,0,{mergeStyle:style,length:8});
  const robot=makeNode('part.robot',600,0);
  const pallet=makeNode('part.pallet',900,0);
  let graph:NodeGraph={version:1,nodes:[f1,f2,belt,robot,pallet],links:[]};
  for(const [a,b] of [[f1,belt],[f2,belt],[belt,robot],[robot,pallet]]) graph=wire(graph,a,b);
  const result=compileComponentGraph(graph);
  assert.ok(result.plant,JSON.stringify(result.diagnostics));
  const target=result.plant.items.find(item=>item.props.mergeInputs===2)!;
  assert.ok(target); assert.equal(target.props.mergeStyle,style);
  assert.equal(result.plant.items.filter(item=>item.props.mergeTargetId===target.id).length,2,'two physical inlets are automatic');
  const sim=new Engine(); sim.sync(result.plant.items); sim.setRunning(true);
  const delivered:Record<string,number>={carton:0,billet:0};
  for(let i=0;i<100*60;i++) {
    sim.step(1/60);
    for(const box of sim.boxes) if(box.state==='free'&&box.convId===target.id&&box.convS>2.8) { delivered[box.productId]++; box.state='dead'; }
  }
  assert.ok(delivered.carton>=3&&delivered.billet>=3,`${style}: ${JSON.stringify(delivered)}`);
  assert.equal(sim.stats.lost,0);
}
// Robot outputs bind to the automatically generated nearby inlet, not a
// distant merge target outside robot reach.
{
  const feeders=['carton','billet'].map(product=>makeNode('part.feeder',0,0,{product,interval:3}));
  const belts=feeders.map(()=>makeNode('part.conveyor',0,0));
  const robots=feeders.map(()=>makeNode('part.robot',0,0));
  const shared=makeNode('part.conveyor',0,0,{length:8});
  const output=makeNode('part.robot',0,0),pallet=makeNode('part.pallet',0,0);
  let graph:NodeGraph={version:1,nodes:[...feeders,...belts,...robots,shared,output,pallet],links:[]};
  for(let i=0;i<2;i++){graph=wire(graph,feeders[i],belts[i]);graph=wire(graph,belts[i],robots[i]);graph=wire(graph,robots[i],shared);}
  graph=wire(graph,shared,output);graph=wire(graph,output,pallet);
  const result=compileComponentGraph(graph);
  assert.ok(result.plant,JSON.stringify(result.diagnostics));
  const target=result.plant.items.find(item=>item.props.mergeInputs===2)!;
  const incoming=result.plant.items.filter(item=>item.props.mergeTargetId===target.id);
  const inputPrograms=result.plant.items.filter(item=>item.program&&incoming.some(belt=>belt.id===item.program?.targetId));
  assert.equal(inputPrograms.length,2,'each robot places onto its own inlet');
  for(const robot of inputPrograms) {
    const inlet=incoming.find(item=>item.id===robot.program!.targetId)!;
    assert.ok(Math.hypot(inlet.position[0]+0.48-robot.position[0],inlet.position[2]-robot.position[2])<2.2);
  }
  const sim=new Engine();sim.sync(result.plant.items);sim.setRunning(true);
  const seen=new Set<string>();
  for(let i=0;i<180*60;i++) {
    sim.step(1/60); await Promise.resolve();
    for(const box of sim.boxes) if(box.state==='free'&&box.convId===target.id&&box.convS>2.8) {seen.add(box.productId);box.state='dead';}
  }
  assert.deepEqual([...seen].sort(),['billet','carton'],`both robot-fed inputs should deliver: ${JSON.stringify({seen:[...seen],stats:sim.stats,robots:[...sim.robots.values()].map(r=>({cycles:r.cycles,error:r.error}))})}`);
}
console.log('direct conveyor inputs: feeder and robot merges, automatic inlets and live flow OK');
// Multiple consumers can share one actual conveyor directly. Stations are
// placed on alternate sides and an extended belt, not overlapping robots.
for(const count of [2,3,4]) {
  const feeder=makeNode('part.feeder',0,0,{product:'carton',interval:1});
  const belt=makeNode('part.conveyor',0,0,{length:4,speed:0.6});
  const robots=Array.from({length:count},()=>makeNode('part.robot',0,0));
  const pallets=robots.map(()=>makeNode('part.pallet',0,0,{product:'carton'}));
  let graph:NodeGraph={version:1,nodes:[feeder,belt,...robots,...pallets],links:[]};
  graph=wire(graph,feeder,belt);
  for(let i=0;i<count;i++){graph=wire(graph,belt,robots[i]);graph=wire(graph,robots[i],pallets[i]);}
  const result=compileComponentGraph(graph);
  assert.ok(result.plant,JSON.stringify(result.diagnostics));
  const workers=result.plant.items.filter(item=>item.program);
  assert.equal(workers.length,count);
  assert.equal(new Set(workers.map(item=>item.program!.sourceId)).size,1,'workers use the same conveyor');
  assert.equal(new Set(workers.map(item=>`${item.position[0]}:${item.position[2]}`)).size,count,'workers do not overlap');
  assert.ok(workers.every(item=>item.program!.pickupBack!==undefined));
  const serialized=serializeProject({projectName:'Shared',layoutName:'Test',activeLayoutId:null,items:result.plant.items});
  const restored=parseProject(serialized).items;
  assert.deepEqual(restored.filter(item=>item.program).map(item=>item.program!.pickupBack),workers.map(item=>item.program!.pickupBack),'station offsets survive project save');
  const sim=new Engine();sim.sync(restored);sim.setRunning(true);
  for(let i=0;i<220*60;i++){sim.step(1/60);await Promise.resolve();}
  const cycles=[...sim.robots.values()].map(robot=>robot.cycles);
  assert.ok(cycles.every(cycle=>cycle>0),`${count} shared workers must all run: ${JSON.stringify({cycles,stats:sim.stats,robots:[...sim.robots.values()].map(r=>({error:r.error,status:r.status})),warnings:result.plant.warnings})}`);
}
console.log('shared conveyor consumers: automatically spaced stations and live operation OK');

// A human and a robot can also share the same conveyor, with safe navigation.
{
  const feeder=makeNode('part.feeder',0,0,{product:'carton',interval:2}), belt=makeNode('part.conveyor',0,0), robot=makeNode('part.robot',0,0), human=makeNode('part.human',0,0);
  const p1=makeNode('part.pallet',0,0,{product:'carton'}),p2=makeNode('part.pallet',0,0,{product:'carton'});
  let graph:NodeGraph={version:1,nodes:[feeder,belt,robot,human,p1,p2],links:[]};
  for(const [a,b] of [[feeder,belt],[belt,robot],[belt,human],[robot,p1],[human,p2]]) graph=wire(graph,a,b);
  const plant=compileComponentGraph(graph).plant; assert.ok(plant);
  const sim=new Engine();sim.sync(plant.items);sim.setRunning(true);
  for(let i=0;i<120*60;i++){sim.step(1/60);await Promise.resolve();}
  assert.ok([...sim.robots.values()][0].cycles>0);
  assert.ok([...sim.humans.values()][0].completed>0);
}
// Converting the generated visual programs to editable code retains the
// station offsets, reservations and access to the shared conveyor.
{
  const feeder=makeNode('part.feeder',0,0,{product:'carton',interval:1}),belt=makeNode('part.conveyor',0,0);
  const robots=Array.from({length:3},()=>makeNode('part.robot',0,0));
  const pallets=robots.map(()=>makeNode('part.pallet',0,0,{product:'carton'}));
  let graph:NodeGraph={version:1,nodes:[feeder,belt,...robots,...pallets],links:[]};
  graph=wire(graph,feeder,belt);for(let i=0;i<robots.length;i++){graph=wire(graph,belt,robots[i]);graph=wire(graph,robots[i],pallets[i]);}
  const plant=compileComponentGraph(graph).plant;assert.ok(plant);
  const scripted=plant.items.map(item=>item.program?{...item,program:undefined}:item);
  const sim=new Engine();sim.sync(scripted);sim.setRunning(true);
  for(let i=0;i<180*60;i++){sim.step(1/60);await Promise.resolve();await Promise.resolve();}
  const cycles=[...sim.robots.values()].map(robot=>robot.cycles);
  assert.ok(cycles.every(cycle=>cycle>0),`scripted shared stations must all run: ${JSON.stringify(cycles)}`);
}
console.log('shared conveyor: mixed people/robots and editable scripted workflows OK');
