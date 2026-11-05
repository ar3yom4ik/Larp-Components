import assert from 'node:assert/strict';
import { makeItem } from '../src/data/library';
import { Engine } from '../src/sim/engine';
import { programToCode } from '../src/sim/programCode';
import { compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, makeNode } from '../src/gen/graph/graph';
import { setChannel } from '../src/gen/graph/signal';
import { parseProject, serializeProject } from '../src/utils/project';
import { copySceneItems } from '../src/utils/sceneClipboard';
import type { NodeGraph } from '../src/gen/graph/types';
import type { RobotProgram } from '../src/types';

async function tick(engine:Engine,seconds:number) { for(let i=0;i<seconds*60;i++){engine.step(1/60);await Promise.resolve();await Promise.resolve();} }
const source=makeItem('crates',[-.9,0,0],0,{name:'Stock',props:{cols:2,rows:1,layers:1,prefill:true,fillProducts:JSON.stringify(['apple','carton'])}});
const red=makeItem('crates',[-.9,0,2.9],0,{name:'Red',props:{cols:1,rows:1,layers:1,retainFull:true}});
const brown=makeItem('crates',[1,0,2.9],0,{name:'Brown',props:{cols:1,rows:1,layers:1,retainFull:true}});
const sensor=makeItem('color-sensor',[-1,0,1.9],0,{name:'Inspection',props:{range:.4},signalChannels:[{port:1,mode:'match',material:'#d84d38'},{port:2,mode:'match',material:'#b89a6c'}],signalRoutes:[{output:1,targetId:red.id,input:1},{output:2,targetId:brown.id,input:1}]});
const program:RobotProgram={mode:'palletize',sourceId:source.id,sourceKind:'pallet',targetId:red.id,targetIds:[red.id,brown.id],inspectSensorId:sensor.id,repeat:true,delay:0,clearance:.3};
const robot=makeItem('robot',[.3,0,1.45],0,{props:{gripper:'vacuum',speed:100},program});
const e=new Engine();e.sync([source,red,brown,sensor,robot]);
assert.equal(e.boxes.length,2,'configured stock exists before simulation starts');
assert.deepEqual(new Set(e.boxes.map(b=>b.productId)),new Set(['apple','carton']));
assert.equal(e.pallets.get(source.id)?.cursor,2);
const stock=e.boxes.map(b=>[b.productId,b.x,b.z]);
e.reset();assert.deepEqual(e.boxes.map(b=>[b.productId,b.x,b.z]),stock,'reset recreates the same shuffled stock');
e.setRunning(true);await tick(e,60);
assert.equal(e.robots.get(robot.id)?.cycles,2,`robot depalletizes and inspects both parts: ${e.robots.get(robot.id)?.error}`);
assert.equal(e.pallets.get(source.id)?.cursor,0);
assert.equal(e.pallets.get(red.id)?.cursor,1,'red product routed to red destination');
assert.equal(e.pallets.get(brown.id)?.cursor,1,'brown product routed to brown destination');
assert.ok(e.boxes.some(box=>box.palletId===red.id && box.productId==='apple'));
assert.ok(e.boxes.some(box=>box.palletId===brown.id && box.productId==='carton'));
// Switching the visual task to its generated script keeps depalletize/inspection working.
const scripted={...robot,program:undefined,script:programToCode(program)};
const scriptEngine=new Engine();scriptEngine.sync([source,red,brown,sensor,scripted]);scriptEngine.setRunning(true);await tick(scriptEngine,60);
assert.equal(scriptEngine.robots.get(robot.id)?.cycles,2,`scripted depalletization: ${scriptEngine.robots.get(robot.id)?.error}`);
assert.ok(scriptEngine.boxes.some(box=>box.palletId===red.id && box.productId==='apple'));
assert.ok(scriptEngine.boxes.some(box=>box.palletId===brown.id && box.productId==='carton'));

const project=parseProject(serializeProject({projectName:'stock',layoutName:'stock',activeLayoutId:null,items:[source,red,brown,sensor,robot]}));
assert.equal(project.items.find(i=>i.id===robot.id)?.program?.inspectSensorId,sensor.id);
const copy=copySceneItems([robot,sensor],[0,0,5]);assert.equal(copy[0].program?.inspectSensorId,copy[1].id);

// A source pallet participates in the real graph, including its mixed-stock settings.
const a=makeNode('part.pallet',0,0,{prefill:true,fillProducts:JSON.stringify(['apple','carton']),cols:2,rows:1,layers:1});
const r=makeNode('part.robot',300,0,{detection:'none'});
const p1=makeNode('part.pallet',600,0,{cols:1,rows:1,layers:1});
const p2=makeNode('part.pallet',600,300,{cols:1,rows:1,layers:1});
const c=makeNode('part.color-sensor',300,300,{range:.4,mountedTo:'none'});
r.params.inspectSensor=c.id;
let graph:NodeGraph={version:1,signalSchema:2,nodes:[a,r,p1,p2,c],links:[]};
for(const [from,to] of [[{node:a.id,port:'out'},{node:r.id,port:'in'}],[{node:r.id,port:'out'},{node:p1.id,port:'in'}],[{node:r.id,port:'out'},{node:p2.id,port:'in'}],[{node:c.id,port:'signal-out-1'},{node:p1.id,port:'signal-in-1'}],[{node:c.id,port:'signal-out-2'},{node:p2.id,port:'signal-in-1'}]] as const){const next=connect(graph,from,to);assert.ok(next.ok,next.error);graph=next.graph;}
graph=setChannel(graph,c.id,1,{material:'#d84d38'});graph=setChannel(graph,c.id,2,{material:'#b89a6c'});
const result=compileComponentGraph(graph);assert.ok(result.plant,result.diagnostics.map(d=>d.message).join('; '));
const built=result.plant.items, builtRobot=built.find(i=>i.program?.sourceKind==='pallet')!;
const builtStock=built.find(i=>i.id===builtRobot.program!.sourceId)!;
assert.equal(builtStock.props.prefill,true);assert.equal(builtStock.props.fillProducts,JSON.stringify(['apple','carton']));
assert.equal(built.find(i=>i.id===builtRobot.program?.inspectSensorId)?.kind,'color-sensor');
const builtEngine=new Engine();builtEngine.sync(built);assert.equal(builtEngine.boxes.length,2);
for(const item of built) if(item.kind==='crates' && item.id!==builtStock.id) item.props.retainFull=true;
builtEngine.sync(built);builtEngine.setRunning(true);await tick(builtEngine,60);
assert.equal(builtEngine.robots.get(builtRobot.id)?.cycles,2,`graph-built robot completes inspections: ${builtEngine.robots.get(builtRobot.id)?.error}`);
const [out1,out2]=builtRobot.program!.targetIds!;
assert.ok(builtEngine.boxes.some(box=>box.palletId===out1 && box.productId==='apple'));
assert.ok(builtEngine.boxes.some(box=>box.palletId===out2 && box.productId==='carton'));
console.log('depalletizing: mixed prefill, reset, real sensor inspection, sorting, project copy and graph source OK');

// No silent 10,000-part inventory cap; editing stock requires an explicit reset.
const bulk=makeItem('crates',[0,0,0],0,{props:{cols:101,rows:100,layers:1,prefill:true,product:'carton'}});
const bulkEngine=new Engine();bulkEngine.sync([bulk]);
assert.equal(bulkEngine.boxes.length,10100);assert.equal(bulkEngine.pallets.get(bulk.id)?.cursor,10100);
const edited={...bulk,props:{...bulk.props,fillProducts:JSON.stringify(['apple','carton'])}};
bulkEngine.sync([edited]);assert.equal(bulkEngine.boxes.length,10100,'editing does not duplicate existing stock');
bulkEngine.reset();assert.equal(bulkEngine.boxes.length,10100);assert.deepEqual(new Set(bulkEngine.boxes.map(b=>b.productId)),new Set(['apple','carton']));
bulkEngine.replacePallet(bulk.id);assert.equal(bulkEngine.pallets.get(bulk.id)?.cursor,0);assert.equal(bulkEngine.boxes.filter(b=>b.state==='free').length,0);

// A hole is filled by its actual slot, not by the number of remaining parts.
const hole=makeItem('crates',[0,0,0],0,{props:{cols:2,rows:1,layers:2,prefill:true}});
const holeEngine=new Engine();holeEngine.sync([hole]);const hp=holeEngine.pallets.get(hole.id)!;
const removed=holeEngine.boxes.find(box=>box.palletSlot===2)!;removed.state='dead';removed.palletId=null;hp.cursor--;
const internals=holeEngine as unknown as {nextPalletSlot:(p:typeof hp)=>number|null;reservePalletSlot:(p:typeof hp,i:number,owner:string)=>void};
assert.equal(internals.nextPalletSlot(hp),2,'the empty upper slot is reused instead of overlapping slot 3');
internals.reservePalletSlot(hp,2,'robot-a');assert.equal(internals.nextPalletSlot(hp),null,'another robot cannot reserve the same slot');
assert.ok(scriptEngine.boxes.filter(box=>box.palletId===red.id || box.palletId===brown.id).every(box=>box.palletSlot===0),'scripted placement retains its pallet slot for later pickup');

// Two graph-built robots can depalletize the same source without double-picking.
const sharedSource=makeNode('part.pallet',0,0,{prefill:true,fillProducts:JSON.stringify(['apple','carton']),cols:2,rows:1,layers:1});
const ra=makeNode('part.robot',300,0,{speed:100,detection:'none'}),rb=makeNode('part.robot',300,200,{speed:100,detection:'none'});
const pa=makeNode('part.pallet',600,0,{cols:2,rows:1,layers:1}),pb=makeNode('part.pallet',600,200,{cols:2,rows:1,layers:1});
let sharedGraph:NodeGraph={version:1,signalSchema:2,nodes:[sharedSource,ra,rb,pa,pb],links:[]};
for(const [from,to] of [[sharedSource,ra],[sharedSource,rb],[ra,pa],[rb,pb]]) {const link=connect(sharedGraph,{node:from.id,port:'out'},{node:to.id,port:'in'});assert.ok(link.ok,link.error);sharedGraph=link.graph;}
const sharedResult=compileComponentGraph(sharedGraph);assert.ok(sharedResult.plant,sharedResult.diagnostics.map(d=>d.message).join('; '));
for(const item of sharedResult.plant.items) if(item.kind==='crates' && !item.props.prefill) item.props.retainFull=true;
const sharedEngine=new Engine();sharedEngine.sync(sharedResult.plant.items);sharedEngine.setRunning(true);await tick(sharedEngine,80);
assert.equal([...sharedEngine.robots.values()].reduce((sum,r)=>sum+r.cycles,0),2,`two robots pick both unique source parts: ${[...sharedEngine.robots.values()].map(r=>r.error).join(', ')}`);
assert.equal(sharedEngine.boxes.filter(box=>box.state==='free' && box.palletId && box.palletId!==sharedEngine.items.find(i=>i.props.prefill)?.id).length,2);
console.log('depalletizing edge cases: 10,100 stock, reset/replace, slot holes/reservations, script placement and shared-source robots OK');
