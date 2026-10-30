import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ImportedModelData, SceneItem, WorkerMotionRole, WorkerSettings } from "../types";
import { sim } from "../sim/engine";
import { getMaterial } from "./ModelKit";
import { useImportedModelInstance } from "./ImportedModel";
import { getCachedAnimation, getCachedModel } from "../utils/modelImport";
import { boneMap, defaultWorker, findRoleClip, retargetWorkerClip } from "../utils/workerAnimation";

export const DEFAULT_WORKER_SETTINGS: WorkerSettings = {appearance:"default", motions:{}, height:1.78, groundFeet:true, forward:"+z"};
const forwardAngle: Record<WorkerSettings["forward"],number> = {"+z":0,"-z":Math.PI,"+x":-Math.PI/2,"-x":Math.PI/2};

export function RiggedHuman({item, fallback}: {item:SceneItem; fallback:React.ReactNode}) {
  const [builtin, setBuiltin] = useState<ImportedModelData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let alive=true; defaultWorker().then(({model}) => {if(alive)setBuiltin(model);}).catch((cause:unknown) => { console.warn("Built-in worker failed to load",cause); if(alive)setFailed(true);}); return () => {alive=false;}; }, []);
  const settings = item.worker || DEFAULT_WORKER_SETTINGS;
  const model = settings.appearance === "custom" ? settings.model : builtin;
  if (failed || !model) return <>{fallback}</>;
  return <AnimatedRig item={item} model={model} settings={settings} fallback={fallback} />;
}

function AnimatedRig({item, model, settings, fallback}: {item:SceneItem; model:ImportedModelData; settings:WorkerSettings; fallback:React.ReactNode}) {
  const {loaded,error} = useImportedModelInstance(model);
  const {invalidate,gl} = useThree();
  const outer=useRef<THREE.Group>(null), visual=useRef<THREE.Group>(null);
  const lastGroundFeet=useRef(settings.groundFeet !== false);
  const animation=useRef<{mixer:THREE.AnimationMixer; actions:Partial<Record<WorkerMotionRole,THREE.AnimationAction>>; current:WorkerMotionRole | null} | null>(null);
  const nodes=useMemo(() => loaded ? boneMap(loaded.object) : new Map<string,THREE.Object3D>(),[loaded]);
  const head=nodes.get("head");
  const feet=useMemo(() => ["leftfoot","lefttoebase","rightfoot","righttoebase"].map((name)=>nodes.get(name)).filter((bone): bone is THREE.Object3D => !!bone),[nodes]);
  const footPosition=useMemo(()=>new THREE.Vector3(),[]);
  // Cosmetics are parented to this holder, which sits under the head bone so they follow the head.
  const gearHolder=useMemo(()=>new THREE.Group(),[]);
  const transform=useMemo(() => {
    if (!loaded) return {scale:1,offset:[0,0,0] as [number,number,number],footRest:null as number | null};
    const temp=new THREE.Group(), axis=new THREE.Group(); temp.rotation.y=forwardAngle[settings.forward]; axis.rotation.x=model.axis === "z" ? -Math.PI/2 : 0;temp.add(axis);axis.add(loaded.object.clone(true));temp.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(temp), size=box.getSize(new THREE.Vector3());
    const scale=size.y > 1e-6 ? settings.height/size.y : 1;
    const restBones=boneMap(temp), restHeights=["leftfoot","lefttoebase","rightfoot","righttoebase"].map((name)=>restBones.get(name)).filter((bone): bone is THREE.Object3D => !!bone).map((bone)=>bone.getWorldPosition(new THREE.Vector3()).y);
    const footRest=restHeights.length && !box.isEmpty() ? (Math.min(...restHeights)-box.min.y)*scale : null;
    return {scale,footRest,offset:box.isEmpty() ? [0,0,0] as [number,number,number] : [-((box.min.x+box.max.x)/2)*scale,-box.min.y*scale,-((box.min.z+box.max.z)/2)*scale] as [number,number,number]};
  },[loaded,model.axis,settings.forward,settings.height]);

  // Attach cosmetics to the head bone. The holder is scaled so that its contents keep their
  // authored size in item units, whatever the bone scale is.
  useEffect(() => {
    if (!head || !outer.current) return undefined;
    outer.current.updateWorldMatrix(true,true);
    const headScale=head.getWorldScale(new THREE.Vector3()).x, rootScale=outer.current.getWorldScale(new THREE.Vector3()).x;
    const ratio=headScale > 1e-6 && rootScale > 1e-6 ? headScale/rootScale : 1;
    gearHolder.position.set(0,0,0);
    gearHolder.quaternion.identity();
    gearHolder.scale.setScalar((settings.height/1.78)/ratio);
    head.add(gearHolder);
    return () => { head.remove(gearHolder); };
  },[head,gearHolder,settings.height]);

  useEffect(() => {
    if (!loaded) return;
    let alive=true; let local: THREE.AnimationMixer | null=null;
    void (async () => {
      const builtin=await defaultWorker(), target=await getCachedModel(model.asset);
      const roles:WorkerMotionRole[]=["idle","walk","work"];
      const overrides=await Promise.all(roles.map(async (role) => {
        const motion=settings.motions?.[role];
        if (!motion) return null;
        const result=await getCachedAnimation(motion.asset);
        return {root:result.root, clip:result.clips[motion.clipIndex] || result.clips[0]};
      }));
      if (!alive) return;
      const mixer=new THREE.AnimationMixer(loaded.object); local=mixer;
      const actions:Partial<Record<WorkerMotionRole,THREE.AnimationAction>>={};
      roles.forEach((role,index) => {
        const embedded=findRoleClip(target.clips,role), override=overrides[index];
        const source=override?.root || (embedded ? target.root : builtin.root);
        const sourceClip=override?.clip || embedded || findRoleClip(builtin.clips,role);
        if (!sourceClip) return;
        const direct=source === target.root;
        const {clip,matched}=retargetWorkerClip(source,target.root,sourceClip,direct);
        if (!matched) {console.warn(`Worker animation ${role} did not match this skeleton.`);return;}
        const action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);action.enabled=true;actions[role]=action;
      });
      animation.current={mixer,actions,current:null};
      gl.shadowMap.needsUpdate=true;invalidate();
    })().catch((cause:unknown) => { if (alive) console.warn("Could not prepare worker animation",cause); });
    return () => {alive=false; if (local) {local.stopAllAction();local.uncacheRoot(loaded.object);} animation.current=null;};
  },[loaded,model.asset,settings.motions,gl,invalidate]);

  useFrame((_,delta) => {
    const rt=sim.humans.get(item.id), node=outer.current;
    if (!rt || !node) return;
    const rot=item.rotation*Math.PI/180, dx=rt.x-item.position[0], dz=rt.z-item.position[2];
    node.position.set((dx*Math.cos(rot)-dz*Math.sin(rot))/item.scale,0,(dx*Math.sin(rot)+dz*Math.cos(rot))/item.scale);
    const target=rt.yaw-rot, diff=Math.atan2(Math.sin(target-node.rotation.y),Math.cos(target-node.rotation.y));
    if (sim.running) node.rotation.y += diff*(1-Math.exp(-Math.min(delta,.1)*10));
    const state=animation.current;
    if (state && sim.running) {
      let role:WorkerMotionRole=rt.walking ? "walk" : ["inspect","replenish","operate","processing","tend"].includes(rt.status) ? "work" : "idle";
      if (!state.actions[role]) role=state.actions.idle ? "idle" : state.actions.walk ? "walk" : "work";
      const next=state.actions[role];
      if (next && state.current !== role) {
        const previous=state.current ? state.actions[state.current] : undefined;
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(role === "walk" ? Math.max(.35,Math.min(2,Number(item.props.walkSpeed)||1)) : 1).play();
        if (previous && previous !== next) previous.crossFadeTo(next,.25,false);
        state.current=role; node.userData.activeRole=role; node.userData.clipName=next.getClip().name;
      }
      state.mixer.update(Math.min(delta,.1)*Math.max(.01,sim.speed));
    }
    // Approximate foot contact in-place: keep the lowest foot/toe joint near its
    // bind-pose height. This avoids obvious floating when retargeted rigs differ.
    const groundEnabled = settings.groundFeet !== false;
    const groundChanged = lastGroundFeet.current !== groundEnabled;
    lastGroundFeet.current = groundEnabled;
    // Freeze the entire animated pose when paused. A grounding toggle is an
    // explicit edit, so apply that one adjustment immediately even while paused.
    if (visual.current && (sim.running || groundChanged)) {
      const blend = !sim.running && groundChanged ? 1 : 1-Math.exp(-Math.min(delta,.1)*14);
      if (groundEnabled && feet.length && transform.footRest !== null) {
        let lowest=Infinity;
        feet.forEach((foot) => { foot.getWorldPosition(footPosition); node.worldToLocal(footPosition); lowest=Math.min(lowest,footPosition.y); });
        const correction=Math.max(-settings.height*.2,Math.min(settings.height*.2,visual.current.position.y-transform.offset[1]+transform.footRest-lowest));
        visual.current.position.y += (transform.offset[1]+correction-visual.current.position.y)*blend;
      } else {
        visual.current.position.y += (transform.offset[1]-visual.current.position.y)*blend;
      }
    }
    if (state && import.meta.env.DEV) {
      node.userData.mixerTime=state.mixer.time;
      node.userData.weights=Object.fromEntries(Object.entries(state.actions).map(([name,action]) => [name,action?.isRunning() ? action.getEffectiveWeight() : 0]));
    }
  });
  if (error) { console.warn("Rigged character failed to load",error); return <>{fallback}</>; }
  if (!loaded) return <>{fallback}</>;
  const hat=String(item.props.hat ?? "hardhat"), hasGear=hat !== "none" || item.props.glasses === true || item.props.ears === true || item.props.headphones === true || item.props.earrings === true;
  const gearContent=<group userData={{isWorkerAccessory:true}}>
      {hat !== "none" && <group position={[0,.23,0]}>
        <mesh material={getMaterial(hat === "cap" ? "blue" : "yellow")} castShadow><sphereGeometry args={[.19,16,10,0,Math.PI*2,0,Math.PI/2]}/></mesh>
        <mesh position={[0,0,hat === "cap" ? .12 : 0]} material={getMaterial(hat === "cap" ? "blue" : "yellow")} castShadow><boxGeometry args={[.39,.035,hat === "cap" ? .28 : .4]}/></mesh>
      </group>}
      {item.props.glasses === true && <group position={[0,.14,.15]}>{[-1,1].map(s=><mesh key={s} position={[s*.07,0,0]} material={getMaterial("black")}><boxGeometry args={[.12,.065,.035]}/></mesh>)}<mesh material={getMaterial("steel")}><boxGeometry args={[.035,.025,.02]}/></mesh></group>}
      {item.props.ears === true && [-1,1].map(s=><mesh key={s} position={[s*.11,.37,0]} rotation={[0,0,s*-.25]} material={getMaterial("hair")} castShadow><coneGeometry args={[.065,.17,3]}/></mesh>)}
      {item.props.headphones === true && <group position={[0,.19,0]}><mesh><torusGeometry args={[.19,.025,6,18,Math.PI]}/><meshStandardMaterial color="#28343c"/></mesh>{[-1,1].map(s=><mesh key={s} position={[s*.18,-.12,0]}><cylinderGeometry args={[.06,.06,.08,12]}/><meshStandardMaterial color="#3b4f5c"/></mesh>)}</group>}
      {item.props.earrings === true && [-1,1].map(s=><mesh key={s} position={[s*.18,-.01,0]}><torusGeometry args={[.025,.006,5,10]}/><meshStandardMaterial color="#e9c34d" metalness={.7}/></mesh>)}
    </group>;
  return <group ref={outer} userData={{isRiggedWorker:true,itemId:item.id,activeRole:"loading"}}>
    <group ref={visual} userData={{isWorkerVisual:true}} position={transform.offset} scale={transform.scale} rotation={[0,forwardAngle[settings.forward],0]}><group rotation={[model.axis === "z" ? -Math.PI/2 : 0,0,0]}><primitive object={loaded.object}/></group></group>
    {hasGear && (head ? createPortal(gearContent, gearHolder) : gearContent)}
  </group>;
}
