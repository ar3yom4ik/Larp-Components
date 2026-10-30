import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ImportedModelData, SceneItem, WorkerMotionRole, WorkerSettings } from "../types";
import { sim } from "../sim/engine";
import { useImportedModelInstance } from "./ImportedModel";
import { getCachedAnimation, getCachedModel } from "../utils/modelImport";
import { boneMap, defaultWorker, findRoleClip, retargetWorkerClip } from "../utils/workerAnimation";
import { WorkerGear } from "./WorkerCosmetics";
import { applyShirtTint, DEFAULT_SHIRT_COLOR } from "../utils/workerShirt";

export const DEFAULT_WORKER_SETTINGS: WorkerSettings = { appearance: "default", motions: {}, height: 1.78, groundFeet: true, forward: "+z" };
const forwardAngle: Record<WorkerSettings["forward"], number> = { "+z": 0, "-z": Math.PI, "+x": -Math.PI / 2, "-x": Math.PI / 2 };

/** The shirt colour of a worker: its own accent colour, or the hi-vis default. */
export function workerShirtColor(item: SceneItem): string {
  return item.color || DEFAULT_SHIRT_COLOR;
}

/**
 * Invalid saved values (NaN height, an unknown forward axis, a zero scale) used to feed
 * straight into matrices and made the character disappear instead of falling back.
 */
function safeSettings(settings: WorkerSettings): WorkerSettings {
  const height = Number(settings.height);
  const forward = settings.forward in forwardAngle ? settings.forward : "+z";
  return {
    ...settings,
    height: Number.isFinite(height) ? Math.max(0.5, Math.min(3, height)) : 1.78,
    forward,
    groundFeet: settings.groundFeet !== false,
    appearance: settings.appearance ?? "default",
    motions: settings.motions ?? {},
  };
}

/** Keeps a broken character from taking the whole scene (or the worker) down. */
class WorkerBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn("Rigged worker failed and was replaced by the mannequin", error, info.componentStack); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function RiggedHuman({ item, fallback }: { item: SceneItem; fallback: ReactNode }) {
  const [builtin, setBuiltin] = useState<ImportedModelData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    defaultWorker()
      .then(({ model }) => { if (alive) setBuiltin(model); })
      .catch((cause: unknown) => { console.warn("Built-in worker failed to load", cause); if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  const settings = safeSettings(item.worker || DEFAULT_WORKER_SETTINGS);
  const model = settings.appearance === "custom" && settings.model ? settings.model : builtin;
  if (failed || !model) return <>{fallback}</>;
  return (
    <WorkerBoundary fallback={fallback}>
      <AnimatedRig item={item} model={model} settings={settings} fallback={fallback} />
    </WorkerBoundary>
  );
}

function AnimatedRig({ item, model, settings, fallback }: { item: SceneItem; model: ImportedModelData; settings: WorkerSettings; fallback: ReactNode }) {
  const { loaded, error } = useImportedModelInstance(model);
  const { invalidate, gl } = useThree();
  const outer = useRef<THREE.Group>(null), visual = useRef<THREE.Group>(null);
  const lastGroundFeet = useRef(settings.groundFeet !== false);
  const warned = useRef(false);
  const animation = useRef<{ mixer: THREE.AnimationMixer; actions: Partial<Record<WorkerMotionRole, THREE.AnimationAction>>; current: WorkerMotionRole | null } | null>(null);
  const nodes = useMemo(() => (loaded ? boneMap(loaded.object) : new Map<string, THREE.Object3D>()), [loaded]);
  const head = nodes.get("head");
  const feet = useMemo(() => ["leftfoot", "lefttoebase", "rightfoot", "righttoebase"].map((name) => nodes.get(name)).filter((bone): bone is THREE.Object3D => !!bone), [nodes]);
  const footPosition = useMemo(() => new THREE.Vector3(), []);
  // Cosmetics are parented to this holder, which sits under the head bone so they follow the head.
  const gearHolder = useMemo(() => new THREE.Group(), []);
  const shirtColor = workerShirtColor(item);

  const transform = useMemo(() => {
    const fallbackTransform = { scale: 1, offset: [0, 0, 0] as [number, number, number], footRest: null as number | null };
    if (!loaded) return fallbackTransform;
    try {
      const temp = new THREE.Group(), axis = new THREE.Group();
      temp.rotation.y = forwardAngle[settings.forward];
      axis.rotation.x = model.axis === "z" ? -Math.PI / 2 : 0;
      temp.add(axis);
      axis.add(loaded.object.clone(true));
      temp.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(temp);
      const size = box.getSize(new THREE.Vector3());
      // A degenerate or non-finite box must never produce a NaN scale: that makes the
      // worker invisible and un-selectable.
      const height = size.y > 1e-6 && Number.isFinite(size.y) ? settings.height / size.y : 1;
      const scale = Number.isFinite(height) && height > 1e-4 ? Math.min(1000, height) : 1;
      const restBones = boneMap(temp);
      const restHeights = ["leftfoot", "lefttoebase", "rightfoot", "righttoebase"].map((name) => restBones.get(name)).filter((bone): bone is THREE.Object3D => !!bone).map((bone) => bone.getWorldPosition(new THREE.Vector3()).y);
      const footRest = restHeights.length && !box.isEmpty() ? (Math.min(...restHeights) - box.min.y) * scale : null;
      const offset: [number, number, number] = box.isEmpty() || !Number.isFinite(box.min.x)
        ? [0, 0, 0]
        : [-((box.min.x + box.max.x) / 2) * scale, -box.min.y * scale, -((box.min.z + box.max.z) / 2) * scale];
      return { scale, footRest: footRest !== null && Number.isFinite(footRest) ? footRest : null, offset };
    } catch (cause) {
      console.warn("Could not measure the worker model", cause);
      return fallbackTransform;
    }
  }, [loaded, model.axis, settings.forward, settings.height]);

  // Shirt colour follows the worker's colour. Only the clothing band of the texture is
  // replaced, so the face, hands and boots keep their own colours.
  useEffect(() => {
    if (!loaded) return;
    applyShirtTint(loaded.pbrMaterials, shirtColor, true);
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [loaded, shirtColor, gl, invalidate]);

  // Attach cosmetics to the head bone. The holder is scaled so that its contents keep their
  // authored size in item units, whatever the bone scale is.
  useEffect(() => {
    if (!head || !outer.current) return undefined;
    outer.current.updateWorldMatrix(true, true);
    const headScale = head.getWorldScale(new THREE.Vector3()).x, rootScale = outer.current.getWorldScale(new THREE.Vector3()).x;
    const ratio = headScale > 1e-6 && rootScale > 1e-6 ? headScale / rootScale : 1;
    gearHolder.position.set(0, 0, 0);
    gearHolder.quaternion.identity();
    gearHolder.scale.setScalar((settings.height / 1.78) / ratio);
    head.add(gearHolder);
    return () => { head.remove(gearHolder); };
  }, [head, gearHolder, settings.height]);

  useEffect(() => {
    if (!loaded) return;
    let alive = true; let local: THREE.AnimationMixer | null = null;
    void (async () => {
      const builtin = await defaultWorker(), target = await getCachedModel(model.asset);
      const roles: WorkerMotionRole[] = ["idle", "walk", "work"];
      const overrides = await Promise.all(roles.map(async (role) => {
        const motion = settings.motions?.[role];
        if (!motion) return null;
        const result = await getCachedAnimation(motion.asset);
        return { root: result.root, clip: result.clips[motion.clipIndex] || result.clips[0] };
      }));
      if (!alive) return;
      const mixer = new THREE.AnimationMixer(loaded.object); local = mixer;
      const actions: Partial<Record<WorkerMotionRole, THREE.AnimationAction>> = {};
      roles.forEach((role, index) => {
        const embedded = findRoleClip(target.clips, role), override = overrides[index];
        const source = override?.root || (embedded ? target.root : builtin.root);
        const sourceClip = override?.clip || embedded || findRoleClip(builtin.clips, role);
        if (!sourceClip) return;
        const direct = source === target.root;
        const { clip, matched } = retargetWorkerClip(source, target.root, sourceClip, direct);
        if (!matched) { console.warn(`Worker animation ${role} did not match this skeleton.`); return; }
        const action = mixer.clipAction(clip); action.setLoop(THREE.LoopRepeat, Infinity); action.enabled = true; actions[role] = action;
      });
      animation.current = { mixer, actions, current: null };
      gl.shadowMap.needsUpdate = true; invalidate();
    })().catch((cause: unknown) => { if (alive) console.warn("Could not prepare worker animation", cause); });
    return () => { alive = false; if (local) { local.stopAllAction(); local.uncacheRoot(loaded.object); } animation.current = null; };
  }, [loaded, model.asset, settings.motions, gl, invalidate]);

  useFrame((_, delta) => {
    const rt = sim.humans.get(item.id), node = outer.current;
    if (!rt || !node) return;
    const itemScale = Number.isFinite(item.scale) && Math.abs(item.scale) > 1e-4 ? item.scale : 1;
    const rot = item.rotation * Math.PI / 180, dx = rt.x - item.position[0], dz = rt.z - item.position[2];
    node.position.set((dx * Math.cos(rot) - dz * Math.sin(rot)) / itemScale, 0, (dx * Math.sin(rot) + dz * Math.cos(rot)) / itemScale);
    const target = rt.yaw - rot, diff = Math.atan2(Math.sin(target - node.rotation.y), Math.cos(target - node.rotation.y));
    if (sim.running) node.rotation.y += diff * (1 - Math.exp(-Math.min(delta, .1) * 10));
    const state = animation.current;
    if (state && sim.running) {
      let role: WorkerMotionRole = rt.walking ? "walk" : ["inspect", "replenish", "operate", "processing", "tend"].includes(rt.status) ? "work" : "idle";
      if (!state.actions[role]) role = state.actions.idle ? "idle" : state.actions.walk ? "walk" : "work";
      const next = state.actions[role];
      if (next && state.current !== role) {
        const previous = state.current ? state.actions[state.current] : undefined;
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(role === "walk" ? Math.max(.35, Math.min(2, Number(item.props.walkSpeed) || 1)) : 1).play();
        if (previous && previous !== next) previous.crossFadeTo(next, .25, false);
        state.current = role; node.userData.activeRole = role; node.userData.clipName = next.getClip().name;
      }
      state.mixer.update(Math.min(delta, .1) * Math.max(.01, sim.speed));
    }
    // Approximate foot contact in-place: keep the lowest foot/toe joint near its
    // bind-pose height. This avoids obvious floating when retargeted rigs differ.
    const groundEnabled = settings.groundFeet !== false;
    const groundChanged = lastGroundFeet.current !== groundEnabled;
    lastGroundFeet.current = groundEnabled;
    // Freeze the entire animated pose when paused. A grounding toggle is an
    // explicit edit, so apply that one adjustment immediately even while paused.
    if (visual.current && (sim.running || groundChanged)) {
      const blend = !sim.running && groundChanged ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 14);
      let desired = transform.offset[1];
      if (groundEnabled && feet.length && transform.footRest !== null) {
        let lowest = Infinity;
        feet.forEach((foot) => { foot.getWorldPosition(footPosition); node.worldToLocal(footPosition); lowest = Math.min(lowest, footPosition.y); });
        if (Number.isFinite(lowest)) {
          const correction = Math.max(-settings.height * .2, Math.min(settings.height * .2, transform.offset[1] + transform.footRest - lowest));
          desired = transform.offset[1] + correction;
        }
      }
      const y = visual.current.position.y + (desired - visual.current.position.y) * blend;
      // A single non-finite value would hide the worker for the rest of the session.
      if (Number.isFinite(y)) visual.current.position.y = y;
      else visual.current.position.y = transform.offset[1];
    }
    if (import.meta.env.DEV && !warned.current) {
      warned.current = true;
      node.userData.workerDiagnostics = { scale: transform.scale, offset: transform.offset, shirt: shirtColor, height: settings.height, forward: settings.forward };
    }
    if (state && import.meta.env.DEV) {
      node.userData.mixerTime = state.mixer.time;
      node.userData.weights = Object.fromEntries(Object.entries(state.actions).map(([name, action]) => [name, action?.isRunning() ? action.getEffectiveWeight() : 0]));
    }
  });

  if (error) { console.warn("Rigged character failed to load", error); return <>{fallback}</>; }
  if (!loaded) return <>{fallback}</>;
  const hatKind = String(item.props.hat ?? "hardhat");
  const hasGear = hatKind !== "none" || item.props.glasses === true || item.props.ears === true || item.props.headphones === true || item.props.earrings === true;
  return <group ref={outer} userData={{ isRiggedWorker: true, itemId: item.id, activeRole: "loading" }}>
    <group ref={visual} userData={{ isWorkerVisual: true }} position={transform.offset} scale={transform.scale} rotation={[0, forwardAngle[settings.forward], 0]}>
      <group rotation={[model.axis === "z" ? -Math.PI / 2 : 0, 0, 0]}><primitive object={loaded.object} /></group>
    </group>
    {hasGear && (head
      ? createPortal(<WorkerGear item={item} shirtColor={shirtColor} glasses={item.props.glasses === true} />, gearHolder)
      : <group position={[0, 1.6, 0]}><WorkerGear item={item} shirtColor={shirtColor} glasses={item.props.glasses === true} /></group>)}
  </group>;
}
