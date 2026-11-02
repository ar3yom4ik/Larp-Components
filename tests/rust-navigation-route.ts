import assert from 'node:assert/strict';
import { navigate, pointIsFree, type Point, type Barrier, type WalkObstacle } from '../src/sim/navigation';
import { createRustNavigator } from '../src/sim/wasm/kernel';
import { Engine } from '../src/sim/engine';
import { makeItem } from '../src/data/library';

const rust=createRustNavigator();
let seed=0x534127;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try {
  const fixed:{start:Point,end:Point,barriers:Barrier[],obstacles:WalkObstacle[]}[]=[
    {start:[0,0],end:[0,0],barriers:[],obstacles:[]},
    {start:[0,0],end:[7,0],barriers:[{a:[3,-1],b:[3,1]}],obstacles:[]},
    {start:[-1,-1],end:[5,5],barriers:[{a:[1,-2],b:[1,4],clearance:0.5}],obstacles:[{x:4,z:4,radius:0.6}]},
    {start:[0,0],end:[9,9],barriers:[],obstacles:[{x:0,z:0,radius:7}]},
  ];
  for(const {start,end,barriers,obstacles} of fixed) assert.deepEqual(rust.navigate(start,end,barriers,obstacles),navigate(start,end,barriers,obstacles));
  let differences=0;
  for(let i=0;i<500;i++) {
    const coord=()=>Math.round((rand()-0.5)*20)/2;
    const start:Point=[coord(),coord()],end:Point=[coord(),coord()];
    const barriers:Barrier[]=Array.from({length:i%5},()=>({a:[coord(),coord()] as Point,b:[coord(),coord()] as Point,clearance:0.34}));
    const obstacles:WalkObstacle[]=Array.from({length:i%4},()=>({x:coord(),z:coord(),radius:0.2+rand()}));
    const expected=navigate(start,end,barriers,obstacles), actual=rust.navigate(start,end,barriers,obstacles);
    if(JSON.stringify(actual)!==JSON.stringify(expected)) differences++;
    assert.equal(actual.length===0,expected.length===0,`reachable scenario ${i}`);
    if(actual.length) {
      assert.deepEqual(actual.at(-1),end,`end point ${i}`);
      const cost=(route:Point[])=>route.slice(1,-1).reduce((n,p,k)=>n+Math.hypot(p[0]-route[k][0],p[1]-route[k][1]),0);
      assert.ok(Math.abs(cost(actual)-cost(expected))<1e-9,`route cost ${i}`);
    }
    for(const p of actual.slice(0,-1)) assert.ok(pointIsFree(p[0],p[1],barriers,obstacles),`blocked point in ${i}`);
  }
  for(const task of ['inspect','carry','replenish','patrol']) {
    const conv=makeItem('conveyor',[0,0,0],0,{points:[[-1.5,0],[1.5,0]],props:{speed:0.3,active:true,stopper:true}});
    const pallet=makeItem('crates',[1.2,0,3]);
    const feeder=makeItem('feeder',[-1,0,0],0,{props:{interval:2,product:'carton',active:true,requireSupply:task==='replenish'}});
    const human=makeItem('operator',[1.2,0,1],0,{props:{task,sourceId:task==='replenish'?feeder.id:conv.id,targetId:pallet.id,walkSpeed:1}});
    const e=new Engine();let calls=0;
    e.navigator={navigate:(...args)=>{calls++;return rust.navigate(...args);}};
    e.sync([conv,pallet,feeder,human]);if(task==='replenish') e.feeders.get(feeder.id)!.supply=0;
    e.spawn('carton',1.1,0.66+0.13+0.002,0);e.setRunning(true);
    for(let frame=0;frame<35*60;frame++){e.step(1/60);await Promise.resolve();await Promise.resolve();}
    assert.ok(calls>0,`${task} did not invoke Rust navigation`);
    assert.ok(e.humans.get(human.id)!.completed>0,`${task} did not complete with Rust navigation`);
  }
  console.log(`Alternative equal-cost routes: ${differences} of 500`);
} finally {rust.dispose();}
assert.throws(()=>rust.navigate([0,0],[1,1],[],[]),/disposed/);
console.log('Rust A*: 500 randomized scenes reachability and route cost match TypeScript');
