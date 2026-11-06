import assert from 'node:assert/strict';
import { makeItem } from '../src/data/library';
import { Engine } from '../src/sim/engine';
import { cleanPtpPoints, newPtpPoint } from '../src/utils/ptp';
import { parseProject, serializeProject } from '../src/utils/project';
import { copySceneItems, snapshotSceneItems } from '../src/utils/sceneClipboard';
import { cloneItems } from '../src/data/layouts';
import { signalChannelKey } from '../src/utils/signalChannels';
import type { Vec3 } from '../src/types';
const close = (a:number,b:number,epsilon=1e-7) => assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const near = (a:Vec3,b:Vec3,epsilon=1e-7) => a.forEach((v,i)=>close(v,b[i],epsilon));
const target:Vec3=[.8,1.1,1.25], second:Vec3=[1.65,.8,-.3];
const p1=newPtpPoint(target,0),p2={...newPtpPoint(second,1),dwell:.2};
const robot=makeItem('robot',[4,2,-3],67,{rotationX:20,rotationZ:-17,scale:1.3,ptp:{enabled:true,repeat:false,points:[p1,p2]},props:{speed:100,outputMode:'operation-end'}});
const e=new Engine();e.sync([robot]);const rt=e.robots.get(robot.id)!;
for(const local of [target,second,rt.toLocal(rt.tip)]) { const world=rt.toWorld(local); assert.ok(rt.reach(world)); near(rt.forward(rt.inverse(world)),world); }
// Jog and subsequent program edits preserve the exact local pose, even on a transformed robot.
const jog:Vec3=[1.15,1.4,-.5];assert.equal(e.jogRobot(robot.id,rt.toWorld(jog)),true);near(rt.toLocal(rt.tip),jog);
const edited={...robot,ptp:{...robot.ptp!,points:[{...p1,name:'Approach'},p2]}};e.sync([edited]);near(rt.toLocal(rt.tip),jog);
assert.equal(e.jogRobot(robot.id,rt.toWorld([10,10,10])),false);near(rt.toLocal(rt.tip),jog);
const start={...rt.joints},goal=rt.inverse(rt.toWorld(target)),startTip=[...rt.tip] as Vec3;
e.setRunning(true);assert.equal(e.jogRobot(robot.id,rt.toWorld(target)),false);
let sample: {tip:Vec3;joints:typeof rt.joints}|undefined, visitedFirst=false, dwellFrames=0;
for(let i=0;i<600 && rt.cycles<1;i++){e.step(1/60);if(i===50)sample={tip:[...rt.tip],joints:{...rt.joints}};const local=rt.toLocal(rt.tip);if(Math.hypot(...local.map((n,j)=>n-target[j]))<1e-6)visitedFirst=true;if(Math.hypot(...local.map((n,j)=>n-second[j]))<1e-6)dwellFrames++;}
assert.ok(visitedFirst,'waypoints are visited in order');assert.ok(dwellFrames>=10,'dwell holds at the destination');
assert.ok(sample);const waistDelta=Math.atan2(Math.sin(goal.waist-start.waist),Math.cos(goal.waist-start.waist));
const ratio=(sample.joints.waist-start.waist)/waistDelta;assert.ok(ratio>0 && ratio<1);
close((sample.joints.shoulder-start.shoulder)/(goal.shoulder-start.shoulder),ratio,1e-6);
close((sample.joints.elbow-start.elbow)/(goal.elbow-start.elbow),ratio,1e-6);
near(sample.tip,rt.forward(sample.joints),1e-6);
const linear = startTip.map((n,i)=>n+(rt.toWorld(target)[i]-n)*ratio) as Vec3;
assert.ok(Math.hypot(...sample.tip.map((n,i)=>n-linear[i]))>.03,'TCP follows FK, not Cartesian interpolation');
assert.equal(rt.cycles,1);near(rt.toLocal(rt.tip),second,1e-6);
assert.ok(rt.outputPulse>0,'operation-end pulse emitted at sequence completion');
for(let i=0;i<120;i++)e.step(1/60);assert.equal(rt.cycles,1,'non-repeat runs only once');
// Repeat and signal gating; a short button edge is consumed once per sequence.
const feeder=makeItem('feeder',[4,0,0],0,{props:{active:true,product:'carton',interval:0.5}});
const gated=makeItem('robot',[0,0,0],0,{ptp:{enabled:true,repeat:true,points:[p1,p2]},props:{speed:100,outputMode:'operation-end',connectedTo:feeder.id}});
const button=makeItem('button',[0,0,2],0,{props:{signal:false,connectedTo:gated.id}});
const g=new Engine();g.sync([gated,button,feeder]);g.setRunning(true);for(let i=0;i<300;i++)g.step(1/60);assert.equal(g.robots.get(gated.id)!.cycles,0);
g.setButton(button.id,true);g.setButton(button.id,false);for(let i=0;i<900;i++)g.step(1/60);assert.equal(g.robots.get(gated.id)!.cycles,1);assert.equal(g.stats.spawned,1,'operation-end output drives a wired feeder');
g.setButton(button.id,true);g.setButton(button.id,false);for(let i=0;i<900;i++)g.step(1/60);assert.equal(g.robots.get(gated.id)!.cycles,2);assert.equal(g.stats.spawned,2);
// Numbered IN 2 completes on OUT 2 only, and can drive a feeder.
const numberedFeeder=makeItem('feeder',[4,0,0],0,{props:{active:true,product:'carton'}});
const numberedRobot=makeItem('robot',[0,0,0],0,{ptp:{enabled:true,repeat:false,points:[p1]},signalChannels:[{port:1,mode:'operation-end'},{port:2,mode:'operation-end'}],signalRoutes:[{output:2,targetId:numberedFeeder.id,input:1}]});
const numberedButton=makeItem('button',[0,0,2],0,{signalChannels:[{port:1,mode:'pressed'}],signalRoutes:[{output:1,targetId:numberedRobot.id,input:2}]});
const numbered=new Engine();numbered.sync([numberedRobot,numberedButton,numberedFeeder]);numbered.setRunning(true);numbered.setButton(numberedButton.id,true);numbered.setButton(numberedButton.id,false);for(let i=0;i<900;i++)numbered.step(1/60);
assert.equal(numbered.robots.get(numberedRobot.id)!.cycles,1);assert.ok((numbered.signalActivations.get(signalChannelKey(numberedRobot.id,2))??0)>0);assert.equal(numbered.signalActivations.get(signalChannelKey(numberedRobot.id,1))??0,0);assert.equal(numbered.stats.spawned,1);
const repeat=new Engine();repeat.sync([{...gated,ptp:{...gated.ptp!,repeat:true}}]);repeat.setRunning(true);for(let i=0;i<1200;i++)repeat.step(1/60);assert.ok(repeat.robots.get(gated.id)!.cycles>=2);
const bad=new Engine();bad.sync([{...gated,ptp:{enabled:true,repeat:false,points:[{...p1,position:[10,10,10]}]}}]);bad.setRunning(true);for(let i=0;i<10;i++)bad.step(1/60);assert.equal(bad.robots.get(gated.id)!.status,'error');assert.match(bad.robots.get(gated.id)!.error!,/unreachable/);
const exported=parseProject(serializeProject({projectName:'PTP',layoutName:'PTP',activeLayoutId:null,items:[edited]}));assert.deepEqual(exported.items[0].ptp,edited.ptp);
const copied=copySceneItems([edited],[1,0,0]);assert.deepEqual(copied[0].ptp,edited.ptp);assert.notEqual(copied[0].ptp!.points[0].position,edited.ptp!.points[0].position);
const snapshot=snapshotSceneItems([edited]);assert.notEqual(snapshot[0].ptp!.points,edited.ptp!.points);const cloned=cloneItems([edited]);assert.deepEqual(cloned[0].ptp,edited.ptp);assert.notEqual(cloned[0].ptp!.points[0].position,edited.ptp!.points[0].position);
assert.throws(()=>cleanPtpPoints([{...p1,position:[NaN,0,0]}]));assert.throws(()=>cleanPtpPoints([p1,p1]));
// Enabling PTP suspends the original script; disabling it resumes the preserved script.
const original=makeItem('robot',[0,0,0],0,{script:'log("original resumed");',ptp:{enabled:true,repeat:false,points:[p1]}});const restore=new Engine();restore.sync([original]);restore.setRunning(true);for(let i=0;i<400;i++){restore.step(1/60);await Promise.resolve();}assert.equal(restore.robots.get(original.id)!.cycles,1);assert.ok(!restore.logs.some(line=>line.text.includes('original resumed')));
restore.sync([{...original,ptp:{...original.ptp!,enabled:false}}]);for(let i=0;i<5;i++){restore.step(1/60);await Promise.resolve();}assert.ok(restore.logs.some(line=>line.text.includes('original resumed')));
// Inactive point edits do not interrupt the running visual/script task, and lock is authoritative.
const idleEdit=makeItem('robot',[0,0,0],0,{script:'await robot.wait(5);'});const prior=new Engine();prior.sync([idleEdit]);prior.setRunning(true);const priorArm=prior.robots.get(idleEdit.id)!, priorRun=priorArm.runId;
prior.sync([{...idleEdit,ptp:{enabled:false,repeat:false,points:[p1]}}]);assert.equal(priorArm.runId,priorRun);
prior.setRunning(false);prior.sync([{...idleEdit,locked:true}]);assert.equal(prior.jogRobot(idleEdit.id,priorArm.toWorld(target)),false);
// Per-point speed controls coordinated joint motion duration.
function duration(speed:number){const item=makeItem('robot',[0,0,0],0,{props:{speed:100},ptp:{enabled:true,repeat:false,points:[{...p1,speed}]}});const engine=new Engine();engine.sync([item]);engine.setRunning(true);let frames=0;while(engine.robots.get(item.id)!.cycles===0&&frames<3000){engine.step(1/60);frames++;}assert.ok(frames<3000);return frames;}
assert.ok(duration(25)>duration(100)*3,'lower waypoint speed takes longer');
// A wrap across the ±π waist seam takes the short rotation rather than a revolution.
const seamTarget:Vec3=[-1.1,1.2,-.12], seamStart:Vec3=[-1.1,1.2,.12];
const seamItem=makeItem('robot',[0,0,0],0,{ptp:{enabled:true,repeat:false,points:[newPtpPoint(seamTarget,0)]}});
const seam=new Engine();seam.sync([seamItem]);const arm=seam.robots.get(seamItem.id)!;assert.ok(seam.jogRobot(seamItem.id,arm.toWorld(seamStart)));const a0=arm.joints.waist;seam.setRunning(true);
for(let i=0;i<300&&arm.cycles===0;i++){seam.step(1/60);assert.ok(Math.abs(Math.atan2(Math.sin(arm.joints.waist-a0),Math.cos(arm.joints.waist-a0)))<.5,'waist stays on the short arc');}assert.equal(arm.cycles,1);
// Script APIs are genuine joint-space motions, including robot-local coordinates.
const scriptItem=makeItem('robot',[3,0,-2],70,{script:'const ok = await robot.movePtpLocal(0.8, 1.1, 1.25, 80); log("ptp done: " + ok);'});
const scripted=new Engine();scripted.sync([scriptItem]);scripted.setRunning(true);
for(let i=0;i<700;i++){scripted.step(1/60);await Promise.resolve();await Promise.resolve();if(scripted.logs.some(line=>line.text.includes('ptp done: true')))break;}
assert.ok(scripted.logs.some(line=>line.text.includes('ptp done: true')));near(scripted.robots.get(scriptItem.id)!.toLocal(scripted.robots.get(scriptItem.id)!.tip),target,1e-6);
console.log('PTP: transformed IK/FK, joint interpolation, teaching, repeat, signals, scripts, errors, copy and project round trip OK');

// AI Factory builds a standalone, signal-driven motion robot without inventing a material line.
import { compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, makeNode, parseGraph, serializeGraph } from '../src/gen/graph/graph';
import type { NodeGraph } from '../src/gen/graph/types';
const node=makeNode('part.robot',0,0,{kind:'cobot',speed:100,ptpEnabled:true,ptpRepeat:true,ptpPoints:JSON.stringify([{...p1,position:[1.1,1.1,.4]}, {...p2,position:[.8,1.4,-.4]}]),ptpX:5,ptpY:2,ptpZ:-3,ptpRotation:90});
let graph:NodeGraph={version:1,signalSchema:2,nodes:[node],links:[]};
let built=compileComponentGraph(graph);assert.ok(built.plant,built.diagnostics.map(d=>d.message).join('; '));
const graphRobot=built.plant.items.find(i=>i.kind==='cobot')!;assert.deepEqual(graphRobot.position,[5,2,-3]);assert.equal(graphRobot.rotation,90);assert.equal(graphRobot.ptp?.points.length,2);
assert.equal(graphRobot.program,undefined);const restored=parseGraph(serializeGraph(graph));assert.deepEqual(restored.nodes[0].params.ptpPoints,node.params.ptpPoints);
const btn=makeNode('part.button',100,200);graph={...graph,nodes:[node,btn]};const connected=connect(graph,{node:btn.id,port:'signal-out-1'},{node:node.id,port:'signal-in-1'});assert.ok(connected.ok,connected.error);graph=connected.graph;
built=compileComponentGraph(graph);assert.ok(built.plant,built.diagnostics.map(d=>d.message).join('; '));
const graphEngine=new Engine();graphEngine.sync(built.plant.items);graphEngine.setRunning(true);for(let i=0;i<600;i++)graphEngine.step(1/60);assert.equal([...graphEngine.robots.values()][0].cycles,0);
const physicalButton=built.plant.items.find(i=>i.kind==='button')!;graphEngine.setButton(physicalButton.id,true);graphEngine.setButton(physicalButton.id,false);for(let i=0;i<900;i++)graphEngine.step(1/60);assert.equal([...graphEngine.robots.values()][0].cycles,1);
const empty=compileComponentGraph({...graph,nodes:graph.nodes.map(n=>n.id===node.id?{...n,params:{...n.params,ptpPoints:'[]'}}:n)});assert.equal(empty.plant,null);assert.ok(empty.diagnostics.some(d=>d.message.includes('at least one PTP')));
const unreachable=compileComponentGraph({...graph,nodes:graph.nodes.map(n=>n.id===node.id?{...n,params:{...n.params,ptpPoints:JSON.stringify([{...p1,position:[100,100,100]}])}}:n)});assert.equal(unreachable.plant,null);assert.ok(unreachable.diagnostics.some(d=>d.message.includes('outside robot reach')));
const belt=makeNode('part.conveyor',400,0);const incomplete:NodeGraph={...graph,nodes:[...graph.nodes,belt],links:[...graph.links,{id:'flow',from:{node:belt.id,port:'out'},to:{node:node.id,port:'in'}}]};
assert.equal(compileComponentGraph(incomplete).plant,null,'a connected PTP robot still requires a complete material workflow');
console.log('PTP graph: standalone placement, JSON persistence, signals and validation OK');
