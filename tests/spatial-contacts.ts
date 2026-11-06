import assert from 'node:assert/strict';
import { SpatialHash, contactQueryRadius } from '../src/sim/spatial';

// The broad phase must include every pair that can reach the conservative
// rotated-rectangle narrow phase, including oversized and moving workpieces.
let seed=281761;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
type Part={x:number;z:number;hx:number;hz:number;nowX:number;nowZ:number};
for(let scene=0;scene<200;scene++) {
  const index=new SpatialHash<Part>(2),parts:Part[]=[],range=scene%2?18:5;
  let maxHalf=0,maxMove=0;
  for(let i=0;i<75;i++) {
    const x=(rand()-.5)*range,z=(rand()-.5)*range,hx=.03+rand()*(i%12?1:4),hz=.03+rand()*(i%12?1:4);
    const nowX=x+(rand()-.5)*2,nowZ=z+(rand()-.5)*2;
    const part={x,z,hx,hz,nowX,nowZ};parts.push(part);index.insert(part,x-hx,z-hz,x+hx,z+hz);
    maxHalf=Math.max(maxHalf,hx,hz);maxMove=Math.max(maxMove,Math.abs(nowX-x),Math.abs(nowZ-z));
  }
  const out:Part[]=[];
  for(const a of parts) {
    const near=index.query(a.nowX,a.nowZ,out,contactQueryRadius(a.hx,a.hz,maxHalf,maxMove));
    for(const b of parts) {
      if(a===b)continue;
      const threshold=a.hx+a.hz+b.hx+b.hz;
      if(Math.abs(a.nowX-b.nowX)<=threshold && Math.abs(a.nowZ-b.nowZ)<=threshold)
        assert.ok(near.includes(b),`scene ${scene} broad phase lost a potentially touching product`);
    }
  }
}
console.log('spatial contacts: conservative queries retain moving and oversized products');
