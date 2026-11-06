import { Engine } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { distanceToSegment, pointIsFree } from '../src/sim/navigation';
const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };

// A worker must route around, not through, a six-metre moving conveyor.
const belt = makeItem('conveyor', [0,0,0], 0, { points: [[-3,0],[3,0]], props: { speed: 0, active: true } });
const worker = makeItem('operator', [0,0,-2], 0, { points: [[0,4],[0,0]], props: { task: 'patrol', walkSpeed: 1.4 } });
let e = new Engine(); e.sync([belt,worker]); e.setRunning(true);
let minBelt = Infinity;
for (let i=0;i<40*60;i++) { e.step(1/60); const h=e.humans.get(worker.id)!; minBelt=Math.min(minBelt,distanceToSegment(h.x,h.z,[-3,0],[3,0]).distance); }
assert(minBelt > 0.57, `Human entered conveyor clearance: ${minBelt}`);
assert(e.humans.get(worker.id)!.completed >= 2, 'Human never completed patrol around belt');

// Two people walking head-on must pass one another and continue patrolling.
const a=makeItem('operator',[-2,0,0],0,{points:[[4,0],[0,0]],props:{task:'patrol',walkSpeed:1}});
const b=makeItem('operator',[2,0,0],0,{points:[[-4,0],[0,0]],props:{task:'patrol',walkSpeed:1}});
e=new Engine(); e.sync([a,b]); e.setRunning(true); let minPeople=Infinity;
for(let i=0;i<25*60;i++) { e.step(1/60); const h1=e.humans.get(a.id)!,h2=e.humans.get(b.id)!; minPeople=Math.min(minPeople,Math.hypot(h1.x-h2.x,h1.z-h2.z)); }
assert(minPeople >= 0.525, `People overlapped: ${minPeople}`);
assert(e.humans.get(a.id)!.completed >= 2 && e.humans.get(b.id)!.completed >= 2, 'People stalled in a head-on encounter');

// Imports and reset can contain multiple identical, invalid spawn positions.
const crowded=Array.from({length:7},()=>makeItem('operator',[0,0,0],0,{props:{task:'idle'}}));
e=new Engine(); e.sync([belt,...crowded]);
const checkPositions=(label:string) => {
  const people=[...e.humans.values()];
  people.forEach((h,i)=>{
    assert(pointIsFree(h.x,h.z,e.walkBarriers,e.walkObstacles), `${label}: human inside equipment`);
    for(const other of people.slice(i+1)) assert(Math.hypot(h.x-other.x,h.z-other.z)>=0.54, `${label}: overlapping spawn positions`);
  });
};
checkPositions('sync'); e.reset(); checkPositions('reset');
console.log(`Navigation PASS: conveyor clearance ${minBelt.toFixed(3)}m, head-on separation ${minPeople.toFixed(3)}m; overlapping sync/reset positions corrected`);
