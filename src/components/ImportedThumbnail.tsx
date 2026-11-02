import {useEffect,useState} from 'react';
import * as THREE from 'three';
import type {ImportedModelData} from '../types';
import {getCachedModel,materialsOf} from '../utils/modelImport';
import {PartIcon} from './PartIcon';

// A lightweight, deterministic wire/surface preview. It uses Canvas 2D rather
// than allocating a WebGL context per catalog entry, even for large catalogs.
const cache=new Map<string,Promise<string>>();
async function preview(model:ImportedModelData) {
  const {root}=await getCachedModel(model.asset); root.updateMatrixWorld(true);
  const materials=materialsOf(root), triangles:{p:THREE.Vector3[];color:string;depth:number}[]=[];
  const meshes:THREE.Mesh[]=[]; let meshIndex=0; const hidden=new Set(model.hiddenMeshes ?? []); root.traverse(node=>{if(node instanceof THREE.Mesh && node.geometry?.getAttribute('position')) {if(!hidden.has(meshIndex)) meshes.push(node);meshIndex++;}});
  const total=meshes.reduce((sum,m)=>sum+(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);
  const stride=Math.max(1,Math.ceil(total/1200)); let counter=0;
  for(const mesh of meshes) {
    const positions=mesh.geometry.getAttribute('position'), index=mesh.geometry.index;
    const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material, materialIndex=materials.indexOf(material);
    const color=model.materials[materialIndex]?.color ?? `#${(material as THREE.MeshStandardMaterial).color?.getHexString?.()??'a9b8c7'}`;
    const count=index?.count??positions.count;
    for(let i=0;i+2<count;i+=3) {
      if(counter++%stride) continue;
      const p=[0,1,2].map(j=>{const v=new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);return model.axis === 'z' ? v.applyAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2) : v;});
      triangles.push({p,color,depth:p.reduce((s,v)=>s+v.x+v.z+v.y*.4,0)/3});
    }
  }
  if(!triangles.length) throw new Error('No preview geometry');
  const project=(v:THREE.Vector3)=>[v.x-v.z*.75,-v.y+(v.x+v.z)*.38] as const;
  const points=triangles.flatMap(tri=>tri.p.map(project));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const scale=104/Math.max(maxX-minX,maxY-minY,1e-6), cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable');
  triangles.sort((a,b)=>a.depth-b.depth);
  for(const triangle of triangles) {ctx.beginPath();triangle.p.forEach((v,i)=>{const [x,y]=project(v); if(i===0)ctx.moveTo(64+(x-cx)*scale,64+(y-cy)*scale);else ctx.lineTo(64+(x-cx)*scale,64+(y-cy)*scale)});ctx.closePath();ctx.fillStyle=triangle.color;ctx.fill();ctx.strokeStyle='rgba(16,25,34,.25)';ctx.lineWidth=.4;ctx.stroke();}
  return canvas.toDataURL('image/png');
}
export function ImportedThumbnail({model,className=''}:{model:ImportedModelData;className?:string}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    let alive=true;setUrl('');
    const key=JSON.stringify([model.asset.id,model.axis,model.hiddenMeshes,model.materials.map(m=>[m.color,m.opacity])]);
    let result=cache.get(key); if(!result){result=preview(model);cache.set(key,result);if(cache.size>120)cache.delete(cache.keys().next().value!);}
    void result.then(value=>{if(alive)setUrl(value)}).catch(()=>{cache.delete(key)});
    return ()=>{alive=false};
  },[model]);
  return url?<img className={className} src={url} alt="" draggable={false}/>:<PartIcon kind="imported-model" className={className}/>;
}
