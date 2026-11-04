import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { ImportedModelData, ModelUnits } from "../types";
import { extension, getCachedModel, materialsOf, removeModelMeshes, TEXTURE_SLOTS } from "../utils/modelImport";
import { applyWorldProjection } from "../utils/worldProjection";
import { modelAxisRotation } from "../utils/modelAxis";
import { buildImportedCollision, importedCollision, registerImportedCollision } from "../utils/modelCollision";

type Pbr = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
type SourceMaterial = THREE.Material & { color?: THREE.Color; emissive?: THREE.Color; map?: THREE.Texture | null; normalMap?: THREE.Texture | null; roughnessMap?: THREE.Texture | null; metalnessMap?: THREE.Texture | null; aoMap?: THREE.Texture | null; emissiveMap?: THREE.Texture | null; alphaMap?: THREE.Texture | null; bumpMap?: THREE.Texture | null; displacementMap?: THREE.Texture | null; vertexColors?: boolean };
type MapName = "mapStrength" | "roughnessStrength" | "metalnessStrength" | "emissiveMapStrength" | "alphaStrength";
type Uniforms = Record<MapName, {value: number}> & {worldScale:{value:number}};

function makePbr(src: THREE.Material): Pbr {
  const s = src as SourceMaterial;
  let out: Pbr;
  if (src instanceof THREE.MeshStandardMaterial) out = src.clone();
  else {
    out = new THREE.MeshStandardMaterial({color: s.color || "#cccccc", emissive: s.emissive || "#000000", vertexColors: !!s.vertexColors, side: src.side, opacity: src.opacity, transparent: src.transparent, depthWrite: src.depthWrite, alphaTest: src.alphaTest});
    out.name = src.name;
    for (const slot of TEXTURE_SLOTS) (out as unknown as Record<string, unknown>)[slot] = s[slot] || null;
  }
  const uniforms: Uniforms = {mapStrength: {value:1}, roughnessStrength: {value:1}, metalnessStrength: {value:1}, emissiveMapStrength: {value:1}, alphaStrength: {value:1}, worldScale:{value:1}};
  out.userData.larpUniforms = uniforms;
  // Three.js exposes no generic per-map mix for these PBR maps. Keep physical scalar
  // parameters independent, and mix the texture modulation with white at strength 0.
  out.onBeforeCompile = (shader) => {
    shader.uniforms.larpMapStrength = uniforms.mapStrength;
    shader.uniforms.larpRoughnessStrength = uniforms.roughnessStrength;
    shader.uniforms.larpMetalnessStrength = uniforms.metalnessStrength;
    shader.uniforms.larpEmissiveStrength = uniforms.emissiveMapStrength;
    shader.uniforms.larpAlphaStrength = uniforms.alphaStrength;
    shader.fragmentShader = `uniform float larpMapStrength;\nuniform float larpRoughnessStrength;\nuniform float larpMetalnessStrength;\nuniform float larpEmissiveStrength;\nuniform float larpAlphaStrength;\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D( map, vMapUv );
      #ifdef DECODE_VIDEO_TEXTURE
        sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
      #endif
      diffuseColor *= mix( vec4(1.0), sampledDiffuseColor, larpMapStrength );
    #endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `float roughnessFactor = roughness;
    #ifdef USE_ROUGHNESSMAP
      vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
      roughnessFactor *= mix( 1.0, texelRoughness.g, larpRoughnessStrength );
    #endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", `float metalnessFactor = metalness;
    #ifdef USE_METALNESSMAP
      vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
      metalnessFactor *= mix( 1.0, texelMetalness.b, larpMetalnessStrength );
    #endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#ifdef USE_EMISSIVEMAP
      vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
      #ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
        emissiveColor = sRGBTransferEOTF( emissiveColor );
      #endif
      totalEmissiveRadiance *= mix( vec3(1.0), emissiveColor.rgb, larpEmissiveStrength );
    #endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <alphamap_fragment>", `#ifdef USE_ALPHAMAP
      diffuseColor.a *= mix( 1.0, texture2D( alphaMap, vAlphaMapUv ).g, larpAlphaStrength );
    #endif`);
    if (out.userData.larpWorldProjection === true) {
      shader.uniforms.larpWorldScale = uniforms.worldScale;
      applyWorldProjection(shader);
    }
  };
  out.customProgramCacheKey = () => `larp-v2-pbr-map-strength-wpo-${out.userData.larpWorldProjection === true ? 1 : 0}`;
  return out;
}

function cloneModel(root: THREE.Object3D, clips: THREE.AnimationClip[], hidden: readonly number[] = [], materialOnlyIndex?:number) {
  const originalMaterials = materialsOf(root);
  if(materialOnlyIndex!==undefined) {
    const pbrMaterials:Pbr[]=[];
    if(originalMaterials[materialOnlyIndex])pbrMaterials[materialOnlyIndex]=makePbr(originalMaterials[materialOnlyIndex]);
    return {object:new THREE.Group(),pbrMaterials,originalMaterials,clips};
  }
  const pbrMaterials = originalMaterials.map(makePbr);
  const lookup = new Map(originalMaterials.map((material, index) => [material, pbrMaterials[index]]));
  const object = removeModelMeshes(cloneSkeleton(root), hidden);
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true; node.receiveShadow = true;
    // An animated skinned mesh can leave the bind-pose bounding sphere, and Three does
    // not update it per frame, so frustum culling can make it vanish (for example after
    // changing graphics settings recreates the renderer). Never cull skinned meshes.
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) node.frustumCulled = false;
    node.material = Array.isArray(node.material) ? node.material.map((m) => lookup.get(m) || m) : lookup.get(node.material) || node.material;
  });
  return {object, pbrMaterials, originalMaterials, clips};
}
const UNIT_SCALE: Record<Exclude<ModelUnits, "auto">, number> = {m: 1, mm: .001, cm: .01, in: .0254, ft: .3048};

/** Shared source geometry + per-instance cloned PBR materials, so edits never leak to duplicates. */
export function useImportedModelInstance(model: ImportedModelData, materialOnlyIndex?:number) {
  const { gl, invalidate } = useThree();
  const [loaded, setLoaded] = useState<ReturnType<typeof cloneModel> | null>(null);
  const [error, setError] = useState("");
  const overrideMaps = useRef(new Map<string, {data: string; texture: THREE.Texture}>());
  const projectedMaps = useRef(new Map<string, {source:THREE.Texture; texture:THREE.Texture}>());
  const asset = model.asset;
  useEffect(() => {
    let alive = true;
    let instance: ReturnType<typeof cloneModel> | null = null;
    setLoaded(null); setError("");
    getCachedModel(asset).then(({root, clips}) => {
      if (!alive) return;
      if (materialOnlyIndex === undefined && !importedCollision(model)) {
        const collision = buildImportedCollision(root);
        if (collision) registerImportedCollision(asset, collision);
      }
      instance = cloneModel(root, clips, model.hiddenMeshes, materialOnlyIndex); setLoaded(instance); gl.shadowMap.needsUpdate = true; invalidate();
    }).catch((cause: unknown) => { if (alive) { setError(cause instanceof Error ? cause.message : String(cause)); invalidate(); } });
    const cache = overrideMaps.current, projected = projectedMaps.current;
    return () => { alive = false; if (instance) instance.pbrMaterials.forEach((m) => m.dispose()); cache.forEach((v) => v.texture.dispose()); cache.clear(); projected.forEach((v) => v.texture.dispose()); projected.clear(); };
  }, [asset, gl, invalidate, materialOnlyIndex, JSON.stringify(model.hiddenMeshes ?? [])]);

  useEffect(() => {
    if (!loaded) return;
    const cache = overrideMaps.current;
    loaded.pbrMaterials.forEach((mat, index) => {
      const config = model.materials[index];
      if (!config) return;
      const original = loaded.originalMaterials[index] as SourceMaterial;
      mat.color.set(config.color); mat.roughness = config.roughness; mat.metalness = config.metalness;
      mat.opacity = config.opacity; mat.emissive.set(config.emissive); mat.emissiveIntensity = config.emissiveIntensity;
      mat.side = config.doubleSided ? THREE.DoubleSide : original.side;
      mat.normalScale.setScalar(config.normalStrength); mat.aoMapIntensity = config.aoStrength;
      mat.bumpScale = config.bumpStrength; mat.displacementScale = config.displacementStrength;
      const uniforms = mat.userData.larpUniforms as Uniforms;
      for (const key of ["mapStrength", "roughnessStrength", "metalnessStrength", "emissiveMapStrength", "alphaStrength"] as MapName[]) uniforms[key].value = config[key];
      const projection = config.worldProjection === true;
      let changed = mat.userData.larpWorldProjection !== projection;
      mat.userData.larpWorldProjection = projection;
      uniforms.worldScale.value = Math.max(.01,Math.min(100,config.worldProjectionScale ?? 1));
      for (const slot of TEXTURE_SLOTS) {
        const key = `${index}:${slot}`, override = config.textures[slot];
        let texture = original[slot] || null;
        if (override === null) texture = null;
        else if (override) {
          const existing = cache.get(key);
          if (existing && existing.data !== override.dataUrl) { existing.texture.dispose(); cache.delete(key); }
          if (!cache.has(key)) {
            const tex = new THREE.TextureLoader().load(override.dataUrl, () => { gl.shadowMap.needsUpdate = true; invalidate(); }, undefined, () => { console.warn(`Failed to load texture for ${slot}`); });
            const source = original[slot];
            if (source) { tex.flipY = source.flipY; tex.wrapS = source.wrapS; tex.wrapT = source.wrapT; tex.repeat.copy(source.repeat); tex.offset.copy(source.offset); tex.rotation = source.rotation; tex.center.copy(source.center); tex.channel = source.channel; }
            else tex.flipY = !["gltf", "glb"].includes(extension(asset.entry));
            tex.colorSpace = slot === "map" || slot === "emissiveMap" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            cache.set(key, {data: override.dataUrl, texture: tex});
          }
          texture = cache.get(key)!.texture;
        } else if (cache.has(key)) { cache.get(key)!.texture.dispose(); cache.delete(key); }
        if (projection && texture) {
          const projected = projectedMaps.current.get(key);
          if (!projected || projected.source !== texture) {
            projected?.texture.dispose();
            const copy = texture.clone(); copy.wrapS = copy.wrapT = THREE.RepeatWrapping; copy.needsUpdate = true;
            projectedMaps.current.set(key,{source:texture,texture:copy});
          }
          texture = projectedMaps.current.get(key)!.texture;
        }
        if (mat[slot] !== texture) { mat[slot] = texture; changed = true; }
      }
      const transparent = config.opacity < 1 || !!mat.alphaMap || original.transparent;
      if (mat.transparent !== transparent) { mat.transparent = transparent; changed = true; }
      // Enable transparency from a color image carrying an alpha channel as well.
      if (changed) mat.needsUpdate = true;
    });
    gl.shadowMap.needsUpdate = true; invalidate();
  }, [loaded, model.materials, asset.entry, gl, invalidate]);

  const transform = useMemo(() => {
    if (!loaded || materialOnlyIndex!==undefined) return {scale:1, offset: [0, 0, 0] as [number, number, number]};
    // Three's loaders already convert glTF, FBX and COLLADA axes to Y-up.
    const temp = new THREE.Group(); temp.rotation.set(...modelAxisRotation(model.axis));
    const boundsObject = loaded.object.clone(true);
    temp.add(boundsObject); temp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(temp);
    const size = box.getSize(new THREE.Vector3());
    let scale = model.units === "auto" ? (Math.max(size.x, size.y, size.z) > 50 ? .001 : 1) : UNIT_SCALE[model.units];
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;
    // Place the bounds on the floor; do not alter the imported geometry itself.
    const offset: [number, number, number] = box.isEmpty() ? [0,0,0] : [-((box.min.x + box.max.x)/2)*scale, -box.min.y*scale, -((box.min.z + box.max.z)/2)*scale];
    temp.remove(boundsObject);
    return {scale, offset};
  }, [loaded, model.axis, model.units, materialOnlyIndex]);

  return {loaded, error, transform};
}

export function ImportedModel({ model, id }: { model: ImportedModelData; id: string }) {
  const {loaded, error, transform} = useImportedModelInstance(model);
  if (error) return <mesh userData={{importError:error, itemId:id}} position={[0,.5,0]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="#c04444" wireframe /></mesh>;
  if (!loaded) return <mesh position={[0,.5,0]}><boxGeometry args={[.8,1,.8]} /><meshStandardMaterial color="#96a2aa" wireframe /></mesh>;
  return <group userData={{isImportedModel:true, itemId:id}} position={transform.offset} scale={transform.scale}><group rotation={modelAxisRotation(model.axis)}><primitive object={loaded.object} /></group></group>;
}
