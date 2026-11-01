import assert from 'node:assert/strict';
import { distanceSqJs, distanceSqKernel, rustKernelAvailable } from '../src/sim/wasm/kernel';
assert.ok(rustKernelAvailable, 'Rust WASM kernel did not instantiate in Node');
let seed = 0x91ba1234;
function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return (seed / 0x100000000 - 0.5) * 1000; }
const cases: number[][] = [
  [0,0,0,0,0,0], [1,2,0,0,2,0], [3,0,0,0,2,0],
  [-1,-1,-3,-3,-3,-3], [Number.NaN,0,0,0,0,0],
  [0,0,0,0,Number.POSITIVE_INFINITY,0],
];
for (let i=0; i<10000; i++) cases.push(Array.from({length:6},random));
for (const args of cases) {
  const [x,z,ax,az,bx,bz] = args;
  const expected = distanceSqJs(x,z,ax,az,bx,bz);
  const actual = distanceSqKernel(x,z,ax,az,bx,bz);
  assert.ok(Object.is(actual,expected) || Math.abs(actual-expected) <= 1e-10*Math.max(1,Math.abs(expected)), `mismatch ${args}: ${actual} vs ${expected}`);
}
console.log('Rust WASM navigation kernel: 10,000 parity cases passed');

// Compare whole obstacle scenes on both engines, not just the scalar helper.
const { pointIsFree } = await import('../src/sim/navigation');
const { createRustNavigationScene } = await import('../src/sim/wasm/kernel');
for (let sceneIndex=0; sceneIndex<100; sceneIndex++) {
  const barriers=Array.from({length:sceneIndex%12},()=>({a:[random(),random()] as [number,number],b:[random(),random()] as [number,number],clearance:Math.abs(random())/100}));
  const obstacles=Array.from({length:sceneIndex%9},()=>({x:random(),z:random(),radius:Math.abs(random())/100}));
  const scene=createRustNavigationScene(barriers,obstacles);
  for(let point=0;point<200;point++) {
    const x=random(), z=random(), tolerance=(point%3)*0.02;
    assert.equal(scene.pointIsFree(x,z,tolerance),pointIsFree(x,z,barriers,obstacles,tolerance),`scene ${sceneIndex}, point ${point}`);
  }
  scene.dispose();
  assert.throws(()=>scene.pointIsFree(0,0),/disposed/);
  scene.dispose();
}
const cornerCases = [{a:[0,0] as [number,number],b:[0,0] as [number,number]}, {a:[-2,1] as [number,number],b:[3,1] as [number,number],clearance:0.75}];
const scene = createRustNavigationScene(cornerCases,[{x:3,z:4,radius:1}]);
for (const x of [-3,-2,0,3,4]) for (const z of [-1,0,0.25,1,1.75,4]) for (const tolerance of [0,0.3,2])
  assert.equal(scene.pointIsFree(x,z,tolerance),pointIsFree(x,z,cornerCases,[{x:3,z:4,radius:1}],tolerance));
scene.dispose();
console.log('Rust WASM navigation scenes: 20,000 side-by-side point checks passed');
