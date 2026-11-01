import assert from 'node:assert/strict';
import { Engine, type Box, type ProductSupport } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { DEFAULT_GEN, generateFactory } from '../src/sim/generator';
import { createRustProductIntegrator } from '../src/sim/wasm/kernel';

function reference(b:Box,s:ProductSupport,dt:number) {
  const prev=b.support,grounded=b.y-b.hy<=s.top+0.004&&b.vy<=0.05;
  if(grounded) {
    b.y=s.top+b.hy;b.vy=prev===0&&b.vy< -1.3?-b.vy*0.12:0;b.support=s.kind as Box['support'];
    if(s.conveyor) {
      const sp=s.blocked?0:s.speed,vlat=Math.max(-0.5,Math.min(0.5,-s.lat*4));
      const dvx=s.tx*sp+-s.tz*vlat,dvz=s.tz*sp+s.tx*vlat,k=Math.min(1,12*dt);
      b.vx+=(dvx-b.vx)*k;b.vz+=(dvz-b.vz)*k;
      const target=Math.atan2(-s.tz,s.tx),d=target-b.yaw;b.yaw+=Math.atan2(Math.sin(d),Math.cos(d))*Math.min(1,5*dt);
      if(s.stopper) {const limit=s.length-0.06-b.r;if(s.along>limit){const back=s.along-limit;b.x-=s.tx*back;b.z-=s.tz*back;const vn=b.vx*s.tx+b.vz*s.tz;if(vn>0){b.vx-=s.tx*vn;b.vz-=s.tz*vn;}}}
    } else {const sp=Math.hypot(b.vx,b.vz);if(sp>0){const next=Math.max(0,sp-7*dt);b.vx*=next/sp;b.vz*=next/sp;}}
    b.tiltV+=(-70*b.tilt-10*b.tiltV)*dt;b.tilt+=b.tiltV*dt;
    if(Math.abs(b.tilt)<0.002&&Math.abs(b.tiltV)<0.02){b.tilt=0;b.tiltV=0;}
  } else {
    if(prev===2){const sp=Math.hypot(b.vx,b.vz);if(sp>0.04){b.ax=b.vz/sp;b.az=-b.vx/sp;b.tiltV=1.6+sp*2.4;}}
    b.support=0;b.vy-=9.81*dt;b.tilt=Math.min(1.25,b.tilt+b.tiltV*dt);
  }
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
  return grounded;
}
const fields=['x','y','z','vx','vy','vz','yaw','tilt','tiltV','ax','az','support'] as const;
function compareBox(a:Box,b:Box,label:string) {for(const key of fields) assert.ok(Object.is(a[key],b[key])||Math.abs(a[key]-b[key])<1e-10,`${label} ${key}: ${a[key]} != ${b[key]}`);}
let seed=987654321;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const integ=createRustProductIntegrator();
try {
  for(let i=0;i<10000;i++) {
    const hy=0.1+rand()*0.3,top=rand()*2;
    const b={x:rand()*2,y:top+hy+(rand()-0.5)*0.2,z:rand()*2,vx:(rand()-0.5)*5,vy:(rand()-0.8)*4,vz:(rand()-0.5)*5,yaw:(rand()-0.5)*6,tilt:(rand()-0.5),tiltV:(rand()-0.5)*4,ax:1,az:0,hy,r:0.3,support:(i%5)} as Box;
    const s:ProductSupport={top,kind:1+i%4,conveyor:i%4===1,lat:(rand()-0.5),tx:1,tz:0,along:rand()*4,speed:rand()*2,blocked:i%7===0,stopper:i%3===0,length:3};
    const expected=structuredClone(b),actual=structuredClone(b),dt=1/60;
    assert.equal(integ.integrate(actual,s,dt),reference(expected,s,dt),`grounded ${i}`);
    compareBox(actual,expected,`random ${i}`);
  }
  // Factory with running conveyors, feeders, machine, robots, supports and contacts.
  const items=generateFactory({...DEFAULT_GEN,stages:1,fences:false,operators:false});
  const js=new Engine(),rust=new Engine();rust.productIntegrator=integ;
  for(const e of [js,rust]){e.sync(structuredClone(items));e.setRunning(true);}
  for(let frame=0;frame<100*60;frame++) {
    js.step(1/60);rust.step(1/60);await Promise.resolve();await Promise.resolve();
    assert.deepEqual(rust.stats,js.stats,`factory counters frame ${frame}`);
    assert.equal(rust.boxes.length,js.boxes.length,`box count frame ${frame}`);
    for(let i=0;i<js.boxes.length;i++) {assert.equal(rust.boxes[i].state,js.boxes[i].state);compareBox(rust.boxes[i],js.boxes[i],`frame ${frame} box ${i}`);}
  }
  assert.ok(js.stats.placed>0,'factory must produce');
  // Verify collector, pallet and lost-product bookkeeping stays host-identical.
  {
    const pallet=makeItem('crates',[-3,0,0]),collector=makeItem('collector',[3,0,0]);
    const left=new Engine(),right=new Engine();right.productIntegrator=integ;
    for(const e of [left,right]) {
      e.sync(structuredClone([pallet,collector]));
      e.spawn('carton',-3,2,0);e.spawn('carton',3,2,0);e.spawn('carton',0,2,3);
      e.setRunning(true);
    }
    for(let frame=0;frame<240;frame++) {
      left.step(1/60);right.step(1/60);
      assert.deepEqual(right.stats,left.stats,`support counters ${frame}`);
      assert.equal(right.boxes.length,left.boxes.length);
      for(let i=0;i<left.boxes.length;i++) compareBox(right.boxes[i],left.boxes[i],`support ${frame} box ${i}`);
    }
    assert.ok(left.stats.placed>0,'pallet should count a placement');
    assert.ok(left.stats.collected>0,'collector should count a product');
    assert.ok(left.stats.lost>0,'floor should count lost product');
  }
  // Sliding, falling and barrier response remain composed with host collision logic.
  const fence=makeItem('fence',[0,0,0],0,{points:[[0,-2],[0,2]],props:{height:2,panelWidth:1.5,gateOpen:false}});
  const a=new Engine(),b=new Engine();b.productIntegrator=integ;
  for(const e of [a,b]){e.sync([structuredClone(fence)]);const box=e.spawn('carton',-0.5,0.13,0);box.vx=4;e.setRunning(true);}
  for(let i=0;i<60;i++){a.step(1/60);b.step(1/60);compareBox(a.boxes[0],b.boxes[0],`fence ${i}`);}
  assert.ok(b.boxes[0].x<0,'box crossed fence');
} finally {integ.dispose();}
console.log('Rust product integration: 10,000 motion cases, live factory and fence scenario matched');
