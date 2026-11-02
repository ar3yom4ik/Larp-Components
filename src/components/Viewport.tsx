import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerformanceMonitor, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import {
  Box as BoxIcon,
  Building2,
  Eye,
  Focus,
  Grid3X3,
  Layers3,
  Cable,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
} from "lucide-react";
import type { OrbitControls as OrbitControlsImpl, TransformControls as TransformControlsImpl } from "three-stdlib";
import type { CameraPreset, ComponentKind, SceneItem, ToolMode, Vec3 } from "../types";
import type { BuildingSettings, GraphicsQuality, SkinId } from "../theme";
import { activeScheme, useAppearance } from "../theme";
import { COMPONENTS, getDef } from "../data/library";
import { PartIcon, partAccent } from "./PartIcon";
import { FactoryEnvironment, FactoryModel, MODEL_HEIGHTS, type BuildingStyle } from "./FactoryModels";
import { ImportedModel } from "./ImportedModel";
import { ViewportErrorBoundary } from "./ViewportErrorBoundary";
import { SignalPortLayer } from "./SignalPortLayer";
import { canSignalInput, canSignalOutput, signalTargets, signalTargetsPatch, signalWireColor } from "../utils/signalPorts";
import { WireLayer } from "./WireLayer";
import { WindowResizeHandle, type WindowSize } from "./WindowResizeHandle";
import { BoxesLayer } from "./ProductModels";
import { PostEffects, RendererSettings } from "./GraphicsEffects";
import { StudioEnvironment } from "./StudioEnvironment";
import { SunLight } from "./SunLight";
import { setGraphicsStatus } from "../graphicsStatus";
import { onViewportCommand, sendViewportCommand } from "../viewportCommands";
import { FloorPlanView } from "./FloorPlanView";
import { setPanel, useLayout } from "../layout";
import { GlobalIlluminationPipeline } from "./GpuGlobalIllumination";
import { CornellBenchmark } from "./CornellBenchmark";
import { useCornellRoom } from "../cornellRoom";
import { createGpuRenderer, probeWebGPU, type GLFactoryProps } from "../utils/gpu";
import { BELT_Y } from "./ModelKit";
import { sim } from "../sim/engine";
import { simulationFrameBudget, simulationRateSampleMs } from "../sim/frameBudget";
import { formatClock, useSimSnapshot } from "../sim/hooks";
import { cn } from "../utils/cn";
import { t, useLanguage } from "../i18n";

interface ViewportProps {
  mobile: boolean;
  skin: SkinId;
  quality: GraphicsQuality;
  building: BuildingSettings;
  items: SceneItem[];
  productItems?: SceneItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedPoint: number | null;
  onSelectPoint: (index: number | null) => void;
  tool: ToolMode;
  snap: boolean;
  running: boolean;
  onToggleRun: () => void;
  onResetSim: () => void;
  simSpeed: number;
  onSimSpeed: (speed: number) => void;
  layoutName: string;
  onAddAt: (kind: ComponentKind, position: Vec3) => void;
  onImportFiles: (files: File[]) => void;
  onUpdateItem: (id: string, changes: Partial<SceneItem>, record?: boolean) => void;
  onBeginEdit: () => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onShowFloorMap: () => void;
}

type DragState =
  | { type: "item"; id: string; startGround: THREE.Vector3; startPosition: Vec3; startRotation: number; startAngle: number }
  | { type: "point"; id: string; index: number };

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const TEAL = "var(--teal)";
const TEAL_3D = "#35c4d4"; // Three.js cannot resolve CSS custom properties in material colors.

const VIEWS: Record<CameraPreset, { position: Vec3; target: Vec3 }> = {
  iso: { position: [13.5, 10.5, 15], target: [0, 0.3, 0.5] },
  top: { position: [0, 38, 0.01], target: [0, 0, 0] },
  front: { position: [0, 8, 30], target: [0, 1, 0] },
  back: { position: [0, 8, -30], target: [0, 1, 0] },
  left: { position: [-30, 8, 0], target: [0, 1, 0] },
  right: { position: [30, 8, 0], target: [0, 1, 0] },
  // Frames the DEV Cornell benchmark room (20 x 15 x 20) from its open side.
  room: { position: [0, 8.5, 34], target: [0, 7, 0] },
};

function CameraRig({
  view,
  viewNonce,
  fitNonce,
  fitSelected,
  zoom,
  focus,
  focusId,
  controlsRef,
  items,
}: {
  view: CameraPreset;
  viewNonce: number;
  fitNonce: number;
  fitSelected: number;
  zoom: { nonce: number; direction: 1 | -1 };
  focus: Vec3 | null;
  focusId: string | null;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  items: SceneItem[];
}) {
  const { camera, invalidate, size } = useThree();
  // Selection, scene edits and window resizes must not move the camera. They are read
  // through refs so that only an explicit camera command (view button, Fit, new layout)
  // re-frames the view. Depending on them directly reset the camera on every object click.
  const itemsRef = useRef(items); itemsRef.current = items;
  const focusRef = useRef(focus); focusRef.current = focus;
  const focusIdRef = useRef(focusId); focusIdRef.current = focusId;
  const sizeRef = useRef(size); sizeRef.current = size;

  useEffect(() => {
    let { position, target } = VIEWS[view];
    if (view === "iso") {
      const points = itemsRef.current.flatMap((i) => {
        if (!i.points) return [[i.position[0], i.position[2]]];
        const r = i.rotation * Math.PI / 180;
        return i.points.map((p) => [i.position[0] + p[0] * Math.cos(r) + p[1] * Math.sin(r), i.position[2] - p[0] * Math.sin(r) + p[1] * Math.cos(r)]);
      });
      const xs = points.map((p) => p[0]), zs = points.map((p) => p[1]);
      const minX = Math.min(...xs, -3), maxX = Math.max(...xs, 3), minZ = Math.min(...zs, -3), maxZ = Math.max(...zs, 3);
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      const span = Math.max(maxX - minX, maxZ - minZ) + 3;
      const aspect = Math.max(0.35, sizeRef.current.width / sizeRef.current.height);
      const vFov = (36 * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const dist = Math.max(14, (span * 0.62) / Math.tan(Math.min(vFov, hFov) / 2));
      position = [cx + dist * 0.5, 0.5 + dist * 0.62, cz + dist * 0.66];
      target = [cx, 0.6, cz];
    }
    const live = focusIdRef.current ? sim.humans.get(focusIdRef.current) : undefined;
    const originalFocus = focusRef.current;
    const f:Vec3 | null = live && originalFocus ? [live.x, originalFocus[1], live.z] : originalFocus;
    if (fitNonce > 0 && f) {
      position = [f[0] + 6, f[1] + 5, f[2] + 7];
      target = [f[0], f[1] + 0.8, f[2]];
    }
    camera.position.set(...position);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
    invalidate();
  // Keyed only on explicit camera commands (see note above).
  }, [camera, controlsRef, fitNonce, view, viewNonce, invalidate]);

  // "Frame selection" (Ctrl+Alt+F in Visual Components). Frames the selected object — or
  // the followed human — from the same three-quarter angle the iso view uses.
  useEffect(() => {
    if (!fitSelected) return;
    const f = focusRef.current;
    if (!f) return;
    const live = focusIdRef.current ? sim.humans.get(focusIdRef.current) : undefined;
    const p: Vec3 = live ? [live.x, f[1], live.z] : f;
    camera.position.set(p[0] + 3.2, p[1] + 2.6, p[2] + 3.8);
    if (controlsRef.current) {
      controlsRef.current.target.set(p[0], p[1] + 0.6, p[2]);
      controlsRef.current.update();
    }
    invalidate();
  }, [fitSelected, camera, controlsRef, invalidate]);

  // Wheel-free zoom (Ctrl +/- shortcuts, ribbon buttons) keeps the orbit target fixed.
  useEffect(() => {
    if (!zoom.nonce) return;
    const target = controlsRef.current?.target ?? new THREE.Vector3();
    const offset = camera.position.clone().sub(target);
    const factor = zoom.direction > 0 ? 0.82 : 1.22;
    const next = Math.min(80, Math.max(3, offset.length() * factor));
    camera.position.copy(target.clone().add(offset.setLength(next)));
    controlsRef.current?.update();
    invalidate();
  }, [zoom, camera, controlsRef, invalidate]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={3}
      maxDistance={80}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI / 2.02}
      target={[0, 0.4, 0]}
    />
  );
}

function DropTarget({ onAddAt }: { onAddAt: (kind: ComponentKind, position: Vec3) => void }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const point = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const over = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer?.getData("application/x-factory-component") as ComponentKind;
      if (!kind || !COMPONENTS.some((component) => component.kind === kind)) return;
      const rect = element.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(GROUND, point)) {
        onAddAt(kind, [Math.round(point.x * 4) / 4, 0, Math.round(point.z * 4) / 4]);
      }
    };
    element.addEventListener("dragover", over);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("drop", drop);
    };
  }, [camera, gl, onAddAt]);

  return null;
}

/** Steps the simulation in a bounded slice while keeping static shadows cheap. */
function SimDriver({ items, shell, low }: { items: SceneItem[]; shell: boolean; low: boolean }) {
  const { gl, invalidate } = useThree();
  const frame = useRef(0);
  const frameMs = useRef(16);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
  }, [gl]);
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [items, shell, gl, invalidate]);

  useFrame((_, delta) => {
    if (!sim.running) return;
    // Exponential average of the real frame time, including the last simulation step.
    const ms = Math.min(200, delta * 1000);
    frameMs.current = frameMs.current * 0.85 + ms * 0.15;
    if (frame.current % 20 === 0) setGraphicsStatus({ frameMs: Math.round(frameMs.current * 10) / 10 });
    sim.stepBudgetMs = simulationFrameBudget(frameMs.current, sim.lastStepMs);
    // Run after the current render so yielding between substeps does not include
    // GPU/render work in the simulation budget. All visual callbacks in a frame
    // then read one consistent, completed simulation state.
    queueMicrotask(() => { void sim.stepAsync(delta); });
    frame.current += 1;
    // Shadows of a moving plant only need refreshing every other frame at most.
    if (!low ? frame.current % 2 === 0 : frame.current % 3 === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

function SelectionMarker({ item }: { item: SceneItem }) {
  const ring = useRef<THREE.Group>(null);
  const size = Math.max(0.9, Math.min(2.4, (MODEL_HEIGHTS[item.kind] ?? 1.5) * 0.55)) * (item.kind === "conveyor" || item.kind === "roller" ? 0.35 : 1);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.6) * 0.03);
    const rt=sim.humans.get(item.id);
    if (rt) {
      const rot=item.rotation*Math.PI/180, dx=rt.x-item.position[0], dz=rt.z-item.position[2];
      ring.current.position.set((dx*Math.cos(rot)-dz*Math.sin(rot))/item.scale, .03, (dx*Math.sin(rot)+dz*Math.cos(rot))/item.scale);
    }
  });
  if (item.kind === "conveyor" || item.kind === "roller") return null;
  return (
    <group ref={ring} userData={{selectionFor:item.id}} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[size, size + 0.08, 56]} />
        <meshBasicMaterial color={TEAL_3D} transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[size, 56]} />
        <meshBasicMaterial color={TEAL_3D} transparent opacity={0.12} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ConveyorHandles({
  item,
  selectedPoint,
  onGrab,
}: {
  item: SceneItem;
  selectedPoint: number | null;
  onGrab: (event: ThreeEvent<PointerEvent>, index: number) => void;
}) {
  const pts = item.points ?? [];
  return (
    <group>
      {pts.map((p, index) => {
        const active = selectedPoint === index;
        return (
          <group key={index} userData={{ splineHandleFor: item.id, pointIndex: index }} position={[p[0], item.kind === "fence" ? Number(item.props.height ?? 2) + 0.12 : BELT_Y + 0.2 + (item.pointHeights?.[index] ?? 0), p[1]]} onPointerDown={(event) => onGrab(event, index)}>
            <mesh renderOrder={20}>
              <sphereGeometry args={[active ? 0.2 : 0.15, 16, 12]} />
              <meshBasicMaterial color={active ? TEAL_3D : "#ffffff"} depthTest={false} transparent opacity={0.96} toneMapped={false} />
            </mesh>
            <mesh renderOrder={19}>
              <sphereGeometry args={[active ? 0.27 : 0.21, 16, 12]} />
              <meshBasicMaterial color="#1b1b1b" depthTest={false} transparent opacity={0.55} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Three-axis transform controls use a world-space anchor separate from the
 * model, so the original drag-to-move/rotate and spline spheres keep working. */
function ObjectGizmo({ item, tool, snap, onBeginEdit, onUpdateItem, onActive }: {
  item: SceneItem; tool: ToolMode; snap: boolean; onBeginEdit: () => void;
  onUpdateItem: ViewportProps["onUpdateItem"]; onActive: (active: boolean) => void;
}) {
  const anchor = useMemo(() => { const node = new THREE.Object3D(); node.name = `transform-anchor-${item.id}`; return node; }, [item.id]);
  const active = useRef(false);
  const wasPhysical = useRef(false);
  const control = useRef<TransformControlsImpl>(null);
  useEffect(() => {
    if (active.current) return;
    anchor.position.set(...item.position);
    anchor.rotation.set((item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180, 'XYZ');
    anchor.updateMatrixWorld(true);
  }, [anchor, item.position, item.rotation, item.rotationX, item.rotationZ]);
  useEffect(() => () => { if (active.current) onActive(false); }, [onActive]);
  useFrame(() => {
    const pose = sim.getPhysicsPose(item.id);
    if (active.current) return;
    if (pose) {
      wasPhysical.current = true;
      anchor.position.set(...pose.position);
      anchor.rotation.set(pose.rotationX * Math.PI / 180, pose.rotation * Math.PI / 180, pose.rotationZ * Math.PI / 180, 'XYZ');
    } else if (wasPhysical.current) {
      wasPhysical.current = false;
      anchor.position.set(...item.position);
      anchor.rotation.set((item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180, 'XYZ');
    }
  });
  const degrees = (radians: number) => Math.round(radians * 1800 / Math.PI) / 10;
  return <>
    <primitive object={anchor} />
    <TransformControls ref={control} object={anchor} mode={tool === 'rotate' ? 'rotate' : 'translate'} space="world" size={0.85}
      onChange={() => { if (!active.current) onActive(!!(control.current as unknown as {axis: string | null} | null)?.axis); }}
      translationSnap={snap ? 0.25 : null} rotationSnap={snap ? Math.PI / 12 : null}
      onMouseDown={() => { active.current = true; onActive(true); onBeginEdit(); }}
      onMouseUp={() => { active.current = false; onActive(false); }}
      onObjectChange={() => {
        if (!active.current) return;
        if (tool === 'move') {
          const clamp = (v: number) => Math.max(-200, Math.min(200, Math.round(v * 1000) / 1000));
          onUpdateItem(item.id, { position: [clamp(anchor.position.x), clamp(anchor.position.y), clamp(anchor.position.z)] }, false);
        } else {
          onUpdateItem(item.id, { rotationX: degrees(anchor.rotation.x), rotation: degrees(anchor.rotation.y), rotationZ: degrees(anchor.rotation.z) }, false);
        }
      }}
    />
  </>;
}

/** The selected spline handle has its own world-space gizmo; converting back
 * through the item's full rotation keeps point editing correct on tilted belts. */
function PointGizmo({ item, index, snap, onBeginEdit, onUpdateItem, onActive }: {
  item: SceneItem; index: number; snap: boolean; onBeginEdit: () => void;
  onUpdateItem: ViewportProps["onUpdateItem"]; onActive: (active: boolean) => void;
}) {
  const anchor = useMemo(() => { const node = new THREE.Object3D(); node.name = `spline-transform-anchor-${item.id}-${index}`; return node; }, [item.id, index]);
  const active = useRef(false);
  const wasPhysical = useRef(false);
  const control = useRef<TransformControlsImpl>(null);
  const point = item.points?.[index];
  const rotation = (base: Pick<SceneItem, 'rotationX' | 'rotation' | 'rotationZ'> = item) => new THREE.Quaternion().setFromEuler(new THREE.Euler((base.rotationX ?? 0) * Math.PI / 180, base.rotation * Math.PI / 180, (base.rotationZ ?? 0) * Math.PI / 180, 'XYZ'));
  useEffect(() => {
    if (active.current || !point) return;
    anchor.position.set(point[0], BELT_Y + 0.2 + (item.pointHeights?.[index] ?? 0), point[1]).applyQuaternion(rotation()).add(new THREE.Vector3(...item.position));
    anchor.updateMatrixWorld(true);
  }, [anchor, item.position, item.rotation, item.rotationX, item.rotationZ, item.points, item.pointHeights, index]);
  useEffect(() => () => { if (active.current) onActive(false); }, [onActive]);
  useFrame(() => {
    const pose = sim.getPhysicsPose(item.id);
    if (active.current || !point) return;
    if (pose) wasPhysical.current = true;
    else if (!wasPhysical.current) return;
    else wasPhysical.current = false;
    const base = pose ?? item;
    anchor.position.set(point[0], BELT_Y + 0.2 + (item.pointHeights?.[index] ?? 0), point[1]).applyQuaternion(rotation(base)).add(new THREE.Vector3(...base.position));
  });
  if (!point) return null;
  const clamp = (value: number) => Math.max(-200, Math.min(200, Math.round(value * 1000) / 1000));
  return <>
    <primitive object={anchor} />
    <TransformControls ref={control} object={anchor} mode="translate" space="world" size={0.85} translationSnap={snap ? 0.25 : null}
      onChange={() => { if (!active.current) onActive(!!(control.current as unknown as {axis: string | null} | null)?.axis); }}
      onMouseDown={() => { active.current = true; onActive(true); onBeginEdit(); }}
      onMouseUp={() => { active.current = false; onActive(false); }}
      onObjectChange={() => {
        if (!active.current || !item.points) return;
        const base = sim.getPhysicsPose(item.id) ?? item;
        const local = anchor.position.clone().sub(new THREE.Vector3(...base.position)).applyQuaternion(rotation(base).invert());
        const snapLocal = (value: number) => clamp(snap ? Math.round(value * 4) / 4 : value);
        const points = item.points.map((p, i) => i === index ? [snapLocal(local.x), snapLocal(local.z)] as [number, number] : p);
        const pointHeights = item.points.map((_, i) => i === index ? snapLocal(local.y - BELT_Y - 0.2) : item.pointHeights?.[i] ?? 0);
        onUpdateItem(item.id, { points, pointHeights }, false);
      }} />
  </>;
}

/** Renderer reads solver poses directly; the authored layout is left intact. */
function PhysicalItemGroup({ item, onPointerDown, onDuplicate, children }: {
  item: SceneItem; onPointerDown: (event: ThreeEvent<PointerEvent>, item: SceneItem) => void;
  onDuplicate: (id: string) => void; children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const wasPhysical = useRef(false);
  useFrame(() => {
    const node = ref.current, pose = sim.getPhysicsPose(item.id);
    if (!node) return;
    if (pose) wasPhysical.current = true;
    else if (!wasPhysical.current) return;
    else wasPhysical.current = false;
    const base = pose ?? item;
    node.position.set(...base.position);
    node.rotation.set((base.rotationX ?? 0) * Math.PI / 180, base.rotation * Math.PI / 180, (base.rotationZ ?? 0) * Math.PI / 180, 'XYZ');
  });
  const isPath = ['conveyor', 'roller', 'fence'].includes(item.kind);
  return <group ref={ref} userData={{ sceneItemId: item.id }} position={item.position}
    rotation={[(item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180]}
    scale={isPath ? 1 : item.scale}
    onPointerDown={(event) => onPointerDown(event, sim.getPhysicsPose(item.id) ? { ...item, ...sim.getPhysicsPose(item.id)! } : item)}
    onDoubleClick={(event) => { if (!event.ctrlKey && !event.metaKey) return; event.stopPropagation(); if (!item.locked) onDuplicate(item.id); }}>
    {children}
  </group>;
}

interface SceneContentProps {
  items: SceneItem[];
  productItems?: SceneItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedPoint: number | null;
  onSelectPoint: (index: number | null) => void;
  tool: ToolMode;
  snap: boolean;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onUpdateItem: ViewportProps["onUpdateItem"];
  onBeginEdit: () => void;
  shell: boolean;
  building: BuildingStyle;
}

function SceneContent({
  items,
  productItems = items,
  selectedId,
  onSelect,
  selectedPoint,
  onSelectPoint,
  tool,
  snap,
  controlsRef,
  onUpdateItem,
  onBeginEdit,
  shell,
  building,
  onDuplicateItem,
}: SceneContentProps & { onDuplicateItem: (id: string) => void }) {
  const { camera, gl } = useThree();
  const drag = useRef<DragState | null>(null);
  const gizmoActive = useRef(false);
  const setGizmoActive = useCallback((active: boolean) => {
    gizmoActive.current = active;
    // Native TransformControls and the scene's legacy pointer handler see the
    // same press. Whichever fires first, never run both drags at once.
    // Selecting a spline sphere mounts its gizmo while that same sphere-drag
    // is already in progress; a hover over the newly mounted arrows must not
    // cancel the legacy drag. Gizmo presses suppress grabPoint before it starts.
    if (active && drag.current?.type === "item") drag.current = null;
  }, []);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    gl.domElement.style.cursor = tool === "select" ? "" : "crosshair";
  }, [gl, tool]);

  const startDrag = useCallback(
    (event: ThreeEvent<PointerEvent>, item: SceneItem) => {
      event.stopPropagation();
      if (gizmoActive.current) return;
      onSelect(item.id);
      onSelectPoint(null);
      if (item.kind === "button" && tool === "select") {
        const pressed = sim.signalState.get(item.id) === true;
        sim.setButton(item.id, !pressed);
        onUpdateItem(item.id, { props: { ...item.props, signal: !pressed } }, false);
      }
      if (tool === "select" || item.locked) return;
      const hit = new THREE.Vector3();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -item.position[1]);
      if (!event.ray.intersectPlane(plane, hit)) return;
      onBeginEdit();
      drag.current = {
        type: "item",
        id: item.id,
        startGround: hit.clone(),
        startPosition: [...item.position] as Vec3,
        startRotation: item.rotation,
        startAngle: Math.atan2(hit.z - item.position[2], hit.x - item.position[0]),
      };
      if (controlsRef.current) controlsRef.current.enabled = false;
      gl.domElement.style.cursor = "grabbing";
    },
    [controlsRef, gl, onBeginEdit, onSelect, onSelectPoint, tool],
  );

  const grabPoint = useCallback(
    (event: ThreeEvent<PointerEvent>, id: string, index: number) => {
      event.stopPropagation();
      if (gizmoActive.current) return;
      onSelect(id);
      onSelectPoint(index);
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!item || item.locked) return;
      onBeginEdit();
      drag.current = { type: "point", id, index };
      if (controlsRef.current) controlsRef.current.enabled = false;
      gl.domElement.style.cursor = "grabbing";
    },
    [controlsRef, gl, onBeginEdit, onSelect, onSelectPoint],
  );

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const project = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const current = drag.current;
      const item = current?.type === "point" ? itemsRef.current.find((i) => i.id === current.id) : null;
      if (item) {
        const height = item.kind === "fence" ? Number(item.props.height ?? 2) + 0.12 : BELT_Y + 0.2 + (item.pointHeights?.[current?.type === "point" ? current.index : 0] ?? 0);
        const rotation = new THREE.Euler((item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180, 'XYZ');
        const q = new THREE.Quaternion().setFromEuler(rotation);
        const origin = new THREE.Vector3(0, height, 0).applyQuaternion(q).add(new THREE.Vector3(...item.position));
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0).applyQuaternion(q), origin);
      } else plane.set(new THREE.Vector3(0, 1, 0), current?.type === 'item' ? -current.startPosition[1] : 0);
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
    };

    const move = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      const point = project(event);
      if (!point) return;
      if (state.type === "point") {
        const item = itemsRef.current.find((candidate) => candidate.id === state.id);
        if (!item || !item.points) return;
        const rotation = new THREE.Euler((item.rotationX ?? 0) * Math.PI / 180, item.rotation * Math.PI / 180, (item.rotationZ ?? 0) * Math.PI / 180, 'XYZ');
        const local = point.clone().sub(new THREE.Vector3(...item.position)).applyQuaternion(new THREE.Quaternion().setFromEuler(rotation).invert());
        let lx = local.x;
        let lz = local.z;
        if (snap) {
          lx = Math.round(lx * 4) / 4;
          lz = Math.round(lz * 4) / 4;
        }
        const next = item.points.map((p, i) => (i === state.index ? ([Math.round(lx * 100) / 100, Math.round(lz * 100) / 100] as [number, number]) : p));
        onUpdateItem(state.id, { points: next }, false);
        return;
      }
      if (tool === "move") {
        const x = state.startPosition[0] + point.x - state.startGround.x;
        const z = state.startPosition[2] + point.z - state.startGround.z;
        const snapValue = (value: number) => (snap ? Math.round(value * 4) / 4 : value);
        onUpdateItem(state.id, { position: [snapValue(x), state.startPosition[1], snapValue(z)] }, false);
      } else if (tool === "rotate") {
        const angle = Math.atan2(point.z - state.startPosition[2], point.x - state.startPosition[0]);
        let degrees = state.startRotation - ((angle - state.startAngle) * 180) / Math.PI;
        if (snap) degrees = Math.round(degrees / 15) * 15;
        degrees = ((degrees % 360) + 360) % 360;
        onUpdateItem(state.id, { rotation: Math.round(degrees) }, false);
      }
    };

    const end = () => {
      if (!drag.current) return;
      drag.current = null;
      if (controlsRef.current) controlsRef.current.enabled = true;
      gl.domElement.style.cursor = tool === "select" ? "" : "crosshair";
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [camera, controlsRef, gl, onUpdateItem, snap, tool]);

  return (
    <>
      <FactoryEnvironment shell={shell} building={building} />
      {items.map((item) => {
        if (item.visible === false) return null;
        const selected = item.id === selectedId;
        const isConveyor = item.kind === "conveyor" || item.kind === "roller" || item.kind === "fence";
        return (
          <PhysicalItemGroup key={item.id} item={item} onPointerDown={startDrag} onDuplicate={onDuplicateItem}>
            {item.kind === "imported-model" && item.imported ? <ImportedModel model={item.imported} id={item.id} /> : <FactoryModel item={item} productItems={item.kind === "crates" ? productItems : undefined} />}
            {selected && <SelectionMarker item={item} />}
            {selected && isConveyor && (
              <ConveyorHandles item={item} selectedPoint={selectedPoint} onGrab={(event, index) => grabPoint(event, item.id, index)} />
            )}
          </PhysicalItemGroup>
        );
      })}
      {(() => {
        const selected = items.find((item) => item.id === selectedId && item.visible !== false && !item.locked);
        if (!selected || tool === 'select') return null;
        if (tool === 'move' && selectedPoint !== null && ['conveyor', 'roller'].includes(selected.kind) && selected.points?.[selectedPoint]) {
          return <PointGizmo item={selected} index={selectedPoint} snap={snap} onBeginEdit={onBeginEdit} onUpdateItem={onUpdateItem} onActive={setGizmoActive} />;
        }
        return <ObjectGizmo item={selected} tool={tool} snap={snap} onBeginEdit={onBeginEdit} onUpdateItem={onUpdateItem} onActive={setGizmoActive} />;
      })()}
      <BoxesLayer items={productItems} />
      <WireLayer items={items} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  HTML overlays                                                      */
/* ------------------------------------------------------------------ */

function SelectionHud({ item, onDuplicate, onDelete }: { item: SceneItem; onDuplicate: () => void; onDelete: () => void }) {
  const def = getDef(item.kind);
  const accent = item.color || partAccent(item.kind);
  return (
    <div
      className="pointer-events-auto flex w-fit max-w-[300px] items-stretch overflow-hidden rounded border border-white/15 bg-[#2a2a2c]/92 shadow-[0_8px_24px_rgba(0,0,0,.35)] backdrop-blur"
      style={{ borderLeftColor: TEAL, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="flex h-7 w-8 items-center justify-center rounded border border-white/10 bg-[#3a3a3d]">
          <PartIcon kind={item.kind} className="h-5 w-6" />
        </span>
        <div className="min-w-0 leading-none">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[140px] truncate text-[10.5px] font-medium text-[#f0f0f0]">{t(item.name)}</span>
            <span className="rounded px-1 py-px font-mono text-[6.5px] uppercase tracking-wider" style={{ color: accent, backgroundColor: `${accent}22` }}>
              {t(def.category)}
            </span>
          </div>
          <div className="mt-1 font-mono text-[8px] text-white/40"> {t("X")} {item.position[0].toFixed(2)} {t("· Z")} {item.position[2].toFixed(2)} · {Math.round(item.rotation)}°
          </div>
        </div>
      </div>
      <div className="flex items-center gap-px border-l border-white/10 px-1">
        <button type="button" onClick={onDuplicate} title={t("Duplicate")} className="rounded p-1.5 text-white/45 transition hover:bg-white/10 hover:text-[var(--app-accent-bright)]">
          <Layers3 size={11} />
        </button>
        <button type="button" onClick={onDelete} title={t("Delete")} className="rounded p-1.5 text-white/45 transition hover:bg-white/10 hover:text-[#ff9d89]">
          <span className="text-[13px] leading-none">×</span>
        </button>
      </div>
    </div>
  );
}

function ViewCube({ view, onPick }: { view: CameraPreset; onPick: (view: CameraPreset) => void }) {
  const faces: { id: CameraPreset; label: string; d: string; lx: number; ly: number }[] = [
    { id: "back", label: "B", d: "M0 0H96L72 24H24Z", lx: 48, ly: 14 },
    { id: "left", label: "L", d: "M0 0L24 24V72L0 96Z", lx: 12, ly: 52 },
    { id: "right", label: "R", d: "M96 0V96L72 72V24Z", lx: 84, ly: 52 },
    { id: "front", label: "F", d: "M0 96L24 72H72L96 96Z", lx: 48, ly: 88 },
    { id: "top", label: "T", d: "M24 24H72V72H24Z", lx: 48, ly: 54 },
  ];
  return (
    <svg width="92" height="92" viewBox="0 0 96 96" className="drop-shadow-[0_6px_14px_rgba(0,0,0,.25)]" aria-label={t("View cube")}>
      {faces.map((face) => {
        const active = view === face.id;
        return (
          <g key={face.id} onClick={() => onPick(face.id)} className="cursor-pointer">
            <path
              d={face.d}
              fill={active ? "#3ab7c8" : "#5a5a5d"}
              stroke="#d9d9d9"
              strokeWidth="2.4"
              strokeLinejoin="round"
              className="transition hover:fill-[var(--app-accent)]"
              style={{ opacity: 0.94 }}
            />
            <text x={face.lx} y={face.ly} textAnchor="middle" fontSize="15" fontWeight="600" fill="#fff" style={{ pointerEvents: "none" }}>
              {t(face.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Live frames-per-second readout, measured from requestAnimationFrame callbacks. */
function FpsBadge() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0, start = performance.now(), raf = 0, alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      frames += 1;
      if (now - start >= 500) { setFps(Math.round((frames * 1000) / (now - start))); frames = 0; start = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white/85" aria-label="Frames per second">{fps} FPS</div>;
}

function SimPlayer({ running, onToggleRun, onReset, speed, onSpeed, onToggleFullscreen, onToggleViewExtras, onToggleGrid }: { running: boolean; onToggleRun: () => void; onReset: () => void; speed: number; onSpeed: (speed: number) => void; onToggleFullscreen: () => void; onToggleViewExtras: () => void; onToggleGrid: () => void }) {
  const snap = useSimSnapshot(250);
  const [menu, setMenu] = useState(false);
  const menuFrame = useRef<HTMLDivElement>(null);
  const [menuSize, setMenuSize] = useState<WindowSize | null>(null);
  const [clockMode, setClockMode] = useState("hms");
  const [mode, setMode] = useState("real");
  const [runTime, setRunTime] = useState("Infinite");
  const [actualSpeed, setActualSpeed] = useState<number | null>(null);
  useEffect(() => {
    setActualSpeed(null);
    if (!running) return undefined;
    let time = sim.time, wall = performance.now(), revision = sim.clockRevision;
    const id = window.setInterval(() => {
      const now = performance.now(), elapsed = (now - wall) / 1000;
      const next = sim.clockRevision === revision && elapsed > 0 ? (sim.time - time) / elapsed : null;
      setActualSpeed(next);
      time = sim.time; wall = now; revision = sim.clockRevision;
    }, simulationRateSampleMs(speed));
    return () => window.clearInterval(id);
  }, [speed, running]);
  return (
    <div className="sim-player pointer-events-auto relative">
      <div className="flex items-center gap-2 rounded-sm border border-[#ffffff18] bg-[#272729]/95 px-2 py-1.5 shadow-[0_5px_16px_rgba(0,0,0,.4)] backdrop-blur">
        <button type="button" onClick={() => setMenu(!menu)} aria-label={t("Simulation settings")} className={cn("rounded p-1 text-white/60 hover:bg-white/10", menu && "bg-white/10 text-white")}><Settings2 size={15} /></button>
        <button type="button" onClick={onReset} title={t("Reset simulation")} className="rounded p-1 text-white/70 hover:bg-white/10"><RotateCcw size={15} /></button>
        <button type="button" onClick={onToggleRun} title={t(running ? "Pause (Space)" : "Play (Space)")} className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 transition", running ? "border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]" : "border-white/55 text-white/90 hover:border-white")}>{running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}</button>
        <span className="ml-1 w-[72px] font-mono text-[17px] font-light tracking-wide text-[#e9eef0]">{clockMode === "seconds" ? snap.time.toFixed(1) : formatClock(snap.time)}</span>
        <span className="font-mono text-[10px] text-[var(--app-accent-bright)]">x</span>
        <input aria-label={t("Simulation speed multiplier")} type="number" min={0.01} step={0.25} inputMode="decimal" value={speed} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value) && value > 0) onSpeed(value); }} className="w-[58px] rounded-sm border border-[#ffffff18] bg-[#1d1d1f] px-1.5 py-1 font-mono text-[11px] text-right text-white outline-none focus:border-[var(--app-accent)]" />
        {running && actualSpeed !== null && actualSpeed < speed * 0.8 && <span role="status" title={t("Simulation is limited by device performance; the displayed rate is the actual speed.")} className="whitespace-nowrap font-mono text-[10px] text-amber-300">~{actualSpeed.toFixed(1)}x</span>}
        <button type="button" aria-label={t("Slower")} title={t("Slower")} className="player-step rounded px-1 font-mono text-[12px] text-white/60 hover:bg-white/10 hover:text-white" onClick={() => onSpeed(Math.max(0.25, Math.round((speed - 0.25) * 100) / 100))}>−</button>
        <input aria-label={t("Simulation speed")} title={t("Double-click to reset to 1.0")} type="range" min={0.25} max={Math.max(8, Math.ceil(speed * 2))} step={0.25} value={Math.min(Math.max(8, Math.ceil(speed * 2)), speed)} onChange={(e) => onSpeed(Number(e.target.value))} onDoubleClick={() => onSpeed(1)} className="player-slider accent-range w-[88px]" />
        <button type="button" aria-label={t("Faster")} title={t("Faster")} onClick={() => onSpeed(Math.round((speed + 0.25) * 100) / 100)} className="player-step rounded px-1 font-mono text-[12px] text-white/60 hover:bg-white/10 hover:text-white">+</button>
        <div className="player-viewbtns ml-1 flex items-center gap-0.5 border-l border-white/10 pl-1.5"><button type="button" aria-label={t("Fullscreen")} title={t("Fullscreen")} onClick={onToggleFullscreen} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"><Maximize2 size={13} /></button><button type="button" aria-label={t("Toggle side panels")} title={t("Toggle side panels")} onClick={onToggleViewExtras} className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white"><Eye size={13} /></button><button type="button" aria-label={t("Toggle grid")} title={t("Toggle grid")} onClick={onToggleGrid} className="rounded p-1 text-white/35 hover:bg-white/10 hover:text-white"><Grid3X3 size={13} /></button></div>
      </div>
      {menu && <div ref={menuFrame} data-sim-menu role="dialog" aria-label={t("Simulation settings")} style={menuSize ? { width: menuSize.width, height: menuSize.height } : undefined} className="simulation-settings-menu absolute left-0 top-[calc(100%+8px)] z-40 flex max-h-[calc(100dvh-140px)] w-[330px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-sm border border-[#ffffff1f] bg-[#2b2b2d] text-[11px] text-white/75 shadow-[0_14px_38px_rgba(0,0,0,.55)]">
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between pr-5"><span className="text-[12px]">{t("Simulation settings")}</span><button type="button" onClick={() => setMenu(false)} aria-label={t("Close")} className="text-white/40">✕</button></div>
        <label className="mb-2 flex items-center justify-between gap-3">{t("Clock Display Mode")}<select value={clockMode} onChange={(e) => setClockMode(e.target.value)} className="w-[165px] rounded-sm border border-white/10 bg-[#1e1e20] p-1"><option value="hms">Hours : Minutes : Seconds</option><option value="seconds">Seconds</option></select></label>
        <label className="mb-2 flex items-center justify-between gap-3">{t("Simulation Run Time")}<span className="flex w-[165px] gap-1"><input value={runTime} onChange={(e) => setRunTime(e.target.value)} className="min-w-0 flex-1 rounded-sm border border-white/10 bg-[#1e1e20] px-2 py-1" /><button type="button" className="rounded-sm border border-white/15 bg-[#3b3b3e] px-2">Custom</button></span></label>
        <div className="mb-2 flex items-center justify-between gap-3">{t("Warm Up Time")}<span className="flex w-[165px] gap-1">{[0, 0, 0].map((n, i) => <input key={i} defaultValue={n} aria-label={`${t("Warm Up Time")} ${i + 1}`} className="w-full rounded-sm border border-white/10 bg-[#1e1e20] px-1.5 py-1 text-center" />)}<button type="button" onClick={onReset} className="rounded-sm border border-white/15 bg-[#3b3b3e] px-2">{t("Reset")}</button></span></div>
        <div className="mb-2 flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--app-accent)]" />{t("Repeat")}</label><label className="ml-auto flex items-center gap-1.5">{t("Simulation Level")}<select className="rounded-sm border border-white/10 bg-[#1e1e20] p-1"><option>Default</option><option>Detailed</option><option>Fast</option></select></label></div>
        <div className="flex items-center gap-4 border-t border-white/10 pt-2"><span>{t("Simulation Mode")}</span><label className="flex items-center gap-1.5"><input type="radio" name="sim-mode" checked={mode === "real"} onChange={() => setMode("real")} className="accent-[var(--app-accent)]" />{t("Real Time")}</label><label className="flex items-center gap-1.5"><input type="radio" name="sim-mode" checked={mode === "virtual"} onChange={() => setMode("virtual")} className="accent-[var(--app-accent)]" />{t("Virtual Time")}</label></div>
        </div>
        <WindowResizeHandle className="sim-menu-resize-bottom" frame={menuFrame} minWidth={260} minHeight={160} onResize={setMenuSize} />
        <WindowResizeHandle className="sim-menu-resize-top" edge="top-right" frame={menuFrame} minWidth={260} minHeight={160} onResize={setMenuSize} />
      </div>}
    </div>
  );
}

/** Corner mini-map. Uses the same plan geometry as the AI Factory preview. */
function FloorMap({ items, selectedId, onSelect, onExpand }: { items: SceneItem[]; selectedId: string | null; onSelect: (id: string | null) => void; onExpand: () => void }) {
  return (
    <div className="w-[186px] overflow-hidden rounded border border-white/10 bg-[#2a2a2c]/90 shadow-lg backdrop-blur" data-floor-map>
      <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/50">{t("Floor map")}</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          <button type="button" onClick={onExpand} aria-label={t("Open floor map")} title={t("Open floor map")} className="rounded p-0.5 text-white/45 hover:bg-white/10 hover:text-white"><Maximize2 size={9} /></button>
        </span>
      </div>
      <div className="relative h-[112px] w-full">
        <FloorPlanView items={items} selectedId={selectedId} onSelect={onSelect} width={186} height={112} />
      </div>
    </div>
  );
}

export const Viewport = memo(function Viewport({
  mobile,
  skin,
  quality,
  building: buildingSettings,
  items,
  productItems = items,
  selectedId,
  onSelect,
  selectedPoint,
  onSelectPoint,
  tool,
  snap,
  running,
  onToggleRun,
  onResetSim,
  simSpeed,
  onSimSpeed,
  layoutName,
  onAddAt,
  onImportFiles,
  onUpdateItem,
  onBeginEdit,
  onDeleteItem,
  onDuplicateItem,
  onShowFloorMap,
}: ViewportProps) {
  useLanguage();
  const appearance = useAppearance();
  const gfx = appearance.gfx;
  const [view, setView] = useState<CameraPreset>("iso");
  const [fitNonce, setFitNonce] = useState(0);
  const [fitSelected, setFitSelected] = useState(0);
  const [zoom, setZoom] = useState<{ nonce: number; direction: 1 | -1 }>({ nonce: 0, direction: 1 });
  const [viewNonce, setViewNonce] = useState(0);
  const [viewMenu, setViewMenu] = useState(false);
  const [shell, setShell] = useState(false);
  // Max preset uses WebGPU VXGI when the browser has an adapter and the renderer starts.
  // `gpuFailed` latches after a failed start so the app falls back to WebGL for the session.
  const [gpuSupported, setGpuSupported] = useState<boolean | null>(null);
  const [gpuFailed, setGpuFailed] = useState(false);
  const cornellRoom = useCornellRoom();
  const benchmark = import.meta.env.DEV && cornellRoom;
  const [giError, setGiError] = useState<string | null>(null);
  const gpuMode = gfx.gi === "vxgi" && gpuSupported === true && !gpuFailed && !giError;
  // VXGI falls back to the approximation whenever WebGPU is missing, the renderer failed
  // to start, or the pipeline itself could not be created on this driver.
  const effectiveGi = gfx.gi === "vxgi" && !gpuMode ? "approx" : gfx.gi;
  const makeRenderer = useCallback((defaults: GLFactoryProps) => createGpuRenderer(defaults, () => setGpuFailed(true)), []);
  const onGiUnavailable = useCallback((message: string) => setGiError(message), []);
  // Leaving the Max preset retries VXGI next time it is selected.
  useEffect(() => { if (gfx.gi !== "vxgi") setGiError(null); }, [gfx.gi]);
  useEffect(() => {
    if (effectiveGi !== "vxgi") setGraphicsStatus({ gi: effectiveGi, giDetail: gfx.gi === "vxgi" ? (giError ?? "WebGPU unavailable") : "" });
  }, [effectiveGi, gfx.gi, giError]);
  useEffect(() => {
    let alive = true;
    void probeWebGPU().then((ok) => { if (alive) setGpuSupported(ok); });
    return () => { alive = false; };
  }, []);
  // VXGI must re-voxelise when the geometry OR the lighting changes (lights are baked
  // into the volume), but never on an unrelated re-render.
  const voxelKey = useMemo(() => ({}), [
    items, shell, buildingSettings.width, buildingSettings.depth, buildingSettings.height,
    gfx.sun, gfx.sunAzimuth, gfx.sunElevation, gfx.fill, gfx.ambient, gfx.env, gfx.shadows,
  ]);

    const xs = items.map((i) => i.position[0]), zs = items.map((i) => i.position[2]);
  const building: BuildingStyle = { ...buildingSettings };
  building.width = Math.max(building.width, Math.max(...xs, 8) - Math.min(...xs, -8) + 8);
  building.depth = Math.max(building.depth, Math.max(...zs, 6) - Math.min(...zs, -6) + 8);
  const [signalMode, setSignalMode] = useState(false);
  const [signalSource, setSignalSource] = useState<string | null>(null);
  const sourceItem = items.find(item => item.id === signalSource && canSignalOutput(item));
  const selectSignalTarget = (id: string) => {
    const target = items.find(item => item.id === id);
    if (!sourceItem || !target || !canSignalInput(target, sourceItem.id)) return;
    const targets = signalTargets(sourceItem);
    onUpdateItem(sourceItem.id, signalTargetsPatch(sourceItem, targets.includes(target.id) ? targets.filter((entry) => entry !== target.id) : [...targets, target.id]));
    setSignalSource(null);
  };
  const connectSignal = (sourceId: string, targetId: string) => {
    const source = items.find(item => item.id === sourceId), target = items.find(item => item.id === targetId);
    if (!source || !target || !canSignalOutput(source) || !canSignalInput(target, sourceId)) return;
    const targets = signalTargets(source);
    if (!targets.includes(targetId)) onUpdateItem(sourceId, signalTargetsPatch(source, [...targets, targetId]));
    setSignalSource(null);
  };
  const rerouteSignal = (sourceId: string, oldTarget: string, newTarget: string | null) => {
    const source = items.find(item => item.id === sourceId);
    if (!source || !canSignalOutput(source)) return;
    const target = items.find(item => item.id === newTarget);
    const targets = signalTargets(source).filter(id => id !== oldTarget);
    if (target && canSignalInput(target, sourceId)) targets.push(target.id);
    onUpdateItem(sourceId, signalTargetsPatch(source, targets));
    setSignalSource(null);
  };
  const [gridVisible, setGridVisible] = useState(true);
  const [hudVisible, setHudVisible] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [low, setLow] = useState(false);
  // The side panels are part of the dockable layout, so this toggle opens and closes
  // them through the same store as the panel headers and the ribbon.
  const layout = useLayout();
  const panelsOpen = layout.catalog.open || layout.inspector.open;
  const setPanelsOpen = (open: boolean) => { setPanel("catalog", { open }); setPanel("inspector", { open }); };
  // Contact shadows render the whole scene into their own target. While the plant is
  // moving they are refreshed a few times per second instead of on every frame.
  const [contactTick, setContactTick] = useState(0);
  useEffect(() => {
    if (!running || !gfx.contactShadows) return;
    const id = window.setInterval(() => setContactTick((n) => (n + 1) % 100000), 250);
    return () => window.clearInterval(id);
  }, [running, gfx.contactShadows]);
  const wrapper = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  // The custom skin owns the 3D viewport colour too; its brightness decides whether
  // grid, fog and helper colours use the dark or the light palette.
  const scheme = activeScheme(appearance);
  const schemeDark = skin === "custom" && (() => {
    const n = parseInt(scheme.viewportBg.slice(1), 16);
    return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255 < 0.5;
  })();
  const dark = skin === "rpro" || schemeDark;
  const sceneBg = gfx.useSkinBackground ? (skin === "custom" ? scheme.viewportBg : dark ? "#29262a" : skin === "vc" ? "#f1f2f3" : "#e3e6e9") : gfx.background;
  // Below 1 renders fewer pixels than the screen has (faster, softer).
  const renderDpr = gfx.adaptive && low ? Math.min(1, gfx.pixelRatio) : gfx.pixelRatio;
  const aoActive = effectiveGi === "ao" || effectiveGi === "approx";
  useEffect(() => { setFitNonce(0); setView("iso"); setViewNonce((n) => n + 1); }, [layoutName]);
  useEffect(() => { setFitNonce(0); setView(benchmark ? "room" : "iso"); setViewNonce((n) => n + 1); }, [benchmark]);

  const pickView = (next: CameraPreset) => {
    setFitNonce(0);
    setView(next);
    setViewNonce((value) => value + 1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void wrapper.current?.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  // Shortcuts and the ribbon talk to the camera through a tiny command bus.
  // `selected` is read through a ref so the subscription never re-registers.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const panelsOpenRef = useRef(panelsOpen);
  panelsOpenRef.current = panelsOpen;
  useEffect(() => onViewportCommand((command) => {
    switch (command.type) {
      case "fit": setFitNonce((value) => value + 1); break;
      case "fit-selected": if (selectedRef.current) setFitSelected((value) => value + 1); break;
      case "view": setFitNonce(0); setView(command.preset); setViewNonce((value) => value + 1); break;
      case "zoom": setZoom((value) => ({ nonce: value.nonce + 1, direction: command.direction })); break;
      case "toggle-grid": setGridVisible((value) => !value); break;
      case "toggle-fullscreen": toggleFullscreen(); break;
      case "center-selected": {
        const item = selectedRef.current;
        if (!item || !controlsRef.current) break;
        controlsRef.current.target.set(item.position[0], item.position[1] + 0.6, item.position[2]);
        controlsRef.current.update();
        break;
      }
    }
  // toggleFullscreen only touches refs, so it is safe to omit from the dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const viewButtons: { id: CameraPreset; label: string }[] = [
    { id: "iso", label: "Iso" },
    { id: "top", label: "Top" },
    { id: "front", label: "Front" },
    { id: "right", label: "Side" },
  ];

  return (
    <div
      ref={wrapper}
      className={cn("app-viewport factory-viewport relative min-h-0 min-w-0 flex-1 overflow-hidden", mobile && "mobile-viewport")}
      style={{ background: sceneBg }}
      // Visual Components: Shift + right-click sets the centre of interest to the
      // selection, so orbiting afterwards happens around that object.
      onPointerDownCapture={(event) => {
        if (event.button === 2 && event.shiftKey && selected) {
          event.preventDefault();
          event.stopPropagation();
          sendViewportCommand({ type: "center-selected" });
        }
      }}
      onContextMenu={(event) => { if (event.shiftKey) event.preventDefault(); }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!dragActive) setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragActive(false);
      }}
      onDrop={(event) => { setDragActive(false); const files = Array.from(event.dataTransfer.files); if (files.length) { event.preventDefault(); onImportFiles(files); } }}
    >
      <ViewportErrorBoundary>
      <Canvas
        // The antialias mode is a context attribute, so switching it recreates the context.
        key={`${gpuMode ? "renderer-webgpu" : "renderer-webgl"}-${gfx.antialias}-${gfx.shadows ? (gfx.softShadows ? "soft" : "hard") : "nosun"}`}
        shadows={gfx.shadows ? (gfx.softShadows ? "percentage" : "basic") : false}
        // The WebGPU VXGI pipeline accumulates TRAA samples across frames, so it must keep rendering.
        frameloop={running || gpuMode ? "always" : "demand"}
        dpr={renderDpr}
        gl={gpuMode ? makeRenderer : { antialias: gfx.antialias === "msaa", powerPreference: "high-performance", stencil: false }}
        camera={{ position: VIEWS.iso.position, fov: 36, near: 0.1, far: 220 }}
        onPointerMissed={() => {
          onSelect(null);
          onSelectPoint(null);
        }}

      >
        {/* Image-based lighting that works on both renderers (drei's Environment only
            supports the WebGL renderer, which is why the Max preset lost its IBL). */}
        {!benchmark && <StudioEnvironment intensity={gfx.env} resolution={quality === "low" ? 32 : quality === "standard" ? 64 : 128} dark={dark} />}
        <RendererSettings gfx={gfx} />
        <ambientLight intensity={benchmark ? 0 : gfx.ambient} color={dark ? "#ffd9d9" : "#ffffff"} />
        {gfx.adaptive && <PerformanceMonitor onDecline={() => setLow(true)} onIncline={() => setLow(false)} flipflops={4} />}
        <color attach="background" args={[sceneBg]} />
        {gfx.fog && <fog attach="fog" args={[sceneBg, gfx.fogFar * 0.45, gfx.fogFar]} />}
        {!benchmark && <hemisphereLight args={dark ? ["#ffc9cf", "#4a3036", 0.32] : ["#e8f2ff", "#778391", 0.38]} />}
        {/* Bounce lights stand in for indirect light. In WebGPU VXGI mode the GI pipeline
            computes indirect light, so keeping them would double-count it. */}
        {effectiveGi === "approx" && gfx.bounce > 0 && !benchmark && <>
          <hemisphereLight args={["#dcecff", "#c0a27c", gfx.bounce * 0.5]} />
          <directionalLight position={[-12, 8, -9]} intensity={gfx.bounce * 0.42} color="#c7dfff" />
          <directionalLight position={[10, 5, -12]} intensity={gfx.bounce * 0.32} color="#ffe4c2" />
          <directionalLight position={[-7, 4, 12]} intensity={gfx.bounce * 0.28} color="#e6f2ff" />
        </>}
        {/* Sun with a tight, texel-snapped frustum that follows the orbit target. */}
        {!benchmark && <SunLight gfx={gfx} controlsRef={controlsRef} building={building} />}
        {benchmark && <directionalLight position={[10, 14, 8]} intensity={0} />}
        <directionalLight position={[-14, 10, -10]} intensity={benchmark ? 0 : gfx.fill} color="#dbe8ff" />

        <CameraRig items={items} view={view} viewNonce={viewNonce} fitNonce={fitNonce} fitSelected={fitSelected} zoom={zoom} focus={selected ? selected.position : null} focusId={selected?.id ?? null} controlsRef={controlsRef} />
        {gpuMode && <GlobalIlluminationPipeline
          voxelKey={voxelKey}
          running={running}
          resolution={gfx.vxgiResolution}
          refreshSeconds={gfx.vxgiRefresh}
          onUnavailable={onGiUnavailable}
        />}
        {benchmark ? <CornellBenchmark /> : <>
          <DropTarget onAddAt={onAddAt} />
          <SimDriver items={items} shell={shell} low={low || gfx.shadowSize === 1024} />
          <SceneContent
            items={items}
            productItems={productItems}
            selectedId={selectedId}
            onSelect={onSelect}
            selectedPoint={selectedPoint}
            onSelectPoint={onSelectPoint}
            tool={tool}
            snap={snap}
            controlsRef={controlsRef}
            onUpdateItem={onUpdateItem}
            onBeginEdit={onBeginEdit}
            shell={shell}
            building={building}
            onDuplicateItem={onDuplicateItem}
          />
          {signalMode && <SignalPortLayer items={items} sourceId={sourceItem?.id ?? null} targets={sourceItem ? signalTargets(sourceItem) : []} onSource={setSignalSource} onTarget={selectSignalTarget} onConnect={connectSignal} onReroute={rerouteSignal} />}
        </>}
        {gridVisible && gfx.grid && !benchmark && <gridHelper args={[Math.max(80, Math.ceil(Math.max(building.width, building.depth) * 1.4)), 40, dark ? "#51353b" : "#b4bbc2", dark ? "#3d2c31" : "#d3d8dc"]} position={[0, 0.004, 0]} raycast={() => null} />}
        {gfx.shadows && gfx.contactShadows && !gpuMode && !benchmark && <ContactShadows
          key={`contact-${running ? contactTick : "still"}`}
          position={[0, 0.015, 0]}
          scale={[Math.max(24, building.width + 8), Math.max(24, building.depth + 8)]}
          opacity={gfx.contactOpacity}
          far={5}
          blur={1.5}
          resolution={160}
          smooth={false}
          frames={1}
        />}
        <PostEffects gfx={gfx} pixelRatio={renderDpr} aoActive={aoActive} externalPipeline={gpuMode} />
      </Canvas>
      </ViewportErrorBoundary>

      {gfx.showFps && <FpsBadge />}
      {/* Floating simulation player (top centre) */}
      <div className="sim-player-wrap pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <SimPlayer running={running} onToggleRun={onToggleRun} onReset={onResetSim} speed={simSpeed} onSpeed={onSimSpeed} onToggleFullscreen={toggleFullscreen} onToggleViewExtras={() => setPanelsOpen(!panelsOpen)} onToggleGrid={() => setGridVisible((v) => !v)} />
      </div>

      {/* Scene identity */}
      <div className={cn("scene-identity pointer-events-none absolute left-3 top-3 flex flex-col gap-2", "max-md:hidden")}>
        <div className="flex items-center gap-2 rounded border border-white/10 bg-[#2a2a2c]/88 px-2.5 py-1.5 shadow-lg backdrop-blur">
          <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-[var(--app-accent)]/25 text-[var(--app-accent-bright)]">
            <BoxIcon size={12} />
          </span>
          <div className="leading-none">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">{t("Layout")}</div>
            <div className="mt-1 text-[11px] font-medium text-[#f0f0f0]">{t(layoutName)}</div>
          </div>
        </div>
        <KpiChips running={running} items={items.length} />
      </div>

      {hudVisible && selected && !mobile && (
        <div className="absolute left-3 top-[122px] z-10 max-w-[calc(100%-24px)]">
          <SelectionHud item={selected} onDuplicate={() => onDuplicateItem(selected.id)} onDelete={() => onDeleteItem(selected.id)} />
        </div>
      )}

      {hudVisible && selected && mobile && <div className="absolute left-3 top-[63px] z-10 max-w-[calc(100%-24px)]"><SelectionHud item={selected} onDuplicate={() => onDuplicateItem(selected.id)} onDelete={() => onDeleteItem(selected.id)} /></div>}

      {signalMode && <div className="absolute bottom-16 left-3 z-20 max-w-[280px] rounded border border-white/20 bg-[#20272c]/95 p-2 text-[11px] text-white shadow-lg" role="status">
        <p>{sourceItem ? `${t("Choose an IN port for")}: ${sourceItem.name}` : t("Choose an OUT port on a sensor, button, laser, PLC or robot.")}</p>
        {sourceItem && <label className="mt-2 flex items-center gap-2 text-white/70">{t("Wire colour")}
          <input type="color" aria-label={t("Wire colour")} value={signalWireColor(sourceItem.props.wireColor)} onChange={(event) => onUpdateItem(sourceItem.id, {props: {...sourceItem.props, wireColor: event.target.value}})} className="h-7 w-10 cursor-pointer rounded border border-white/20 bg-transparent" />
        </label>}
        {sourceItem && signalTargets(sourceItem).length > 0 && <div className="mt-2 space-y-1">
          {signalTargets(sourceItem).map((id) => <div key={id} className="flex items-center justify-between gap-2 text-white/70"><span className="truncate">→ {items.find((item) => item.id === id)?.name ?? id}</span><button type="button" aria-label={`${t("Remove connection")}: ${items.find((item) => item.id === id)?.name ?? id}`} onClick={() => onUpdateItem(sourceItem.id, signalTargetsPatch(sourceItem, signalTargets(sourceItem).filter((target) => target !== id)))} className="rounded px-1.5 text-white/60 hover:bg-white/10">×</button></div>)}
        </div>}
        {sourceItem && <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setSignalSource(null)} className="rounded border border-white/20 px-2 py-1">{t("Cancel")}</button>
          {signalTargets(sourceItem).length > 0 && <button type="button" onClick={() => { onUpdateItem(sourceItem.id, signalTargetsPatch(sourceItem, [])); setSignalSource(null); }} className="rounded border border-white/20 px-2 py-1">{t("Disconnect signal")}</button>}
        </div>}
        <p className="mt-1 text-white/50">{t("Drag OUT to IN. Drag a connected IN away to disconnect or reroute; for a shared IN, select its source first. You can also click ports. Material flow is separate.")}</p>
      </div>}

      {/* View controls */}
      <div className="view-controls absolute right-3 top-3 flex max-w-[calc(100%-24px)] items-center gap-1.5">
        <button type="button" aria-label={t("Edit signal connections")} aria-pressed={signalMode} title={t("Edit signal connections")} onClick={() => { setSignalMode(value => !value); setSignalSource(null); }} className={cn("rounded border border-white/10 bg-[#2a2a2c]/90 p-1.5 shadow-lg", signalMode ? "text-[#f4c260]" : "text-white/60")}><Cable size={14} /></button>
        <div className="flex items-center rounded border border-white/10 bg-[#2a2a2c]/90 p-0.5 shadow-lg backdrop-blur">
          {viewButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => pickView(button.id)}
              className={cn(
                "rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition",
                view === button.id && fitNonce === 0 ? "bg-[var(--app-accent)] font-semibold text-white" : "text-white/55 hover:bg-white/10 hover:text-white",
              )}
            >
              {t(button.label)}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => setFitNonce((value) => value + 1)}
            className="flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white/55 transition hover:bg-white/10 hover:text-white"
            title={t("Focus selection")}
          >
            <Focus size={11} /> {t("Fit")} </button>
          <button type="button" onClick={() => pickView("iso")} className="rounded-sm p-1 text-white/55 transition hover:bg-white/10 hover:text-white" title={t("Reset view")}>
            <RotateCw size={11} />
          </button>
          {mobile && <button type="button" aria-label={t("View options")} aria-expanded={viewMenu} onClick={() => setViewMenu((v) => !v)} className="rounded-sm p-1 text-white/70 hover:bg-white/10"><Settings2 size={15} /></button>}
        </div>
        <div className={cn("extra-view-controls flex items-center rounded border border-white/10 bg-[#2a2a2c]/90 p-0.5 shadow-lg backdrop-blur", mobile && "hidden")}>
          <button
            type="button"
            onClick={() => setGridVisible((v) => !v)}
            className={cn("rounded-sm p-1.5 transition", gridVisible ? "bg-white/10 text-[var(--app-accent-bright)]" : "text-white/40 hover:text-white/80")}
            title={t("Toggle floor grid")}
          >
            <Grid3X3 size={12} />
          </button>
          <button
            type="button"
            onClick={() => setShell((v) => !v)}
            className={cn("rounded-sm p-1.5 transition", shell ? "bg-white/10 text-[var(--app-accent-bright)]" : "text-white/40 hover:text-white/80")}
            title={t("Toggle factory building")}
          >
            <Building2 size={12} />
          </button>
          <button
            type="button"
            onClick={() => setHudVisible((v) => !v)}
            className={cn("rounded-sm p-1.5 transition", hudVisible ? "bg-white/10 text-[var(--app-accent-bright)]" : "text-white/40 hover:text-white/80")}
            title={t("Toggle selection panel")}
          >
            <Eye size={12} />
          </button>
          <button type="button" onClick={toggleFullscreen} className="rounded-sm p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/90" title={t("Fullscreen")}>
            <Maximize2 size={12} />
          </button>
          <button type="button" aria-label={t("Collapse panels")} onClick={() => setPanelsOpen(!panelsOpen)} className="rounded-sm p-1.5 text-white/40 hover:bg-white/10 hover:text-white/90"><Layers3 size={12} /></button>
        </div>
      </div>

      {mobile && viewMenu && <div className="absolute right-3 top-[62px] z-30 flex w-[205px] flex-col rounded border border-white/15 bg-[#29292c]/95 p-1 text-[12px] text-white/80 shadow-xl">
        <button type="button" onClick={() => setGridVisible((v) => !v)} className="flex min-h-10 items-center justify-between rounded px-3 hover:bg-white/10">{t("Floor grid")}<span className="text-[var(--app-accent-bright)]">{t(gridVisible ? "On" : "off")}</span></button>
        <button type="button" onClick={() => setShell((v) => !v)} className="flex min-h-10 items-center justify-between rounded px-3 hover:bg-white/10">{t("Factory building")}<span className="text-[var(--app-accent-bright)]">{t(shell ? "On" : "off")}</span></button>
        <button type="button" onClick={() => setHudVisible((v) => !v)} className="flex min-h-10 items-center justify-between rounded px-3 hover:bg-white/10">{t("Selection panel")}<span className="text-[var(--app-accent-bright)]">{t(hudVisible ? "On" : "off")}</span></button>
        <button type="button" onClick={() => { pickView("left"); setViewMenu(false); }} className="min-h-10 rounded px-3 text-left hover:bg-white/10">{t("Left view")}</button>
        <button type="button" onClick={() => { pickView("back"); setViewMenu(false); }} className="min-h-10 rounded px-3 text-left hover:bg-white/10">{t("Back view")}</button>
        <button type="button" onClick={() => { toggleFullscreen(); setViewMenu(false); }} className="min-h-10 rounded px-3 text-left hover:bg-white/10">{t("Fullscreen")}</button>
      </div>}

      <div className={cn("absolute bottom-3 left-3 hidden md:block", mobile && "!hidden")}>
        <ViewCube view={view} onPick={pickView} />
      </div>
      <div className={cn("absolute bottom-3 right-3 hidden md:block", mobile && "!hidden")}>
        <FloorMap items={items} selectedId={selectedId} onSelect={onSelect} onExpand={onShowFloorMap} />
      </div>
      <div className={cn("viewport-hint pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#2a2a2c]/85 px-3 py-1 shadow-lg backdrop-blur lg:flex", mobile && "!hidden")}>
        <span className="whitespace-nowrap font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/55">
          {t(tool === "select" ? "Click to select · drag to orbit · scroll to zoom" : tool === "move" ? "Drag a component to move it" : "Drag around a component to rotate it")}
          {t(selected && (selected.kind === "conveyor" || selected.kind === "roller") ? " · drag the white handles to bend the spline" : "")}
        </span>
      </div>

      {mobile && <div className="pointer-events-none absolute inset-x-0 bottom-[84px] text-center text-[10px] text-[#5c6974]">{t(selected ? "Tap a component, then choose Move to reposition it." : "One finger to orbit. Pinch to zoom.")}</div>}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-[var(--app-accent)]/70 bg-[var(--app-accent)]/[0.06]">
          <div className="flex items-center gap-2 rounded border border-[var(--app-accent)]/50 bg-[#2a2a2c]/95 px-4 py-2.5 shadow-2xl">
            <Layers3 size={14} className="text-[var(--app-accent-bright)]" />
            <span className="text-[12px] font-medium text-white">{t("Release to place component or import files")}</span>
          </div>
        </div>
      )}
    </div>
  );
});

function KpiChips({ running, items }: { running: boolean; items: number }) {
  const snap = useSimSnapshot(500);
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded border border-white/10 bg-[#2a2a2c]/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/60">{items} {t("components")}</span>
      <span className="rounded border border-[#6DBE45]/30 bg-[#2a2a2c]/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#9bdc78]">
        {snap.placed} {t("stacked")} </span>
      {snap.lost > 0 && (
        <span className="rounded border border-[#e5703f]/40 bg-[#2a2a2c]/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#ff9d6e]">{snap.lost} {t("dropped")}</span>
      )}
      {running && (
        <span className="flex items-center gap-1 rounded border border-[var(--teal)]/35 bg-[#2a2a2c]/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#6fe0ec]">
          <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--teal)]" /> {t("Live")} </span>
      )}
    </div>
  );
}
