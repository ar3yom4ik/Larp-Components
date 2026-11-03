import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {Engine,BELT_TOP} from '../src/sim/engine';
import {RigidBodyWorld} from '../src/sim/rigidBodies';
import {signalChannelKey} from '../src/utils/signalChannels';
import {canSignalInput,signalPortConnectionPatch,signalOutputConnections} from '../src/utils/signalPorts';
import {defaultComponentGraph,compileComponentGraph} from '../src/gen/graph/componentCompile';
import {upgradePickupSensors} from '../src/gen/graph/pickupSensors';
import {makeNode,parseGraph,connect} from '../src/gen/graph/graph';
import {setChannel} from '../src/gen/graph/signal';
import {graphWirePath} from '../src/gen/graph/wireRouting';
import {containsPlatformPoint,platformCorners} from '../src/utils/upperFloor';
import {itemLocalToWorld} from '../src/utils/transform';

const tick=(e:Engine,seconds:number)=>{for(let i=0;i<seconds*60;i++)e.step(1/60)};
// A color sensor produces independent outputs, not a material-flow or signal input.
{
  const sensor=makeItem('color-sensor',[0,0,0],0,{props:{range:3},signalChannels:[{port:1,mode:'match',material:'#d84d38',color:'#ff0000'},{port:2,mode:'match',material:'#b89a6c',color:'#00ff00'}]});
  const feederA=makeItem('feeder',[8,0,0],0,{props:{interval:.5,active:true,product:'carton'}});
  const feederB=makeItem('feeder',[12,0,0],0,{props:{interval:.5,active:true,product:'carton'}});
  sensor.signalRoutes=[{output:1,targetId:feederA.id,input:1},{output:2,targetId:feederB.id,input:1}];
  assert.equal(canSignalInput(sensor,feederA.id),false);
  const e=new Engine();e.sync([sensor,feederA,feederB]);e.spawn('apple',0,.85,0);e.setRunning(true);tick(e,.05);
  assert.equal(e.signalState.get(signalChannelKey(sensor.id,1)),true,'apple color triggers matching output');
  assert.equal(e.signalState.get(signalChannelKey(sensor.id,2)),false,'other output remains independent');
  assert.equal(e.stats.spawned,2,'only the red-matched feeder released one part');
  const one=signalPortConnectionPatch(sensor,1,feederB.id,2,true),updated={...sensor,...one};
  assert.equal(signalOutputConnections(updated,1).length,2);
  const removed={...updated,...signalPortConnectionPatch(updated,1,feederA.id,1,false)};
  assert.deepEqual(signalOutputConnections(removed,2),[{targetId:feederB.id,input:1}],'disconnecting one numbered port preserves the other');
}
// A part carried from a flat section, over a curved incline and back onto
// the top flat section receives and then clears its visual support normal.
{
  const belt=makeItem('conveyor',[0,0,0],0,{points:[[-4,0],[-2,0],[0,0],[2,0],[4,0]],pointHeights:[0,0,1,2,2],props:{speed:.8,active:true}});
  const e=new Engine();e.sync([belt]);const part=e.spawn('carton',-3.5,BELT_TOP+.35,0);e.setRunning(true);
  let tilted=false,climbed=false,flatAgain=false;
  for(let frame=0;frame<13*60;frame++) {
    e.step(1/60);
    if(part.support===2&&part.beltNormal&&part.beltNormal[1]<.97) tilted=true;
    if(part.support===2&&part.y>BELT_TOP+part.hy+1.7) climbed=true;
    if(climbed&&part.support===2&&!part.beltNormal&&part.x>2.7) {flatAgain=true;break;}
  }
  assert.ok(tilted,'slope records an inclined support normal for rendering');
  assert.ok(climbed,'the part actually follows the rising conveyor surface');
  assert.ok(flatAgain,`normal clears again on the flat section, x=${part.x}, support=${part.support}`);
}
// Schema-less/1 physical placement upgrades never become runtime signal wires.
{
  const current=defaultComponentGraph(),laser=current.nodes.find(node=>node.type==='part.laser')!,mount=current.links.find(link=>link.to.node===laser.id&&link.to.port==='mount')!;
  for(const schema of [undefined,1] as const) {
    const old={...current,signalSchema:schema,links:current.links.map(link=>link.id===mount.id?{...link,from:{...link.from,port:'signal-out-1'},to:{...link.to,port:'signal-in-1'}}:link)};
    const parsed=parseGraph(old);assert.equal(parsed.links.find(link=>link.id===mount.id)?.to.port,'mount');
    assert.equal(upgradePickupSensors(parsed).nodes.filter(node=>node.type==='part.laser').length,current.nodes.filter(node=>node.type==='part.laser').length);
    const plant=compileComponentGraph(parsed).plant!;
    const compiledLaser=plant.items.find(item=>item.kind==='laser')!,belt=plant.items.find(item=>item.id===compiledLaser.props.mountedTo)!;
    assert.ok(belt);assert.ok(!(belt.signalRoutes ?? []).some(route=>route.targetId===compiledLaser.id),'physical mount is not a signal');
  }
}
// Color sensor and independent layout objects are genuine factory nodes.
{
  let graph=defaultComponentGraph();
  const color=makeNode('part.color-sensor',200,500),belt=graph.nodes.find(n=>n.type==='part.conveyor')!,robot=graph.nodes.find(n=>n.type==='part.robot')!;
  const deck=makeNode('part.platform',400,500),stairs=makeNode('part.stairs',650,500),wall=makeNode('part.wall',900,500);
  deck.params={...deck.params,x:8,z:8,height:3.6,surfaceMaterial:'wood'};
  stairs.params={...stairs.params,x:10,z:8,height:4,surfaceMaterial:'rubber'};
  wall.params={...wall.params,x:12,z:8,height:3.5,length:8,surfaceMaterial:'white'};
  graph={...graph,nodes:[...graph.nodes,color,deck,stairs,wall]};
  const mount=connect(graph,{node:belt.id,port:'attach'},{node:color.id,port:'mount'});assert.ok(mount.ok);graph=mount.graph;
  const wire=connect(graph,{node:color.id,port:'signal-out-2'},{node:robot.id,port:'signal-in-2'});assert.ok(wire.ok);graph=wire.graph;
  graph=setChannel(graph,color.id,1,{material:'#d84d38',color:'#ff0000'});
  graph=setChannel(graph,color.id,2,{material:'#b89a6c',color:'#00ff00'});
  const plant=compileComponentGraph(graph).plant!;assert.ok(plant);
  const sensor=plant.items.find(i=>i.kind==='color-sensor')!;
  assert.equal(sensor.signalChannels?.find(c=>c.port===2)?.material,'#b89a6c');
  assert.ok(sensor.props.mountedTo && sensor.signalRoutes?.some(r=>r.output===2&&r.input===2));
  assert.equal(plant.items.find(i=>i.kind==='platform')?.props.height,4);
  assert.equal(plant.items.find(i=>i.kind==='platform')?.props.surfaceMaterial,'wood');
  assert.equal(plant.items.find(i=>i.kind==='stairs')?.props.surfaceMaterial,'rubber');
  assert.equal(plant.items.find(i=>i.kind==='wall')?.props.height,3.5);
  assert.equal(plant.items.find(i=>i.kind==='wall')?.points?.length,2);
}
// A friction-only override preserves Cannon's effective default restitution.
{
  const world=new RigidBodyWorld();
  const friction=makeItem('cabinet',[0,4,0],0,{props:{physicsMode:'dynamic',physicsFriction:.9}});
  const rubber=makeItem('cabinet',[4,4,0],0,{props:{physicsMode:'dynamic',physicsRestitution:.8}});
  world.sync([friction,rubber]);
  const floor=world.world.bodies[0],a=world.body(friction.id)!,b=world.body(rubber.id)!;
  assert.ok(Math.abs(world.world.getContactMaterial(a.material!,floor.material!)!.restitution-.0009)<1e-9);
  assert.ok(Math.abs(world.world.getContactMaterial(b.material!,floor.material!)!.restitution-.8)<1e-9);
  let rubberRebound=0,ordinaryRebound=0;
  for(let i=0;i<180;i++) {world.world.step(1/60);if(i>35){rubberRebound=Math.max(rubberRebound,b.velocity.y);ordinaryRebound=Math.max(ordinaryRebound,a.velocity.y);}}
  assert.ok(rubberRebound>2 && rubberRebound>ordinaryRebound+1,`authored rubber rebounds: ${rubberRebound} vs ${ordinaryRebound}`);
}
// Edited convex deck has matching support and rigid collision; stairs are open below.
{
  const platform=makeItem('platform',[0,0,0],0,{points:[[-2,-2],[2,-2],[1,2],[-2,2]],props:{width:4,depth:4,height:2}});
  assert.equal(containsPlatformPoint(platformCorners(platform),0,0),true);
  assert.equal(containsPlatformPoint(platformCorners(platform),1.9,1.8),false);
  const inside=makeItem('button',[0,5,0],0,{props:{physicsMode:'dynamic'}});
  const outside=makeItem('button',[1.9,5,1.8],0,{props:{physicsMode:'dynamic'}});
  const e=new Engine();e.sync([platform,inside,outside]);e.setRunning(true);tick(e,4);
  assert.ok(Math.abs(e.getPhysicsPose(inside.id)!.position[1]-2)<.15,'dynamic body lands on custom deck');
  assert.ok(e.getPhysicsPose(outside.id)!.position[1]<.3,'outside the edited corner falls to ground');
  const stairs=makeItem('stairs',[8,0,0],0,{props:{width:1.2,length:4,height:2}});
  const under=makeItem('button',[9.2,0,0],0,{props:{physicsMode:'dynamic'}});
  const e2=new Engine();e2.sync([stairs,under]);e2.setRunning(true);tick(e2,2);
  assert.ok(e2.getPhysicsPose(under.id)!.position[1]<.25,'space beneath stair treads is not a solid ramp');
}
// Scaled/rotated outlined platforms agree in both conveyor-product supports
// and Cannon colliders; rotated spline walls block real dynamic bodies.
{
  const deck=makeItem('platform',[5,0,4],45,{scale:1.5,points:[[-2,-2],[2,-2],[1,2],[-2,2]],props:{height:2}});
  const inside=itemLocalToWorld(deck,[0,0,0]),outside=itemLocalToWorld(deck,[1.9,0,1.8]);
  const a=makeItem('button',[inside[0],6,inside[2]],0,{props:{physicsMode:'dynamic'}});
  const b=makeItem('button',[outside[0],6,outside[2]],0,{props:{physicsMode:'dynamic'}});
  const e=new Engine();e.sync([deck,a,b]);const product=e.spawn('carton',inside[0]+.6,4,inside[2]);e.setRunning(true);tick(e,4);
  assert.ok(Math.abs(e.getPhysicsPose(a.id)!.position[1]-3)<.2,'scaled/rotated deck catches dynamic body');
  assert.ok(e.getPhysicsPose(b.id)!.position[1]<.3,'scaled/rotated edited corner remains open');
  assert.ok(Math.abs(product.y-product.hy-3)<.2,'product support matches scaled/rotated deck');
  const wall=makeItem('wall',[0,0,0],90,{scale:1.5,points:[[-2,0],[2,0]],props:{height:3}});
  const mover=makeItem('cabinet',[3,0,0],0,{props:{physicsMode:'dynamic'}});
  const world=new RigidBodyWorld();world.world.gravity.set(0,0,0);world.sync([wall,mover]);
  world.body(mover.id)!.velocity.set(-5,0,0);for(let i=0;i<120;i++)world.world.step(1/60);
  assert.ok(world.pose(mover.id)!.position[0]>.3,'rotated scaled wall stops a moving body');
}
// An intervening node forces a clear orthogonal lane instead of being painted over.
{
  const boxes=[{id:'a',x:0,y:0,width:200,height:120},{id:'middle',x:300,y:-30,width:200,height:150},{id:'b',x:600,y:0,width:200,height:120}];
  const path=graphWirePath({x:200,y:50},{x:600,y:50},boxes,'a','b');
  assert.ok(path.includes(' L '),'blocked wire routes around the node');
  const points=[...path.matchAll(/(?:M|L)\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map(match=>[Number(match[1]),Number(match[2])]);
  for(let i=1;i<points.length;i++){const [x1,y1]=points[i-1],[x2,y2]=points[i];for(let t=0;t<=1;t+=.02){const x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;assert.ok(!(x>300&&x<500&&y>-30&&y<120),'wire stays outside node');}}
}
// When the vertical escape next to a port is boxed in, a route with extra
// turns still avoids the intervening nodes instead of falling back to a crossing.
{
  const boxes=[{id:'a',x:0,y:0,width:200,height:100},{id:'b',x:600,y:0,width:200,height:100},
    {id:'middle',x:300,y:-10,width:200,height:120},{id:'upper',x:210,y:-90,width:40,height:130},{id:'lower',x:210,y:60,width:40,height:130}];
  const path=graphWirePath({x:200,y:50},{x:600,y:50},boxes,'a','b');
  assert.ok(!path.includes(' C '),'escape route takes several orthogonal turns');
  const points=[...path.matchAll(/(?:M|L)\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map(match=>[Number(match[1]),Number(match[2])]);
  for(let i=1;i<points.length;i++)for(let t=.01;t<1;t+=.01) {
    const x=points[i-1][0]+(points[i][0]-points[i-1][0])*t,y=points[i-1][1]+(points[i][1]-points[i-1][1])*t;
    for(const box of boxes) assert.ok(!(x>box.x&&x<box.x+box.width&&y>box.y&&y<box.y+box.height),`wire crosses ${box.id}: ${path}`);
  }
}
console.log('new features: sensor, schema migration, restitution, shaped platforms, open stairs and graph wire routing OK');
