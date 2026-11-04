import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {importedProductId} from '../src/data/products';
import {Engine} from '../src/sim/engine';
import type {ImportedModelData} from '../src/types';

const model:ImportedModelData={asset:{id:'rubber',entry:'part.stl',files:[{path:'part.stl',dataUrl:'data:application/octet-stream;base64,AA=='}]},axis:'y',units:'m',materials:[],meshCount:1,triangleCount:12,sourceSize:[.3,.2,.3]};
const source=makeItem('imported-model',[20,0,0],0,{visible:false,imported:model,props:{physicsRestitution:.8,physicsMass:1}});
function drop(product:string, platformRestitution:number|undefined, bottom:number, vy=0) {
 const platform=makeItem('platform',[0,0,0],0,{props:{width:4,depth:4,height:2,...(platformRestitution===undefined?{}:{physicsRestitution:platformRestitution})}});
 const e=new Engine();e.sync([source,platform]);const part=e.spawn(product,0,bottom+(product==='carton'?.13:.1),0);part.vy=vy;e.setRunning(true);
 let rebound=0,minBottom=Infinity;
 for(let i=0;i<90;i++){e.step(1/60);minBottom=Math.min(minBottom,part.y-part.hy);rebound=Math.max(rebound,part.vy);}
 return {rebound,minBottom,part};
}
const soft=drop(importedProductId(source),undefined,2.025);
assert.ok(soft.rebound>.3,`authored restitution responds to gentle impacts: ${soft.rebound}`);
const surface=drop('carton',.9,2.025);
assert.ok(surface.rebound>.3,`the supporting platform's restitution affects products: ${surface.rebound}`);
const absorbed=drop(importedProductId(source),0,2.025);
assert.ok(absorbed.rebound<.05,`a zero restitution contact absorbs the impact: ${absorbed.rebound}`);
const fast=drop(importedProductId(source),undefined,5,-25);
assert.ok(fast.rebound>8,`high-speed crossing rebounds from the deck: ${fast.rebound}`);
assert.ok(fast.minBottom>1.99,`high-speed product cannot tunnel through platform: ${fast.minBottom}`);
console.log('bounce physics: gentle authored impacts, surface material, zero bounce and swept platform landing OK');
