// Exploratory side-by-side microbenchmark, not a release performance guarantee.
import { pointIsFree, type Barrier, type WalkObstacle } from '../src/sim/navigation';
import { createRustNavigationScene } from '../src/sim/wasm/kernel';
const barriers: Barrier[] = Array.from({length: 100}, (_, i)=>({a:[i*0.9,0],b:[i*0.9,5],clearance:0.34}));
const obstacles: WalkObstacle[] = Array.from({length:20},(_,i)=>({x:i*4.0,z:10,radius:0.8}));
const scene=createRustNavigationScene(barriers,obstacles);
const iterations=200_000;
function measure(name:string, query:(x:number,z:number)=>boolean) {
  let hits=0;
  for (let round=0;round<3;round++) {
    const t=performance.now();
    for (let i=0;i<iterations;i++) if (query((i%900)/10, (i%137)/10)) hits++;
    console.log(`${name} round ${round+1}: ${(performance.now()-t).toFixed(1)} ms; hits ${hits}`);
  }
}
measure('JavaScript', (x,z)=>pointIsFree(x,z,barriers,obstacles));
measure('Rust/Wasm', (x,z)=>scene.pointIsFree(x,z));
scene.dispose();
