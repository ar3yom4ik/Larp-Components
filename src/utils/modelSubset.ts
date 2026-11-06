import * as THREE from "three";
import {buildImportedCollision} from "./modelCollision";

/** Mesh indices are stable for every instance loaded from the same source asset. */
export function modelMeshList(root: THREE.Object3D) {
  const meshes: {index:number;name:string}[]=[];
  root.traverse(node=>{if(node instanceof THREE.Mesh && node.geometry?.getAttribute("position")) meshes.push({index:meshes.length,name:node.name || `Mesh ${meshes.length+1}`});});
  return meshes;
}
export function removeModelMeshes(root: THREE.Object3D, hidden: readonly number[]) {
  const omitted=new Set(hidden), remove:THREE.Object3D[]=[]; let index=0;
  root.traverse(node=>{if(node instanceof THREE.Mesh && node.geometry?.getAttribute("position")) {if(omitted.has(index))remove.push(node);index++;}});
  // Replace only the surface with a transform group. Children (including bones
  // and nested meshes) keep their hierarchy and stay visible/renderable.
  let result=root;
  for(const node of remove) {
    const group=new THREE.Group().copy(node,false), parent=node.parent;
    while(node.children.length) group.add(node.children[0]);
    if(parent) {parent.add(group);parent.remove(node);} else result=group;
  }
  result.updateMatrixWorld(true);
  return result;
}
export function modelSubset(root:THREE.Object3D, hidden:readonly number[]) {
  const clone=removeModelMeshes(root.clone(true),hidden);
  const bounds=new THREE.Box3().setFromObject(clone), size=bounds.getSize(new THREE.Vector3());
  return {sourceSize: bounds.isEmpty() ? undefined : [size.x,size.y,size.z] as [number,number,number], collision:buildImportedCollision(clone)};
}
