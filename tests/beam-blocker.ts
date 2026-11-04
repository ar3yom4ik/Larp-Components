import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import {makeItem} from '../src/data/library';
import {makeBeamBlocker,RigidBodyWorld} from '../src/sim/rigidBodies';
import type {Vec3} from '../src/types';

// Compare the optimized precomputed oriented bounds/slab test with Cannon's
// independent raycast, including compound shapes and arbitrary X/Y/Z rotation.
let seed=154235;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(const kind of ['cabinet','feeder','stairs','conveyor'] as const)for(let test=0;test<8;test++) {
  const item=makeItem(kind,[random()*4-2,random()*2,random()*4-2],random()*360,{rotationX:random()*120-60,rotationZ:random()*120-60,scale:.7+random(),...(kind==='conveyor'?{points:[[-2,0],[0,0],[2,0]] as [number,number][]}: {})});
  const check=makeBeamBlocker(item,[item]),world=new RigidBodyWorld();
  const anchor=makeItem('button',[100,100,100],0,{props:{physicsMode:'dynamic'}});world.sync([item,anchor]);const body=world.body(item.id)!;assert.ok(body);
  for(let ray=0;ray<120;ray++) {
    const from:Vec3=[item.position[0]+random()*10-5,item.position[1]+random()*6-2,item.position[2]+random()*10-5];
    const to:Vec3=[item.position[0]+random()*10-5,item.position[1]+random()*6-2,item.position[2]+random()*10-5];
    let hit=false;world.world.raycastAll(new CANNON.Vec3(...from),new CANNON.Vec3(...to),{},result=>{if(result.body===body)hit=true;});
    assert.equal(check(from,to),hit,`${kind} rotated compound ray ${ray}`);
  }
}
console.log('beam blocker: optimized bounds and oriented intersection match Cannon raycasts');
