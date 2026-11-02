import type {SceneItem, Vec3} from '../types';
import {samplePath} from '../sim/spline';
import {itemLocalToWorld, rotateVector, rotationMatrix} from './transform';
import {conveyorWidth} from './conveyor';

/** A sensor's normalized station follows curved, elevated or rotated belts. */
function pathFor(belt: SceneItem) { return samplePath(belt.points ?? [[-2,0],[2,0]],.1,belt.pointHeights); }
export function mountedSensorPose(belt: SceneItem, fraction: number) {
  const path = pathFor(belt), distance = Math.max(0,Math.min(1,fraction))*path.length;
  let i=0; while(i<path.s.length-2 && path.s[i+1]<distance) i++;
  const t=(distance-path.s[i])/(path.s[i+1]-path.s[i] || 1);
  const local:Vec3=[path.x[i]+(path.x[i+1]-path.x[i])*t,.66+path.y[i]+(path.y[i+1]-path.y[i])*t,path.z[i]+(path.z[i+1]-path.z[i])*t];
  const direction=rotateVector(rotationMatrix(belt.rotationX??0,belt.rotation,belt.rotationZ??0),[path.tx[i],0,path.tz[i]]);
  return {position:itemLocalToWorld(belt,local,false),rotation:Math.atan2(-direction[2],direction[0])*180/Math.PI+90};
}
export function nearestSensorFraction(belt:SceneItem, point:Vec3) {
  const path=pathFor(belt); let best=Infinity, fraction=0;
  for(let i=0;i<path.x.length-1;i++) {
    const a=itemLocalToWorld(belt,[path.x[i],.66+path.y[i],path.z[i]],false), b=itemLocalToWorld(belt,[path.x[i+1],.66+path.y[i+1],path.z[i+1]],false);
    const dx=b[0]-a[0], dz=b[2]-a[2], len=dx*dx+dz*dz||1;
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[2]-a[2])*dz)/len));
    const d=(point[0]-a[0]-t*dx)**2+(point[2]-a[2]-t*dz)**2;
    if(d<best){best=d;fraction=(path.s[i]+t*(path.s[i+1]-path.s[i]))/path.length;}
  }
  return fraction;
}
export function resolveMountedSensors(items: SceneItem[]): SceneItem[] {
  const belts=new Map(items.filter(i=>i.kind==='conveyor'||i.kind==='roller').map(i=>[i.id,i]));
  let changed=false;
  const out=items.map(item=>{
    if((item.kind!=='laser'&&item.kind!=='sensor') || !item.props.mountedTo) return item;
    const belt=belts.get(String(item.props.mountedTo)); if(!belt) return item;
    const fraction=Number(item.props.mountPosition ?? .85), pose=mountedSensorPose(belt,Number.isFinite(fraction)?fraction:.85);
    const range=conveyorWidth(belt)+.2;
    if(item.position.every((x,i)=>Math.abs(x-pose.position[i])<1e-8) && Math.abs(item.rotation-pose.rotation)<1e-8 && (item.kind!=='laser' || item.props.range===range)) return item;
    changed=true;
    return {...item,...pose,props:item.kind==='laser'?{...item.props,range}:item.props};
  });
  return changed?out:items;
}
