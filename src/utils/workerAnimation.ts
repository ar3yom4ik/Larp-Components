import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { gunzipSync } from "fflate";
import { readPackedAsset } from "./embeddedAsset";
import type { ImportedModelData, ModelAsset, WorkerMotionRole } from "../types";
import { describeImportedModel, getCachedModel, readBlobAsDataUrl } from "./modelImport";

/** CC0 Quaternius human, with Mixamo-style Hips/Spine/LeftArm bone names. */
const DEFAULT_WORKER_ID = "builtin-quaternius-human-v1";
let defaultPromise: Promise<{model: ImportedModelData; root: THREE.Object3D; clips: THREE.AnimationClip[]}> | null = null;
export function defaultWorker() {
  if (!defaultPromise) defaultPromise = (async () => {
    const packed=await readPackedAsset("larp-packed-worker", "/src/assets/default-worker.glb.gz");
    const bytes=packed[0] === 0x1f && packed[1] === 0x8b ? gunzipSync(packed) : packed;
    const dataUrl=await readBlobAsDataUrl(new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength) as ArrayBuffer], {type:"application/octet-stream"}));
    const asset:ModelAsset = {id:DEFAULT_WORKER_ID, entry:"default-worker.glb", files:[{path:"default-worker.glb", dataUrl}]};
    const {root, clips} = await getCachedModel(asset);
    const model = describeImportedModel(asset, root, clips);
    return {model, root, clips};
  })().catch((error) => {defaultPromise = null; throw error;});
  return defaultPromise;
}

export function canonicalBoneName(name: string) {
  const clean = name.replace(/^.*[\/|]/, "").replace(/^mixamorig\d*[:_\-]?/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const aliases: Record<string,string> = {pelvis:"hips", hip:"hips", leftupleg:"leftupleg", rightupleg:"rightupleg", leftlowerleg:"leftleg", rightlowerleg:"rightleg", leftupperleg:"leftupleg", rightupperleg:"rightupleg", leftupperarm:"leftarm", rightupperarm:"rightarm", leftlowerarm:"leftforearm", rightlowerarm:"rightforearm"};
  return aliases[clean] || clean;
}
export function boneMap(root: THREE.Object3D) {
  const map = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    // Animation-only GLBs may omit a skin and deserialize joint nodes as plain
    // Object3D rather than Bone; recognizable humanoid names still work.
    const key=canonicalBoneName(node.name);
    const humanoid=/^(hips|spine\d*|neck\d*|head|left|right)/.test(key);
    if ((node instanceof THREE.Bone || (!(node instanceof THREE.Mesh) && humanoid)) && key && !map.has(key)) map.set(key,node);
  });
  return map;
}
function boneDistance(root: THREE.Object3D, map: Map<string, THREE.Object3D>) {
  const hips=map.get("hips"), head=map.get("head"); if (!hips || !head) return 0;
  root.updateMatrixWorld(true);
  const a=root.worldToLocal(hips.getWorldPosition(new THREE.Vector3()));
  const b=root.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
  return a.distanceTo(b);
}
function nodeAndProperty(name: string) {
  const match = name.match(/^\.bones\[([^\]]+)\]\.(position|quaternion|scale)$/);
  if (match) return {node:match[1], property:match[2]};
  const i=name.lastIndexOf("."); return i >= 0 ? {node:name.slice(0,i), property:name.slice(i+1)} : {node:name, property:""};
}
export function findRoleClip(clips: THREE.AnimationClip[], role: WorkerMotionRole) {
  const terms = role === "idle" ? ["idle", "stand", "breath"] : role === "walk" ? ["walk", "locomotion"] : ["work", "inspect", "operate", "interact"];
  return clips.find((c) => c.duration > .15 && terms.some((term) => c.name.toLowerCase().includes(term))) || null;
}

/** Construct a compatible rest alignment, including T-pose versus A-pose rigs.
 * Match each major joint-to-child direction in parent-first order; retain the
 * remaining twist, then transform local animation deltas between joint bases. */
const alignments = new WeakMap<THREE.Object3D, WeakMap<THREE.Object3D, Map<string,{rest:THREE.Quaternion; basis:THREE.Quaternion}>>>();
function alignedRest(source: THREE.Object3D, target: THREE.Object3D) {
  let targets=alignments.get(source); const cached=targets?.get(target); if (cached) return cached;
  if (!targets) { targets=new WeakMap(); alignments.set(source,targets); }
  const clone=cloneSkeleton(target), from=boneMap(source), to=boneMap(clone);
  source.updateMatrixWorld(true); clone.updateMatrixWorld(true);
  const vec=(a:THREE.Object3D,b:THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3()));
  const side=(map:Map<string,THREE.Object3D>) => {
    const l=map.get("leftarm") || map.get("leftshoulder"), r=map.get("rightarm") || map.get("rightshoulder");
    if (!l || !r) return new THREE.Vector3(1,0,0);
    const v=vec(r,l); v.y=0; return v.lengthSq()>1e-8 ? v.normalize() : new THREE.Vector3(1,0,0);
  };
  const yaw=new THREE.Quaternion().setFromUnitVectors(side(from),side(to));
  const pairs: [string,string][]=[['hips','spine'],['spine','spine1'],['spine1','spine2'],['spine2','neck'],['neck','head']];
  for (const sideName of ['left','right']) pairs.push(
    [sideName+'shoulder',sideName+'arm'],[sideName+'arm',sideName+'forearm'],[sideName+'forearm',sideName+'hand'],
    [sideName+'hand',sideName+'handindex1'],[sideName+'handindex1',sideName+'handindex2'],[sideName+'handindex2',sideName+'handindex3'],
    [sideName+'handthumb1',sideName+'handthumb2'],[sideName+'handthumb2',sideName+'handthumb3'],
    [sideName+'upleg',sideName+'leg'],[sideName+'leg',sideName+'foot'],[sideName+'foot',sideName+'toebase']);
  for (const [name,childName] of pairs) {
    const s=from.get(name), sc=from.get(childName), d=to.get(name), dc=to.get(childName);
    if (!s || !sc || !d || !dc) continue;
    const sourceDirection=vec(s,sc).applyQuaternion(yaw), targetDirection=vec(d,dc);
    if (sourceDirection.lengthSq()<1e-9 || targetDirection.lengthSq()<1e-9) continue;
    const correction=new THREE.Quaternion().setFromUnitVectors(targetDirection.normalize(),sourceDirection.normalize());
    const world=d.getWorldQuaternion(new THREE.Quaternion()).premultiply(correction);
    const parent=d.parent?.getWorldQuaternion(new THREE.Quaternion()).invert() || new THREE.Quaternion();
    d.quaternion.copy(parent.multiply(world)).normalize(); d.updateWorldMatrix(false,true);
  }
  const result=new Map<string,{rest:THREE.Quaternion; basis:THREE.Quaternion}>();
  for (const [name,d] of to) {
    const s=from.get(name); if (!s) continue;
    const sw=s.getWorldQuaternion(new THREE.Quaternion()).premultiply(yaw);
    const dw=d.getWorldQuaternion(new THREE.Quaternion());
    result.set(name,{rest:d.quaternion.clone(),basis:dw.invert().multiply(sw).normalize()});
  }
  targets.set(target,result);
  return result;
}

const clipCache = new WeakMap<THREE.Object3D, WeakMap<THREE.Object3D, WeakMap<THREE.AnimationClip, Map<boolean,{clip:THREE.AnimationClip;matched:number}>>>>();
/**
 * Map Mixamo-like humanoid bone names and transfer rotation relative to each
 * rig's rest pose. Keep horizontal hips in place; simulator owns translation.
 * This targets compatible bipeds, not arbitrary quadrupeds/non-humanoids.
 */
export function retargetWorkerClip(source: THREE.Object3D, target: THREE.Object3D, original: THREE.AnimationClip, direct = false): {clip: THREE.AnimationClip; matched: number} {
  let targets=clipCache.get(source); if (!targets) { targets=new WeakMap(); clipCache.set(source,targets); }
  let clips=targets.get(target); if (!clips) { clips=new WeakMap(); targets.set(target,clips); }
  let modes=clips.get(original); if (!modes) { modes=new Map(); clips.set(original,modes); }
  const cached=modes.get(direct); if (cached) return cached;
  const from=boneMap(source), to=boneMap(target);
  const fromHeight=boneDistance(source,from), toHeight=boneDistance(target,to);
  const ratio=fromHeight > 1e-8 && toHeight > 1e-8 ? toHeight/fromHeight : 1;
  const tracks: THREE.KeyframeTrack[] = [];
  const aligned = direct ? null : alignedRest(source,target);
  let matched=0;
  for (const track of original.tracks) {
    const {node,property}=nodeAndProperty(track.name), key=canonicalBoneName(node), dest=to.get(key), src=from.get(key);
    if (!dest || !src || !["quaternion","position"].includes(property)) continue;
    if (property === "position" && key !== "hips" && !direct) continue;
    const copy=track.clone(); copy.name=`${dest.name}.${property}`;
    if (property === "quaternion" && !direct) {
      const inv=src.quaternion.clone().invert(), setup=aligned?.get(key);
      const rest=setup?.rest || dest.quaternion, basis=setup?.basis || new THREE.Quaternion(), basisInv=basis.clone().invert(), q=new THREE.Quaternion();
      for (let i=0;i<copy.values.length;i+=4) {
        // source local delta -> source joint basis -> corrected target joint basis
        q.fromArray(copy.values,i).premultiply(inv).premultiply(basis).multiply(basisInv).premultiply(rest).normalize().toArray(copy.values,i);
      }
    }
    if (property === "position" && key === "hips") {
      const firstX=copy.values[0], firstY=copy.values[1], firstZ=copy.values[2];
      for (let i=0;i<copy.values.length;i+=3) {
        // Keep the character in place. Preserve vertical gait bob relative to the target bind pose.
        copy.values[i] = direct ? firstX : dest.position.x;
        copy.values[i+1] = direct ? copy.values[i+1] : dest.position.y + (copy.values[i+1]-firstY)*ratio;
        copy.values[i+2] = direct ? firstZ : dest.position.z;
      }
    }
    tracks.push(copy); matched++;
  }
  const result={clip:new THREE.AnimationClip(original.name, original.duration, tracks),matched};
  modes.set(direct,result);
  return result;
}
