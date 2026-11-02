import { upperFloorDimensions } from "../utils/upperFloor";
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ComponentKind, GripperKind, SceneItem } from "../types";
import { sim, ROBOT_SPECS } from "../sim/engine";
import { useSimulationDelta } from "../sim/animationClock";
import { samplePath } from "../sim/spline";
import { palletSize } from "../data/products";
import { FenceModel } from "./FenceModel";
import { HumanModel } from "./HumanModel";
import { RobotTool } from "./RobotTool";
import { LogicModel, CollectorModel, IndustrialLight, PaintStationModel, CutterModel, AssemblyModel, KilnModel, MobileRobotModel } from "./AutomationModels";
import {
  B,
  BELT_WIDTH,
  buildConveyorGeometry,
  buildStatic,
  beltTexture,
  C,
  getMaterial,
  P,
  type Part,
} from "./ModelKit";

export const MODEL_HEIGHTS: Partial<Record<ComponentKind, number>> = {
  platform: 2.5, stairs: 2.5,
  robot: 2.6,
  cobot: 2.2,
  conveyor: 1.0,
  roller: 1.0,
  cnc: 2.7,
  feeder: 2.1,
  press: 3.35,
  weld: 2.9,
  packaging: 2.55,
  amr: 1.65,
  forklift: 2.7,
  rack: 3.35,
  crates: 0.3,
  fence: 2.2,
  cabinet: 2.1,
  wall: 4,
  operator: 1.85, kuka: 2.9, fanuc: 2.7, "mobile-robot": 2.2, collector: 0.8,
  button: 1.2, laser: 1.5, sensor: 1.3, plc: 1.7, light: 3.2,
  paint: 2.8, cutter: 2.4, inspection: 2.4, assembly: 2.2, kiln: 3.0, lathe: 2.5, grinder: 2.3, "light-panel": 4.5, "light-flood": 5.0,
};

function Static({ id, accent, make }: { id: string; accent: string; make: () => Part[] }) {
  const object = useMemo(() => buildStatic(id, accent, make), [id, accent, make]);
  return <primitive object={object} />;
}

/* ------------------------------------------------------------------ */
/*  Robot (inverse-kinematics driven)                                  */
/* ------------------------------------------------------------------ */

function RobotModel({ item, cobot }: { item: SceneItem; cobot: boolean }) {
  const spec = ROBOT_SPECS[cobot ? "cobot" : "robot"];
  const accent = item.color || (item.kind === "kuka" ? "#F07B30" : item.kind === "fanuc" ? "#F2C230" : "#6DBE45");
  const waist = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  const link: "acc" | "white" = cobot ? "white" : "acc";

  const base = useMemo(
    () => () =>
      [
        C(spec.base, spec.base + 0.08, 0.16, 0, 0.08, 0, "dark"),
        C(spec.base * 0.82, spec.base * 0.9, 0.18, 0, 0.25, 0, "mid"),
        B(0.5, 0.05, 0.5, 0.0, 0.035, spec.base + 0.45, "yellow"),
      ],
    [spec.base],
  );
  const waistParts = useMemo(
    () => () =>
      [
        C(spec.base * 0.66, spec.base * 0.74, spec.shoulder - 0.34, 0, 0.34 + (spec.shoulder - 0.34) / 2, 0, link),
        B(0.42, 0.46, 0.5, -0.05, spec.shoulder, 0, link),
        C(0.27, 0.27, 0.56, 0, spec.shoulder, 0, "dark", [Math.PI / 2, 0, 0]),
        B(0.1, 0.1, 0.1, -spec.base * 0.7, 0.55, 0, "accE"),
      ],
    [spec, link],
  );
  const upperParts = useMemo(
    () => () =>
      [
        B(spec.L1 - 0.2, 0.3, 0.32, spec.L1 / 2, 0.02, 0, link),
        B(spec.L1 - 0.5, 0.06, 0.38, spec.L1 / 2, 0.0, 0, "dark"),
        C(0.2, 0.2, 0.46, spec.L1, 0, 0, "dark", [Math.PI / 2, 0, 0]),
      ],
    [spec, link],
  );
  const foreParts = useMemo(
    () => () =>
      [
        B(spec.L2 - 0.18, 0.22, 0.26, spec.L2 / 2, 0, 0, link),
        B(spec.L2 - 0.5, 0.05, 0.31, spec.L2 / 2, 0.0, 0, "dark"),
        C(0.15, 0.15, 0.36, spec.L2, 0, 0, "dark", [Math.PI / 2, 0, 0]),
      ],
    [spec, link],
  );
  const toolParts = useMemo(
    () => () =>
      [
        C(0.12, 0.12, 0.12, 0.06, 0, 0, "steel", [0, 0, Math.PI / 2]),
        B(0.16, 0.16, 0.22, 0.2, 0, 0, "dark"),
        C(0.025, 0.025, spec.Lw - 0.36, 0.26 + (spec.Lw - 0.36) / 2 - 0.0, 0, 0, "steel", [0, 0, Math.PI / 2]),
        C(0.12, 0.12, 0.03, spec.Lw - 0.17, 0, 0, "black", [0, 0, Math.PI / 2]),
      ],
    [spec],
  );

  useFrame(() => {
    const rt = sim.robots.get(item.id);
    const j = rt?.joints;
    if (!j) return;
    if (waist.current) waist.current.rotation.y = j.waist;
    if (shoulder.current) shoulder.current.rotation.z = j.shoulder;
    if (elbow.current) elbow.current.rotation.z = j.elbow;
    if (wrist.current) wrist.current.rotation.z = j.wrist;
  });

  const home = useMemo(() => {
    const L = spec.L1 + spec.L2;
    const r = L * 0.52;
    const y = spec.shoulder + 0.5 + spec.Lw - spec.shoulder;
    const d = Math.hypot(r, y);
    const phi = Math.atan2(y, r);
    const a = Math.acos(Math.max(-1, Math.min(1, (spec.L1 * spec.L1 + d * d - spec.L2 * spec.L2) / (2 * spec.L1 * d))));
    const th1 = phi + a;
    const ex = spec.L1 * Math.cos(th1);
    const ey = spec.L1 * Math.sin(th1);
    const th2 = Math.atan2(y - ey, r - ex);
    return { th1, elbow: th2 - th1, wrist: -Math.PI / 2 - th2 };
  }, [spec]);

  return (
    <group>
      <Static id={`robot-base-${cobot}`} accent={accent} make={base} />
      <group ref={waist} userData={{ robotJoint: "waist", itemId: item.id }}>
        <Static id={`robot-waist-${cobot}`} accent={accent} make={waistParts} />
        <group ref={shoulder} userData={{ robotJoint: "shoulder", itemId: item.id }} position={[0, spec.shoulder, 0]} rotation={[0, 0, home.th1]}>
          <Static id={`robot-upper-${cobot}`} accent={accent} make={upperParts} />
          <group ref={elbow} position={[spec.L1, 0, 0]} rotation={[0, 0, home.elbow]}>
            <Static id={`robot-fore-${cobot}`} accent={accent} make={foreParts} />
            <group ref={wrist} position={[spec.L2, 0, 0]} rotation={[0, 0, home.wrist]}>
              <Static id={`robot-tool-${cobot}`} accent={accent} make={toolParts} />
              <RobotTool id={item.id} kind={(item.props.gripper as GripperKind) || "vacuum"} length={spec.Lw} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Spline conveyor                                                    */
/* ------------------------------------------------------------------ */

function ConveyorModel({ item, roller }: { item: SceneItem; roller: boolean }) {
  const stopper = item.props.stopper === true;
  const pointsKey = JSON.stringify([item.points, item.pointHeights]);
  const geos = useMemo(() => {
    const pts = item.points && item.points.length >= 2 ? item.points : ([[-2, 0], [2, 0]] as [number, number][]);
    const path = samplePath(pts, 0.1, item.pointHeights);
    let entries: { along: number; side: number; radius: number }[] = [];
    if (typeof item.props.mergeEntries === "string") {
      try {
        const raw: unknown = JSON.parse(item.props.mergeEntries);
        if (Array.isArray(raw)) entries = raw.flatMap((entry) =>
          typeof entry?.along === "number" && (entry.side === 1 || entry.side === -1)
            ? [{ along: entry.along, side: entry.side, radius: 0.58 }] : []);
      } catch { /* old/invalid metadata leaves the ordinary rails intact */ }
    }
    if (typeof item.props.mergeTargetId === "string" && item.props.mergeSide !== 0) {
      entries.push({ along: path.length, side: 0, radius: 0.65 });
    }
    return buildConveyorGeometry(path, stopper, entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, stopper, item.props.mergeEntries, item.props.mergeTargetId, item.props.mergeSide]);
  const texture = useMemo(() => {
    const tex = beltTexture(roller ? "roller" : "belt").clone();
    tex.needsUpdate = true;
    return tex;
  }, [roller]);
  const accent = item.color || "#4DA3E8";
  const simulationDelta = useSimulationDelta();

  useEffect(
    () => () => {
      geos.belt.dispose();
      geos.steel?.dispose();
      geos.dark?.dispose();
      geos.warn?.dispose();
    },
    [geos],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const delta = simulationDelta();
    const rt = sim.conveyors.get(item.id);
    if (!rt || !rt.active) return;
    texture.offset.x -= (rt.speed * delta) / 0.5;
    if (texture.offset.x < -1000) texture.offset.x = 0;
  });

  return (
    <group>
      <mesh geometry={geos.belt} userData={{ conveyorBelt: true, itemId: item.id }} receiveShadow castShadow>
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />
      </mesh>
      {geos.steel && <mesh geometry={geos.steel} material={getMaterial("steel")} castShadow receiveShadow />}
      {geos.dark && <mesh geometry={geos.dark} material={getMaterial("dark")} castShadow receiveShadow />}
      {geos.warn && <mesh geometry={geos.warn} material={getMaterial("yellow")} castShadow />}
      <mesh position={[item.points?.[0]?.[0] ?? 0, BELT_WIDTH * 0 + 0.012, item.points?.[0]?.[1] ?? 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.2, 20]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Machines with simple animation                                     */
/* ------------------------------------------------------------------ */

const cncParts = (): Part[] => [
  B(2.4, 0.18, 1.9, 0, 0.09, 0, "dark"),
  B(2.25, 2.2, 1.78, 0, 1.28, -0.02, "white"),
  B(2.3, 0.12, 1.82, 0, 2.38, 0, "light"),
  B(1.34, 1.08, 0.06, -0.32, 1.4, 0.89, "black"),
  B(0.46, 0.76, 0.16, 0.86, 1.4, 0.9, "dark"),
  P(0.32, 0.22, 0.86, 1.52, 0.985, "screen"),
  B(0.26, 0.12, 0.2, 0.05, 2.46, 0.6, "dark"),
  C(0.075, 0.075, 0.14, 0.05, 2.57, 0.6, "accE"),
  B(0.08, 0.06, 0.5, -0.3, 0.9, 1.15, "steel"),
  B(0.08, 0.06, 0.5, 0.3, 0.9, 1.15, "steel"),
  B(0.8, 0.05, 0.64, 0, 0.925, 1.45, "steel"),
  B(0.8, 0.03, 0.03, 0, 0.96, 1.77, "yellow"),
  B(0.8, 0.03, 0.03, 0, 0.96, 1.13, "yellow"),
  B(0.7, 0.06, 0.02, 0.7, 0.5, 0.91, "acc"),
  B(0.26, 0.1, 0.34, -0.8, 0.05, 0.7, "black"),
  B(0.26, 0.1, 0.34, 0.8, 0.05, 0.7, "black"),
];

function CncModel({ item }: { item: SceneItem }) {
  const door = useRef<THREE.Mesh>(null);
  const accent = item.color || "#E8A245";
  const simulationDelta = useSimulationDelta();
  useFrame(() => {
    const delta = simulationDelta();
    const rt = sim.machines.get(item.id);
    if (!door.current) return;
    const target = rt?.busy ? -0.32 : 0.62;
    door.current.position.x += (target - door.current.position.x) * Math.min(1, delta * 6);
  });
  return (
    <group>
      <Static id="cnc" accent={accent} make={cncParts} />
      <mesh ref={door} position={[0.62, 1.4, 0.94]} material={getMaterial("glass")}>
        <boxGeometry args={[1.18, 0.92, 0.03]} />
      </mesh>
    </group>
  );
}

const pressParts = (): Part[] => [
  B(2.1, 0.4, 1.75, 0, 0.2, 0, "dark"),
  B(1.75, 0.16, 1.35, 0, 0.47, 0, "mid"),
  B(0.36, 2.65, 1.3, -0.8, 1.55, -0.1, "light"),
  B(0.36, 2.65, 1.3, 0.8, 1.55, -0.1, "light"),
  B(2.35, 0.62, 1.5, 0, 3.0, -0.1, "steel"),
  B(2.45, 0.1, 1.6, 0, 3.33, -0.1, "acc"),
  B(0.5, 0.4, 0.12, 0, 2.2, 0.66, "dark"),
  P(0.34, 0.24, 0, 2.2, 0.725, "screen"),
];

function PressModel({ item }: { item: SceneItem }) {
  const ram = useRef<THREE.Group>(null);
  const accent = item.color || "#E58A62";
  useFrame(() => {
    if (ram.current) ram.current.position.y = 1.72 + (sim.machines.get(item.id)?.busy ? Math.sin(sim.time * 2.1) * 0.22 : 0.2);
  });
  const ramParts = useMemo(() => () => [C(0.2, 0.2, 0.9, 0, 0.45, 0, "steel"), B(1.3, 0.34, 1.1, 0, 0, 0, "dark"), B(1.16, 0.1, 0.96, 0, -0.22, 0, "black")], []);
  return (
    <group>
      <Static id="press" accent={accent} make={pressParts} /><LoadingTray />
      <group ref={ram} position={[0, 1.72, 0]}>
        <Static id="press-ram" accent={accent} make={ramParts} />
      </group>
    </group>
  );
}

const weldParts = (): Part[] => [
  B(2.9, 0.16, 2.3, 0, 0.08, 0, "dark"),
  B(2.9, 2.9, 0.1, 0, 1.4, -1.05, "mid"),
  B(0.1, 2.9, 2.2, -1.4, 1.4, 0, "mid"),
  B(2.9, 0.12, 2.3, 0, 2.76, 0, "steel"),
  B(0.62, 2.2, 0.02, -0.7, 1.4, 0.9, "glass"),
  B(0.36, 2.2, 0.02, 1.15, 1.4, 0.9, "glass"),
  B(1.1, 0.1, 0.1, 0.12, 2.12, 0.9, "acc"),
  B(0.9, 0.08, 0.7, 0.76, 1.0, 0.4, "steel"),
  B(0.5, 0.36, 0.5, 0.9, 1.19, 0.4, "light"),
  B(0.5, 1.9, 0.45, 1.2, 1.1, -0.6, "dark"),
  C(0.12, 0.12, 0.14, 1.2, 2.12, -0.6, "accE"),
];

function WeldModel({ item }: { item: SceneItem }) {
  const arm = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Mesh>(null);
  const accent = item.color || "#E8C24D";
  const armParts = useMemo(
    () => () => [C(0.25, 0.3, 0.3, 0, 0.15, 0, "dark"), B(0.22, 1.1, 0.22, 0, 0.8, 0, "acc"), B(0.9, 0.18, 0.18, 0.35, 1.35, 0, "light"), B(0.1, 0.4, 0.1, 0.8, 1.2, 0, "dark")],
    [],
  );
  useFrame(() => {
    if (!sim.running || !sim.machines.get(item.id)?.busy) { if (spark.current) spark.current.visible = false; return; }
    if (spark.current) spark.current.visible = true;
    const t = sim.time;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 0.9) * 0.5;
    if (spark.current) spark.current.scale.setScalar(0.5 + Math.max(0, Math.sin(t * 38)) * 0.9);
  });
  return (
    <group>
      <Static id="weld" accent={accent} make={weldParts} /><LoadingTray />
      <group ref={arm} position={[-0.2, 0.1, 0.1]}>
        <Static id="weld-arm" accent={accent} make={armParts} />
      </group>
      <mesh ref={spark} position={[0.6, 1.28, 0.4]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#fff1b0" toneMapped={false} />
      </mesh>
    </group>
  );
}

const packerParts = (): Part[] => [
  B(3.2, 0.26, 2.0, 0, 0.13, 0, "dark"),
  B(2.8, 1.9, 1.7, 0, 1.1, -0.2, "white"),
  B(1.15, 0.85, 0.08, 0, 1.28, 0.66, "black"),
  P(1.0, 0.7, 0, 1.28, 0.71, "screen"),
  B(2.5, 0.35, 0.9, 0, 0.55, 0.85, "mid"),
  B(0.6, 0.5, 0.6, -0.85, 0.43, 1.04, "card"),
  B(0.38, 0.3, 0.38, 1.1, 2.25, 0.2, "dark"),
  C(0.08, 0.08, 0.12, 1.1, 2.43, 0.2, "accE"),
  C(0.11, 0.11, 0.85, 0.4, 0.42, 1.02, "cardL", [Math.PI / 2, 0, 0]),
  C(0.11, 0.11, 0.85, -0.28, 0.42, 1.02, "cardL", [Math.PI / 2, 0, 0]),
];

function PackerModel({ item }: { item: SceneItem }) {
  const flap = useRef<THREE.Group>(null);
  const accent = item.color || "#C98BD0";
  const flapParts = useMemo(() => () => [B(1.1, 0.06, 1.1, 0.55, 0, 0, "steel")], []);
  useFrame(() => {
    if (sim.running && flap.current) flap.current.rotation.z = -0.1 + Math.max(0, Math.sin(sim.time * 1.7)) * 0.7;
  });
  return (
    <group>
      <Static id="packer" accent={accent} make={packerParts} /><LoadingTray />
      <group ref={flap} userData={{ animatedMechanism: "packer-flap", itemId: item.id }} position={[-1.3, 2.15, -0.2]}>
        <Static id="packer-flap" accent={accent} make={flapParts} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Static equipment                                                   */
/* ------------------------------------------------------------------ */

const amrParts = (): Part[] => [
  B(1.65, 0.3, 1.12, 0, 0.3, 0, "white"),
  B(1.5, 0.08, 1.0, 0, 0.47, 0, "acc"),
  B(0.07, 0.05, 0.6, 0.83, 0.43, 0, "accE"),
  B(1.05, 0.5, 0.82, 0, 0.76, 0, "card"),
  B(1.07, 0.03, 0.84, 0, 1.01, 0, "cardL"),
  C(0.19, 0.19, 0.15, 0.52, 0.2, 0.52, "rubber", [Math.PI / 2, 0, 0]),
  C(0.19, 0.19, 0.15, -0.52, 0.2, 0.52, "rubber", [Math.PI / 2, 0, 0]),
  C(0.19, 0.19, 0.15, 0.52, 0.2, -0.52, "rubber", [Math.PI / 2, 0, 0]),
  C(0.19, 0.19, 0.15, -0.52, 0.2, -0.52, "rubber", [Math.PI / 2, 0, 0]),
  C(0.14, 0.16, 0.08, 0, 0.66, -0.42, "steel", [Math.PI / 2, 0, 0]),
];

function AmrModel({ item }: { item: SceneItem }) {
  const ref = useRef<THREE.Group>(null);
  const accent = item.color || "#35B5C4";
  useFrame(() => {
    if (sim.running && ref.current) ref.current.position.x = Math.sin(sim.time * 0.5) * 2.4;
  });
  return (
    <group ref={ref} userData={{ animatedMechanism: "amr", itemId: item.id }}>
      <Static id="amr" accent={accent} make={amrParts} />
    </group>
  );
}

const forkliftParts = (): Part[] => [
  B(1.5, 0.72, 1.95, 0, 0.42, 0, "acc"),
  B(1.25, 0.92, 1.0, -0.1, 0.88, -0.55, "dark"),
  B(1.1, 0.5, 0.05, -0.1, 1.25, -0.55, "glass"),
  B(0.07, 1.45, 0.07, -0.55, 1.35, -0.05, "black"),
  B(0.07, 1.45, 0.07, 0.55, 1.35, -0.05, "black"),
  B(1.25, 0.08, 0.07, 0, 2.06, -0.05, "black"),
  B(0.08, 1.5, 0.08, 0.75, 0.72, 0.65, "steel"),
  B(0.12, 0.06, 0.62, 0.75, 1.05, 0.92, "light"),
  B(0.12, 0.06, 0.56, 0.75, 0.96, 1.2, "light"),
  C(0.27, 0.27, 0.22, 0.55, 0.27, -0.55, "rubber", [0, 0, Math.PI / 2]),
  C(0.27, 0.27, 0.22, 0.55, 0.27, 0.55, "rubber", [0, 0, Math.PI / 2]),
  C(0.27, 0.27, 0.22, -0.55, 0.27, -0.55, "rubber", [0, 0, Math.PI / 2]),
  C(0.27, 0.27, 0.22, -0.55, 0.27, 0.55, "rubber", [0, 0, Math.PI / 2]),
];

const rackParts = (): Part[] => {
  const parts: Part[] = [];
  for (const x of [-1.42, 1.42]) for (const z of [-0.55, 0.55]) parts.push(B(0.1, 3.36, 0.1, x, 1.68, z, "blue"));
  for (const y of [0.26, 1.16, 2.06, 2.96]) {
    for (const z of [-0.55, 0.55]) parts.push(B(2.94, 0.11, 0.11, 0, y, z, "orange"));
    parts.push(B(2.8, 0.04, 1.0, 0, y + 0.03, 0, "steel"));
  }
  [0.26, 1.16, 2.06].forEach((y, level) => {
    [-0.72, 0.72].forEach((x, bay) => {
      if (level === 1 && bay === 1) return;
      parts.push(B(1.0, 0.82, 0.94, x + 0.16, y + 0.47, 0, level === 2 ? "cardL" : "card"));
      parts.push(B(1.02, 0.03, 0.96, x + 0.16, y + 0.89, 0, "cardL"));
    });
  });
  return parts;
};

const palletParts = (): Part[] => {
  const parts: Part[] = [];
  for (const z of [-0.34, 0, 0.34]) {
    parts.push(B(1.2, 0.08, 0.1, 0, 0.04, z, "woodD"));
    for (const x of [-0.5, 0, 0.5]) parts.push(B(0.14, 0.05, 0.1, x, 0.105, z, "woodD"));
  }
  for (let i = 0; i < 7; i += 1) parts.push(B(0.13, 0.025, 0.8, -0.54 + i * 0.18, 0.1375, 0, "wood"));
  return parts;
};

const cabinetParts = (): Part[] => [
  B(1.15, 2.0, 0.62, 0, 1.02, 0, "light"),
  B(0.96, 1.62, 0.03, 0, 1.12, 0.325, "mid"),
  B(0.72, 0.42, 0.02, 0.02, 1.55, 0.35, "black"),
  P(0.6, 0.3, 0.02, 1.55, 0.365, "screen"),
  B(0.48, 0.22, 0.02, 0.1, 0.95, 0.35, "dark"),
  C(0.04, 0.04, 0.14, 0.42, 1.1, 0.36, "red", [Math.PI / 2, 0, 0]),
  B(1.2, 0.08, 0.66, 0, 2.06, 0, "steel"),
  C(0.07, 0.07, 0.14, 0.3, 2.17, 0.1, "accE"),
];

const wallParts = (): Part[] => {
  const parts: Part[] = [B(5.94, 1.1, 0.16, 0, 0.55, 0, "mid"), B(5.8, 2.7, 0.06, 0, 2.5, 0, "glass")];
  for (const x of [-2.9, -0.98, 0.98, 2.9]) parts.push(B(0.1, 3.75, 0.18, x, 2.42, 0, "steel"));
  for (const y of [1.15, 2.2, 3.3, 4.28]) parts.push(B(5.9, 0.08, 0.14, y > 4 ? 0 : 0, y, 0, "light"));
  return parts;
};

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                         */
/* ------------------------------------------------------------------ */

function FeederModel({ item }: { item: SceneItem }) {
  const accent = item.color || "#E0A030";
  const parts = useMemo(
    () => () => [
      B(0.08, 1.8, 0.08, -0.45, 0.9, -0.45, "dark"),
      B(0.08, 1.8, 0.08, 0.45, 0.9, -0.45, "dark"),
      B(0.08, 1.8, 0.08, -0.45, 0.9, 0.45, "dark"),
      B(0.08, 1.8, 0.08, 0.45, 0.9, 0.45, "dark"),
      B(0.95, 0.1, 1.05, 0, 1.85, 0, "steel"),
      B(0.85, 0.6, 0.9, 0, 2.2, 0, "acc"),
      B(0.5, 0.3, 0.05, 0, 2.1, 0.48, "acc"),
      C(0.28, 0.3, 0.24, 0, 2.1, 0.62, "steel", [Math.PI / 2, 0, 0], 4),
      C(0.3, 0.3, 0.05, 0, 2.1, 0.76, "steel", [0, 0, Math.PI / 2], 14),
      C(0.2, 0.2, 0.05, 0, 2.1, 0.76, "steel", [0, 0, Math.PI / 2], 12),
      B(0.4, 0.24, 0.05, 0, 1.95, 0.48, "acc"),
    ],
    [],
  );
  const body = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const simulationDelta = useSimulationDelta();
  useFrame(() => {
    const delta = simulationDelta();
    if (body.current) body.current.rotation.y += delta * 0.25;
    if (spin.current) spin.current.rotation.z += delta * 1.2;
  });
  return (
    <group>
      <Static id="feeder-base" accent={accent} make={parts} />
      <group ref={body} userData={{ animatedMechanism: "feeder", itemId: item.id }} position={[0, 1.62, 0.62]}>
        <CylinderSpin ref={spin} />
      </group>
    </group>
  );
}

function CylinderSpin({ ref: r }: { ref: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={r} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.2, 4]} />
      <meshStandardMaterial color="#b08d5f" roughness={0.85} />
    </mesh>
  );
}

/** Parametric mezzanine pieces. Their deck/treads use the same dimensions as
 * the simulator's support surfaces and rigid-body collision shapes. */
function ElevatedPlatform({ item }: { item: SceneItem }) {
  const {width, depth, height} = upperFloorDimensions(item);
  return <group>
    <mesh position={[0, height - 0.1, 0]} material={getMaterial("mid")} castShadow receiveShadow><boxGeometry args={[width, 0.2, depth]} /></mesh>
    <mesh position={[0, height + 0.008, 0]} material={getMaterial("steel")} receiveShadow><boxGeometry args={[width - 0.04, 0.016, depth - 0.04]} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} position={[x * (width / 2 - 0.12), (height - 0.2) / 2, z * (depth / 2 - 0.12)]} material={getMaterial("dark")} castShadow><boxGeometry args={[0.18, Math.max(0.05, height - 0.2), 0.18]} /></mesh>))}
  </group>;
}

function IndustrialStairs({ item }: { item: SceneItem }) {
  const {width, length, height, steps} = upperFloorDimensions(item);
  const run = length / steps, rise = height / steps;
  return <group>
    {Array.from({length: steps}, (_, i) => <mesh key={i} position={[-length / 2 + (i + 0.5) * run, (i + 1) * rise / 2, 0]} material={getMaterial("steel")} castShadow receiveShadow><boxGeometry args={[run + 0.005, (i + 1) * rise, width]} /></mesh>)}
    {[-1, 1].map((side) => <mesh key={side} position={[0, height / 2 + 0.9, side * (width / 2 + 0.035)]} rotation={[0, 0, Math.atan2(height, length)]} material={getMaterial("yellow")}><boxGeometry args={[Math.hypot(length, height), 0.05, 0.05]} /></mesh>)}
  </group>;
}

function FactoryModelBase({ item, productItems = [] }: { item: SceneItem; productItems?: readonly SceneItem[] }) {
  const accent = item.color || "#9aa7b4";
  switch (item.kind) {
    case "platform": return <ElevatedPlatform item={item} />;
    case "stairs": return <IndustrialStairs item={item} />;
    case "robot":
    case "kuka":
    case "fanuc":
      return <RobotModel item={item} cobot={false} />;
    case "cobot":
      return <RobotModel item={item} cobot />;
    case "mobile-robot":
      return <MobileRobotModel item={item} />;
    case "collector":
      return <CollectorModel item={item} />;
    case "button":
    case "laser":
    case "sensor":
    case "plc":
      return <LogicModel item={item} />;
    case "light":
      return <IndustrialLight item={item} />;
    case "paint":
      return <PaintStationModel />;
    case "cutter":
      return <CutterModel />;
    case "assembly":
      return <AssemblyModel />;
    case "inspection":
      return <InspectionStation />;
    case "kiln":
      return <KilnModel />;
    case "lathe":
    case "grinder":
      return <CncModel item={item} />;
    case "light-panel":
    case "light-flood":
      return <IndustrialLight item={item} />;
    case "conveyor":
      return <ConveyorModel item={item} roller={false} />;
    case "roller":
      return <ConveyorModel item={item} roller />;
    case "cnc":
      return <CncModel item={item} />;
    case "feeder":
      return <FeederModel item={item} />;
    case "press":
      return <PressModel item={item} />;
    case "weld":
      return <WeldModel item={item} />;
    case "packaging":
      return <PackerModel item={item} />;
    case "amr":
      return <AmrModel item={item} />;
    case "forklift":
      return <Static id="forklift" accent={accent} make={forkliftParts} />;
    case "rack":
      return <Static id="rack" accent={accent} make={rackParts} />;
    case "crates":
      return <group scale={[palletSize(item.props, productItems)[0] / 1.2, 1, palletSize(item.props, productItems)[1] / 0.8]}><Static id="pallet" accent={accent} make={palletParts} /></group>;
    case "fence":
      return <FenceModel item={item} />;
    case "cabinet":
      return <Static id="cabinet" accent={accent} make={cabinetParts} />;
    case "wall":
      return <Static id="wall" accent={accent} make={wallParts} />;
    case "operator":
      return <HumanModel item={item} />;
    default:
      return null;
  }
}

export const FactoryModel = memo(FactoryModelBase);

/** One-piece inspection cell with a camera and accessible robot loading tray. */
function InspectionStation() {
  const parts = useMemo(() => () => [
    B(1.7, 0.8, 1.45, 0, 0.4, 0, "light"),
    B(1.55, 0.12, 1.3, 0, 0.86, 0, "dark"),
    B(0.18, 1.45, 0.18, -0.62, 1.6, -0.45, "steel"),
    B(1.2, 0.15, 0.2, -0.05, 2.25, -0.45, "steel"),
    B(0.45, 0.3, 0.38, 0.35, 2.06, -0.45, "black"),
    C(0.1, 0.1, 0.1, 0.35, 1.88, -0.45, "blue"),
    B(0.5, 0.38, 0.12, -0.75, 1.55, 0.2, "dark"),
    B(0.39, 0.28, 0.025, -0.75, 1.55, 0.27, "screen"),
  ], []);
  return <group><Static id="inspection-station" accent="#58b9dd" make={parts}/><LoadingTray /></group>;
}

function LoadingTray() {
  return <group><mesh position={[0, 0.925, 1.45]} material={getMaterial("steel")} castShadow receiveShadow><boxGeometry args={[0.8, 0.05, 0.64]} /></mesh><mesh position={[0, 0.48, 1.45]} material={getMaterial("dark")} castShadow><boxGeometry args={[0.12, 0.9, 0.12]} /></mesh></group>;
}

/* ------------------------------------------------------------------ */
/*  Environment                                                        */
/* ------------------------------------------------------------------ */

export interface BuildingStyle { width: number; depth: number; height: number; walls: boolean; roof: boolean; lights: boolean; floorColor: string; wallColor: string; }

function BuildingShell({ style }: { style: BuildingStyle }) {
  const { width, depth, height } = style;
  const objects = useMemo(() => buildStatic(`building-${width}-${depth}-${height}-${style.walls}-${style.roof}-${style.lights}-${style.wallColor}`, style.wallColor, () => {
    const parts: Part[] = [];
    if (style.walls) {
      // Low masonry base, glazed upper walls and structural columns keep the factory visible.
      for (const side of [-1, 1]) {
        parts.push(B(width, 1.1, 0.2, 0, 0.55, side * depth / 2, "acc"));
        parts.push(B(0.2, 1.1, depth, side * width / 2, 0.55, 0, "acc"));
        parts.push(B(width - 0.4, height - 1.3, 0.035, 0, 1.1 + (height - 1.3) / 2, side * depth / 2, "glass"));
        parts.push(B(0.035, height - 1.3, depth - 0.4, side * width / 2, 1.1 + (height - 1.3) / 2, 0, "glass"));
      }
      for (let x = -width / 2 + 2; x < width / 2; x += 4) {
        parts.push(B(0.3, height, 0.28, x, height / 2, -depth / 2 + 0.1, "steel"));
        parts.push(B(0.3, height, 0.28, x, height / 2, depth / 2 - 0.1, "steel"));
      }
      for (let z = -depth / 2 + 2; z < depth / 2; z += 4) parts.push(B(0.3, height, 0.28, -width / 2 + 0.1, height / 2, z, "steel"));
      for (let x = -width / 2 + 1; x < width / 2 - 1; x += 2.6) {
        parts.push(B(2.1, 1.0, 0.03, x, height - 0.9, -depth / 2 - 0.13, "glass"));
      }
    }
    if (style.roof) {
      // Open industrial roof structure sits above the building envelope.
      const roof = height + 0.45;
      parts.push(B(width + 0.8, 0.1, 0.16, 0, roof, -depth / 2 - 0.35, "mid"));
      parts.push(B(width + 0.8, 0.1, 0.16, 0, roof, depth / 2 + 0.35, "mid"));
      parts.push(B(0.16, 0.1, depth + 0.8, -width / 2 - 0.35, roof, 0, "mid"));
      parts.push(B(0.16, 0.1, depth + 0.8, width / 2 + 0.35, roof, 0, "mid"));
      for (let x = -width / 2 + 2; x < width / 2; x += 5) parts.push(B(0.07, 0.12, depth + 0.7, x, roof, 0, "steel"));
      for (let z = -depth / 2 + 2; z < depth / 2; z += 5) parts.push(B(width + 0.7, 0.12, 0.07, 0, roof, z, "steel"));
    }
    if (style.lights) {
      for (let x = -width / 2 + 3; x < width / 2 - 1; x += 5) for (let z = -depth / 2 + 3; z < depth / 2 - 1; z += 5) {
        parts.push(B(2.8, 0.1, 0.32, x, height - 0.42, z, "steel"));
        parts.push(B(2.65, 0.035, 0.25, x, height - 0.48, z, "white"));
      }
    }
    return parts;
  }), [width, depth, height, style.walls, style.roof, style.lights, style.wallColor]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]} receiveShadow raycast={() => null}><planeGeometry args={[width, depth]} /><meshStandardMaterial color={style.floorColor} roughness={0.94} /></mesh>
    <primitive object={objects} />
    {style.lights && [-1, 1].map((s) => <pointLight key={s} position={[s * width * 0.26, height - 1.2, s * depth * 0.26]} intensity={26} distance={Math.max(width, depth) * 0.7} decay={2} color="#fff5e2" />)}
  </group>;
}

export function FactoryEnvironment({ shell, building }: { shell: boolean; building: BuildingStyle }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={building.floorColor} roughness={0.92} metalness={0} />
      </mesh>
      {shell && <BuildingShell style={building} />}
    </group>
  );
}
