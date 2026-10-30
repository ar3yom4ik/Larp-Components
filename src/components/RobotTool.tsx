import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sim } from "../sim/engine";
import type { GripperKind } from "../types";
import { getMaterial } from "./ModelKit";

export function RobotTool({ id, kind, length }: { id: string; kind: GripperKind; length: number }) {
  const fingers = useRef<THREE.Group>(null);
  useFrame(() => {
    const grip = sim.robots.get(id)?.grip ?? 0;
    if (fingers.current) { fingers.current.scale.y = 1 - grip * 0.45; fingers.current.scale.z = 1 - grip * 0.45; }
  });
  if (kind === "vacuum") return <mesh position={[length - 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={getMaterial("rubber")} castShadow><cylinderGeometry args={[0.055, 0.13, 0.1, 18]} /></mesh>;
  if (kind === "paint") return <group><mesh position={[length - 0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={getMaterial("steel")} castShadow><cylinderGeometry args={[0.055, 0.075, 0.24, 12]} /></mesh><mesh position={[length + 0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.12, 0.18, 12, 1, true]} /><meshStandardMaterial color="#e5c563" side={THREE.DoubleSide} /></mesh></group>;
  if (kind === "magnetic") return <group><mesh position={[length - 0.035, 0, 0]} material={getMaterial("blue")} castShadow><boxGeometry args={[0.07, 0.23, 0.23]} /></mesh><mesh position={[length + 0.003, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={getMaterial("steel")}><cylinderGeometry args={[0.1, 0.1, 0.01, 16]} /></mesh></group>;
  const count = kind === "three-finger" || kind === "soft" ? 3 : 2;
  return <group ref={fingers}>{Array.from({ length: count }, (_, i) => {
    const a = count === 2 ? i * Math.PI : i * Math.PI * 2 / count;
    return <group key={i} position={[length - 0.11, Math.sin(a) * 0.18, Math.cos(a) * 0.18]}>
      <mesh material={getMaterial(kind === "soft" ? "acc" : "steel", "#8bd5c9")} castShadow><boxGeometry args={[0.22, 0.055, 0.06]} /></mesh>
      <mesh position={[0.095, -Math.sin(a) * 0.02, -Math.cos(a) * 0.02]} material={getMaterial("rubber")}><boxGeometry args={[0.025, 0.065, 0.07]} /></mesh>
    </group>;
  })}</group>;
}