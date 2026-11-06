import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {Engine, BELT_TOP} from '../src/sim/engine';
import {programToCode} from '../src/sim/programCode';
import {canSignalInput} from '../src/utils/signalPorts';
import {serializeProject,parseProject} from '../src/utils/project';
import {copySceneItems} from '../src/utils/sceneClipboard';
import {defaultComponentGraph,compileComponentGraph} from '../src/gen/graph/componentCompile';
import {connect,makeNode} from '../src/gen/graph/graph';
import {setChannel} from '../src/gen/graph/signal';
import type {RobotProgram} from '../src/types';

async function tick(e:Engine,seconds:number) {for(let i=0;i<seconds*60;i++){e.step(1/60);await Promise.resolve();await Promise.resolve();}}
function scene(retainFull=true) {
  const belt=makeItem('conveyor',[-2,0,0],0,{points:[[0,0],[1,0],[2,0]],props:{speed:.6,active:false,stopper:true}});
  const a=makeItem('crates',[-.9,0,2.9],0,{name:'First',props:{product:'carton',cols:2,rows:1,layers:1,retainFull}});
  const b=makeItem('crates',[1,0,2.9],0,{name:'Second',props:{product:'carton',cols:2,rows:1,layers:1,retainFull}});
  const program:RobotProgram={mode:'palletize',sourceId:belt.id,targetId:a.id,targetIds:[a.id,b.id],repeat:true,delay:0,clearance:.3};
  const robot=makeItem('robot',[.3,0,1.45],0,{props:{gripper:'vacuum',speed:70},program});
  return {belt,a,b,program,robot};
}
// Visual and generated-script programs both fill one pallet fully before the
// next, including after the first has automatically been swapped out.
for (const script of [false,true]) for (const retain of [true,false]) {
  const {belt,a,b,robot,program}=scene(retain);
  if(script){robot.script=programToCode(program);robot.program=undefined;}
  const e=new Engine();e.sync([belt,a,b,robot]);e.setRunning(true);
  for(let n=0;n<4;n++) {
    e.spawn('carton',-.35,BELT_TOP+.13,0);await tick(e,18);
    const second=e.pallets.get(b.id)!;
    assert.equal(e.robots.get(robot.id)!.cycles,n+1,`${script?'script':'visual'} completed ${n+1}; ${e.robots.get(robot.id)?.error}`);
    assert.equal(second.cursor + second.shipped*second.capacity,Math.max(0,n-1),`${script?'script':'visual'} second pallet advances only after first fills, retain=${retain}, n=${n}`);
  }
}
// A high red output from a different part cannot route an unobserved brown part.
{
 const {belt,a,b,robot}=scene();
 const sensor=makeItem('color-sensor',[-1.5,0,0],0,{props:{range:.2},signalChannels:[{port:1,mode:'match',material:'#d84d38'},{port:2,mode:'match',material:'#b89a6c'}],signalRoutes:[{output:1,targetId:a.id,input:1},{output:2,targetId:b.id,input:1}]});
 assert.ok(canSignalInput(a,sensor.id),'ordinary scene pallets accept signal input');
 const e=new Engine();e.sync([belt,a,b,robot,sensor]);e.setRunning(true);
 const red=e.spawn('apple',-1.5,BELT_TOP+.095,0);await tick(e,1);
 const brown=e.spawn('carton',-.35,BELT_TOP+.13,0);await tick(e,10);
 assert.equal(e.robots.get(robot.id)!.cycles,0,'a different part keeping red high cannot misroute brown');
 brown.x=-1.5; red.x=-1.9; await tick(e,1);brown.x=-.35;await tick(e,20);
 assert.equal(e.pallets.get(b.id)!.cursor,1,'brown observed by output 2 is routed to second pallet');
 assert.equal(e.pallets.get(a.id)!.cursor,0);
}
// Multiple material flow edges compile to separate, reachable pallet instances.
{
 let graph=defaultComponentGraph(); const first=graph.nodes.find(n=>n.type==='part.pallet')!;
 const link=graph.links.find(l=>l.to.node===first.id&&l.to.port==='in')!;
 const second=makeNode('part.pallet',first.x,first.y+300);
 graph={...graph,nodes:[...graph.nodes,second]};
 const result=connect(graph,link.from,{node:second.id,port:'in'});assert.ok(result.ok,result.error);graph=result.graph;
 const compiled=compileComponentGraph(graph);assert.ok(compiled.plant,compiled.diagnostics.map(d=>d.message).join('; '));
 const pallets=compiled.plant.items.filter(i=>i.kind==='crates');const robot=compiled.plant.items.find(i=>i.program?.targetIds?.length===2)!;
 assert.equal(pallets.length,2);assert.equal(new Set(pallets.map(p=>`${p.position[0]},${p.position[2]}`)).size,2);
 assert.deepEqual(robot.program!.targetIds!.slice().sort(),pallets.map(p=>p.id).sort());
 const loaded=parseProject(serializeProject({projectName:'multi',layoutName:'multi',activeLayoutId:null,items:compiled.plant.items}));
 assert.deepEqual(loaded.items.find(i=>i.id===robot.id)!.program!.targetIds,robot.program!.targetIds);
 const copies=copySceneItems([robot,...pallets],[0,0,5]);
 assert.deepEqual(copies[0].program!.targetIds!.slice().sort(),copies.slice(1).map(i=>i.id).sort(),'scene copy remaps every pallet target');
}
// Build a real node graph with two signal-wired pallets, then run the
// compiled scene end-to-end. Independent output ports must route each part.
{
 let graph=defaultComponentGraph();
 const first=graph.nodes.find(n=>n.type==='part.pallet')!;
 const robotLink=graph.links.find(l=>l.to.node===first.id&&l.to.port==='in')!;
 const robotNode=graph.nodes.find(n=>n.id===robotLink.from.node)!;
 const beltLink=graph.links.find(l=>l.to.node===robotNode.id&&l.to.port==='in')!;
 const second=makeNode('part.pallet',first.x,first.y+300,{cols:1,rows:1,layers:1});
 const color=makeNode('part.color-sensor',400,500,{mountPosition:.6});
 graph={...graph,nodes:[...graph.nodes,second,color]};
 for(const [from,to] of [[robotLink.from,{node:second.id,port:'in'}],[{node:beltLink.from.node,port:'attach'},{node:color.id,port:'mount'}],[{node:color.id,port:'signal-out-1'},{node:first.id,port:'signal-in-1'}],[{node:color.id,port:'signal-out-2'},{node:second.id,port:'signal-in-1'}]] as const) {
   const result=connect(graph,from,to);assert.ok(result.ok,result.error);graph=result.graph;
 }
 graph=setChannel(graph,color.id,1,{material:'#d84d38'});graph=setChannel(graph,color.id,2,{material:'#b89a6c'});
 const compiled=compileComponentGraph(graph);assert.ok(compiled.plant,compiled.diagnostics.map(d=>d.message).join('; '));
 const items=compiled.plant.items;
 const sensor=items.find(i=>i.kind==='color-sensor')!, sorter=items.find(i=>i.program?.targetIds?.length===2)!;
 const pallets=sorter.program!.targetIds!;
 for(const item of items)if(item.kind==='feeder')item.props.active=false;else if(item.kind==='crates')item.props.retainFull=true;
 const e=new Engine();e.sync(items);e.setRunning(true);
 for(const [product,expected] of [['apple',pallets[0]],['carton',pallets[1]]] as const) {
   const p=e.spawn(product,sensor.position[0],BELT_TOP+(product==='apple'?.095:.13),sensor.position[2]);
   await tick(e,.2);
   const belt=e.conveyors.get(sorter.program!.sourceId)!,pickup=belt.pointAt(belt.length-.3);
   p.x=pickup.x;p.z=pickup.z;p.y=pickup.y+p.hy;p.vx=p.vz=0;
   await tick(e,25);
   assert.equal(e.pallets.get(expected)!.cursor,1,`compiled ${product} reaches its matching pallet; ${e.robots.get(sorter.id)?.error}`);
 }
}
console.log('multi-pallet: graph, persistence, sequential visual/script filling and per-part color sorting OK');
