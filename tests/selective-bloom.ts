import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EmissiveMask} from '../src/components/SelectiveBloom';

const scene=new THREE.Scene();scene.background=new THREE.Color('#274165');
const source=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#aa0000',emissiveIntensity:2});
const geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,source);scene.add(mesh);
const renderer={getClearAlpha:()=>.7,getClearColor:(target:THREE.Color)=>target.set('#123456'),setClearColor:()=>{}} as unknown as THREE.WebGLRenderer;
const masks=new EmissiveMask();
let first:THREE.MeshBasicMaterial | null=null;
masks.render(renderer,scene,()=>{first=mesh.material as unknown as THREE.MeshBasicMaterial;assert.notEqual(first,source);assert.ok(first.color.r>.7);assert.equal(scene.background,null);});
assert.equal(mesh.material,source,'render restores original materials');assert.ok(scene.background instanceof THREE.Color);
source.emissive.set('#00ff00');source.emissiveIntensity=1;source.transparent=true;source.opacity=.4;source.depthWrite=false;
masks.render(renderer,scene,()=>{
 const live=mesh.material as unknown as THREE.MeshBasicMaterial;
 assert.equal(live,first,'mask resources are reused');assert.ok(live.color.g>.9&&live.color.r===0,'edited emission is copied into the reused mask');
 assert.equal(live.opacity,.4);assert.equal(live.transparent,true);assert.equal(live.depthWrite,false);assert.equal(live.colorWrite,true);
});
source.emissiveIntensity=0;
assert.throws(()=>masks.render(renderer,scene,()=>{const live=mesh.material as unknown as THREE.MeshBasicMaterial;assert.equal(live.color.getHex(),0);throw new Error('renderer failure');}),/renderer failure/);
assert.equal(mesh.material,source,'restores material even on render failure');assert.ok(scene.background instanceof THREE.Color,'restores scene background even on failure');
masks.dispose();geometry.dispose();source.dispose();
console.log('selective bloom: dynamic materials, transparency and render-state cleanup OK');
