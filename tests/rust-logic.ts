import assert from 'node:assert/strict';
import { Engine, type Box } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { distanceToSegment } from '../src/sim/navigation';
import { createRustLogicStepper } from '../src/sim/wasm/kernel';
import type { SceneItem } from '../src/types';

const stepper=createRustLogicStepper();
const num=(value:unknown,fallback:number)=>{const n=typeof value==='number'?value:Number(value);return Number.isFinite(n)?n:fallback;};
function reference(items:SceneItem[],boxes:Box[],triggers:Map<string,SceneItem[]>,signals:Map<string,boolean>) {
  for(const item of items) {
    let signal=item.kind==='button'?signals.get(item.id)===true:false;
    if(item.kind==='laser') {
      const range=Math.max(0.5,num(item.props.range,3))/2, yaw=item.rotation*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
      const a:[number,number]=[item.position[0]-range*c,item.position[2]+range*s];
      const b:[number,number]=[item.position[0]+range*c,item.position[2]-range*s];
      signal=boxes.some(box=>box.state!=='dead' && box.state!=='dying' && Math.abs(box.y+box.hy-1)<0.5 && distanceToSegment(box.x,box.z,a,b).distance<box.r+0.06);
      if(item.props.normallyClosed===true) signal=!signal;
    } else if(item.kind==='sensor') {
      const radius=Math.max(0.2,num(item.props.radius,0.8));
      signal=boxes.some(box=>box.state!=='dead' && Math.hypot(box.x-item.position[0],box.z-item.position[2])<=radius);
    } else if(item.kind==='plc') signal=(triggers.get(item.id)?.some(i=>signals.get(i.id)===true)??false)||item.props.signal===true;
    signals.set(item.id,signal);
  }
}
let seed=789123;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try {
  for(let scenario=0;scenario<3000;scenario++) {
    const items=Array.from({length:1+scenario%10},(_,i)=>{
      const kind=(['button','laser','sensor','plc'] as const)[Math.floor(rand()*4)];
      return makeItem(kind,[(rand()-0.5)*4,0,(rand()-0.5)*4],rand()*360,{props:{range:rand()*4,radius:rand()*2,normallyClosed:rand()<0.5,signal:rand()<0.25}});
    });
    if(scenario%31===0 && items.length>1) items[1].id=items[0].id;
    const triggers=new Map<string,SceneItem[]>();
    for(const item of items) if(rand()<0.8) {
      const target=items[Math.floor(rand()*items.length)].id;
      const list=triggers.get(target)??[];list.push(item);triggers.set(target,list);
    }
    const states=['free','held','inside','dead','dying'] as const;
    const boxes=Array.from({length:scenario%8},()=>({x:(rand()-0.5)*5,y:rand()*2,z:(rand()-0.5)*5,hy:0.13,r:0.2,state:states[Math.floor(rand()*states.length)]} as Box));
    if(scenario%37===0 && boxes.length) boxes[0].y=NaN;
    const signals=new Map(items.map(item=>[item.id,rand()<0.5]));
    const expected=new Map(signals),actual=new Map(signals);
    reference(items,boxes,triggers,expected);stepper.step(items,boxes,triggers,actual);
    assert.deepEqual(actual,expected,`random ordered logic scenario ${scenario}`);
  }
  // Exercise the actual engine scheduling with a button -> PLC -> PLC chain,
  // a sensor and laser connected to the same PLC, and state changes while running.
  const p2=makeItem('plc',[0,0,0],0),p1=makeItem('plc',[0,0,0],0,{props:{connectedTo:p2.id}});
  const button=makeItem('button',[0,0,0],0,{props:{connectedTo:p1.id}});
  const sensor=makeItem('sensor',[3,0,0],0,{props:{connectedTo:p1.id,radius:0.6}});
  const laser=makeItem('laser',[5,0,0],45,{props:{connectedTo:p1.id,range:2,normallyClosed:true}});
  const items=[p2,button,laser,p1,sensor]; // reverse chain intentionally has one-step latency
  const a=new Engine(),b=new Engine(); b.logicStepper=stepper;
  for(const e of [a,b]) {e.sync(structuredClone(items));e.spawn('carton',3,0.9,0);e.setRunning(true);}
  for(let frame=0;frame<120;frame++) {
    if(frame===20||frame===40) for(const e of [a,b]) e.setButton(button.id,frame===20);
    if(frame===70) for(const e of [a,b]) e.boxes[0].state='dying';
    a.step(1/60);b.step(1/60);
    assert.deepEqual([...b.signalState],[...a.signalState],`engine signal frame ${frame}`);
  }
} finally {stepper.dispose();}
assert.throws(()=>stepper.step([],[],new Map(),new Map()),/disposed/);
console.log('Rust automation: 3,000 ordered random circuits and a live button/PLC/sensor/laser chain match TypeScript');
