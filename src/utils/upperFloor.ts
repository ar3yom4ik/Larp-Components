import type { SceneItem } from "../types";

/** One definition of upper-floor dimensions for rendering, support and physics.
 * Clamp imported/old project values too, not just the inspector sliders. */
export function upperFloorDimensions(item: Pick<SceneItem, "kind" | "props" | "scale">) {
  const dim = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
  };
  const width = dim(item.props.width, item.kind === "stairs" ? 1.2 : 4, .4, 20);
  const depth = dim(item.props.depth, 4, .4, 20);
  const length = dim(item.props.length, 4, .4, 20);
  const height = dim(item.props.height, 2.4, 0, 10);
  // Scale is applied by the parent group. Size the risers in world units so
  // enlarged stairs remain climbable; cap shapes for pathological projects.
  const scale = dim(item.scale, 1, .2, 3);
  const steps = Math.max(2, Math.min(150, Math.ceil(height * scale / .2)));
  return {width, depth, length, height, steps};
}

/** Editable platform outline in local X/Z coordinates (legacy rectangles need no stored points). */
export function platformCorners(item:Pick<SceneItem,'kind'|'props'|'scale'|'points'>):[number,number][] {
  if(item.points?.length===4 && validPlatformCorners(item.points))return item.points;
  const {width,depth}=upperFloorDimensions(item);
  return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
}
export function validPlatformCorners(points:readonly [number,number][]):boolean {
  if(points.length!==4)return false;
  let sign=0;
  for(let i=0;i<4;i++) {
    const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4];
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(Math.abs(cross)<.01)return false;
    if(sign && Math.sign(cross)!==sign)return false;sign=Math.sign(cross);
  }
  return true;
}
export function containsPlatformPoint(points:readonly [number,number][],x:number,z:number):boolean {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if(((a[1]>z)!==(b[1]>z)) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
