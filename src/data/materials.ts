import { modelMaterialRef, parseModelMaterialRef } from '../utils/materialRef';
export { modelMaterialRef, parseModelMaterialRef } from '../utils/materialRef';
import { PRODUCTS } from './products';
import type { ImportedMaterial, SceneItem } from '../types';

/** Shared palette and stable references for building surfaces and color sensors. */
export const SURFACE_MATERIALS = [
  {id:'steel', name:'Steel', color:'#a2abb3'},
  {id:'mid', name:'Concrete', color:'#656d75'},
  {id:'wood', name:'Wood', color:'#ab855a'},
  {id:'rubber', name:'Rubber', color:'#1b1e21'},
  {id:'white', name:'White', color:'#eef1f3'},
  {id:'card', name:'Cardboard', color:'#b69568'},
  {id:'light', name:'Light metal', color:'#cdd3d9'},
  {id:'dark', name:'Dark metal', color:'#3b4147'},
  {id:'black', name:'Black', color:'#1f2327'},
  {id:'cardL', name:'Light cardboard', color:'#dcc79f'},
  {id:'woodD', name:'Dark wood', color:'#7b5f3f'},
  {id:'yellow', name:'Yellow', color:'#f2c230'},
  {id:'red', name:'Red', color:'#d4443a'},
  {id:'green', name:'Green', color:'#43a047'},
  {id:'blue', name:'Blue', color:'#2f6db0'},
  {id:'orange', name:'Orange', color:'#e07b2a'},
] as const;

export interface MaterialOption { id:string; name:string; color:string; category:string; preview?:string }
/** An explicit removal suppresses the original preview; an override wins. */
export function materialPreview(material:ImportedMaterial):string | undefined {
  return material.textures.map === null ? undefined : material.textures.map?.dataUrl ?? material.preview;
}
/** Include hidden catalog definitions as well as scene models; duplicate scene
 * instances are intentionally distinct because their materials can be edited. */
const optionCache=new WeakMap<readonly SceneItem[],MaterialOption[]>();
export function materialOptions(items:readonly SceneItem[]):MaterialOption[] {
  const cached=optionCache.get(items);if(cached)return cached;
  const building:MaterialOption[]=SURFACE_MATERIALS.map(m=>({id:m.id,name:m.name,color:m.color,category:'Building materials'}));
  const products:MaterialOption[]=PRODUCTS.map(p=>({id:`product:${p.id}`,name:p.name,color:`#${p.color.toString(16).padStart(6,'0')}`,category:'Workpiece materials'}));
  const seen=new Set<string>(), imported:MaterialOption[]=[];
  for(const item of items) {
    if(!item.imported || seen.has(item.id))continue;
    seen.add(item.id);
    item.imported.materials.forEach((material,index)=>imported.push({
      id:modelMaterialRef(item.id,index),name:`${item.name} · ${material.name || `Material ${index+1}`}`,
      color:material.color.toLowerCase(),category:'Imported materials',preview:materialPreview(material),
    }));
  }
  const result=[...building,...imported,...products];optionCache.set(items,result);return result;
}

export function surfaceMaterialColor(ref:string, items:readonly SceneItem[]):string | undefined {
  const built=SURFACE_MATERIALS.find(m=>m.id===ref);if(built)return built.color;
  if(ref.startsWith('product:')) {const product=PRODUCTS.find(p=>p.id===ref.slice(8));return product ? `#${product.color.toString(16).padStart(6,'0')}` : undefined;}
  const model=parseModelMaterialRef(ref);
  return model ? items.find(item=>item.id===model.id)?.imported?.materials[model.index]?.color : undefined;
}

/** A surface can refer to a hidden catalog source whose triplanar shader also
 * requires the WebGL renderer. */
export function surfaceUsesWorldProjection(item:SceneItem,items:readonly SceneItem[]):boolean {
  if (!['platform','stairs','wall'].includes(item.kind) || typeof item.props.surfaceMaterial !== 'string') return false;
  const ref=parseModelMaterialRef(item.props.surfaceMaterial);
  return !!ref && items.find(entry=>entry.id===ref.id)?.imported?.materials[ref.index]?.worldProjection === true;
}
