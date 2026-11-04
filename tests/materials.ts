import assert from 'node:assert/strict';
import {makeItem} from '../src/data/library';
import {materialOptions,materialPreview,surfaceUsesWorldProjection,modelMaterialRef,parseModelMaterialRef,surfaceMaterialColor} from '../src/data/materials';
import {importedProductId,itemsWithWorkpieces,updateWorkpieceCatalog} from '../src/data/products';
import {copySceneItems} from '../src/utils/sceneClipboard';
import {serializeProject,parseProject} from '../src/utils/project';
import {Engine} from '../src/sim/engine';
import {signalChannelKey} from '../src/utils/signalChannels';
import {defaultComponentGraph,compileComponentGraph} from '../src/gen/graph/componentCompile';
import {makeNode,parseGraph,serializeGraph} from '../src/gen/graph/graph';
import {setChannel} from '../src/gen/graph/signal';
import type {ImportedMaterial,ImportedModelData} from '../src/types';

const mat:ImportedMaterial={name:'Gloss paint',color:'#00aa66',roughness:.2,metalness:.7,opacity:1,emissive:'#000000',emissiveIntensity:1,doubleSided:false,mapStrength:1,normalStrength:1,roughnessStrength:1,metalnessStrength:1,aoStrength:1,emissiveMapStrength:1,alphaStrength:1,bumpStrength:1,displacementStrength:0,present:[],preview:'data:image/jpeg;base64,Yg==',textures:{map:{name:'green.png',dataUrl:'data:image/png;base64,YQ=='}}};
const model:ImportedModelData={asset:{id:'painted-model',entry:'part.obj',files:[{path:'part.obj',dataUrl:'data:text/plain;base64,YQ=='}]},axis:'y',units:'m',materials:[mat],meshCount:1,triangleCount:12,sourceSize:[.3,.2,.3]};
const base=makeItem('imported-model',[20,0,0],0,{name:'Source',imported:model});
const duplicate=makeItem('imported-model',[24,0,0],0,{name:'Edited duplicate',imported:{...model,materials:[{...mat,color:'#00bb77'}]},props:{catalogBaseId:base.id}});
const ref=modelMaterialRef(duplicate.id,0);
assert.deepEqual(parseModelMaterialRef(ref),{id:duplicate.id,index:0});
assert.equal(updateWorkpieceCatalog([base,duplicate]).length,1,'unreferenced placements still share a catalog base');
const deck=makeItem('platform',[0,0,8],0,{props:{surfaceMaterial:ref}});
const sensor=makeItem('color-sensor',[0,0,0],0,{props:{range:3},signalChannels:[{port:1,mode:'match',material:'#ff0000',materialRef:ref}]});
const catalog=updateWorkpieceCatalog([base,duplicate,deck,sensor]);
assert.equal(catalog.length,2,'a specifically referenced duplicate survives removal or a graph rebuild');
const available=itemsWithWorkpieces([deck,sensor],catalog);
assert.equal(surfaceMaterialColor(ref,available),'#00bb77');
assert.ok(materialOptions(available).some(option=>option.id===ref && option.name.includes('Gloss paint') && option.preview?.startsWith('data:image/')),'palette includes names, base colors and texture previews');
assert.equal(materialOptions(available),materialOptions(available),'all pickers reuse immutable palette options');
const restored=parseProject(serializeProject({items:[deck,sensor],workpieces:catalog,projectName:'materials',layoutName:'materials',activeLayoutId:null}));
assert.equal(restored.items[0].props.surfaceMaterial,ref);assert.equal(restored.items[1].signalChannels?.[0].materialRef,ref);
assert.equal(surfaceMaterialColor(ref,itemsWithWorkpieces(restored.items,restored.workpieces)),'#00bb77');
assert.equal(restored.workpieces.find(item=>item.id===duplicate.id)?.imported?.materials[0].preview,mat.preview,'source texture thumbnail survives project round-trip');
assert.equal(materialPreview(mat),mat.textures.map?.dataUrl,'texture override takes precedence');
assert.equal(materialPreview({...mat,textures:{map:null}}),undefined,'removed texture falls back to the color swatch');
assert.equal(surfaceUsesWorldProjection(deck,[{...duplicate,imported:{...model,materials:[{...mat,worldProjection:true}]}}]),true,'building references to hidden projected materials require WebGL');
const copied=copySceneItems([duplicate,deck,sensor],[0,0,5]);
assert.equal(copied[1].props.surfaceMaterial,modelMaterialRef(copied[0].id,0));
assert.equal(copied[2].signalChannels?.[0].materialRef,modelMaterialRef(copied[0].id,0));

// Sensor references follow edits to their source material; the stored color is
// still a useful fallback if that source no longer exists.
const hidden={...duplicate,visible:false};
const engine=new Engine();engine.sync([sensor,hidden]);engine.spawn(importedProductId(hidden),0,.85,0);engine.setRunning(true);engine.step(1/60);
assert.equal(engine.signalState.get(signalChannelKey(sensor.id,1)),true,'live referenced material wins over the old color snapshot');
const edited={...hidden,imported:{...hidden.imported!,materials:[{...mat,color:'#123456'}]}};
engine.sync([sensor,edited]);engine.step(1/60);
assert.equal(engine.signalState.get(signalChannelKey(sensor.id,1)),true,'color matching follows subsequent material edits');

// Factory graphs retain the same material identity in both node and scene.
let graph=defaultComponentGraph();const node=makeNode('part.platform',0,0,{surfaceMaterial:ref});
const color=makeNode('part.color-sensor',300,500);
const belt=graph.nodes.find(n=>n.type==='part.conveyor')!;
// A physical mount activates this otherwise standalone sensor.
graph={...graph,nodes:[...graph.nodes,node,color],links:[...graph.links,{id:'material-mount',from:{node:belt.id,port:'attach'},to:{node:color.id,port:'mount'}}]};
graph=setChannel(graph,color.id,1,{material:'#00bb77',materialRef:ref});
graph=parseGraph(serializeGraph(graph));
const built=compileComponentGraph(graph).plant!;
assert.equal(built.items.find(i=>i.kind==='platform')?.props.surfaceMaterial,ref);
assert.equal(built.items.find(i=>i.kind==='color-sensor')?.signalChannels?.[0].materialRef,ref);
const retained=updateWorkpieceCatalog([base,duplicate],updateWorkpieceCatalog([base]),built.items);
assert.ok(retained.some(item=>item.id===duplicate.id),'graph build retains a source referenced only in the generated scene');
console.log('materials: named previews, referenced catalog lifetime, live sensor edits, graph build, copy and project round-trip OK');
