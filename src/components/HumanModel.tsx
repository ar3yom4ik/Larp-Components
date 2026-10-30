import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneItem } from "../types";
import { sim } from "../sim/engine";
import { getMaterial } from "./ModelKit";
import { RiggedHuman } from "./RiggedHuman";

export function HumanModel({ item }: { item: SceneItem }) {
  if (item.worker?.appearance === "classic") return <ClassicHuman item={item} />;
  return <RiggedHuman item={item} fallback={<ClassicHuman item={item} />} />;
}

function ClassicHuman({ item }: { item: SceneItem }) {
  const root = useRef<THREE.Group>(null), leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null), leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  useFrame(() => {
    const rt = sim.humans.get(item.id);
    if (!rt || !root.current) return;
    const rot = item.rotation * Math.PI / 180, dx = rt.x - item.position[0], dz = rt.z - item.position[2];
    root.current.position.set((dx * Math.cos(rot) - dz * Math.sin(rot)) / item.scale, 0, (dx * Math.sin(rot) + dz * Math.cos(rot)) / item.scale);
    root.current.rotation.y = rt.yaw - rot;
    const swing = rt.walking ? Math.sin(rt.phase) * 0.55 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    const work = !rt.walking && (rt.status === "inspect" || rt.status === "replenish") ? -0.7 + Math.sin(sim.time * 3) * 0.12 : 0;
    if (leftArm.current) leftArm.current.rotation.x = rt.held ? -0.9 : -swing * 0.65 + work;
    if (rightArm.current) rightArm.current.rotation.x = rt.held ? -0.9 : swing * 0.65 + work;
  });
  const hat = String(item.props.hat ?? "hardhat");
  return <group ref={root}>
    <mesh position={[0, 1.15, 0]} material={getMaterial("vest")} castShadow><capsuleGeometry args={[0.22, 0.35, 5, 12]} /></mesh>
    <mesh position={[0, 1.18, 0.18]} material={getMaterial("white")}><boxGeometry args={[0.3, 0.055, 0.04]} /></mesh>
    <mesh position={[0, 0.86, 0]} material={getMaterial("pants")} castShadow><boxGeometry args={[0.37, 0.18, 0.26]} /></mesh>
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftLeg : rightLeg} position={[side * 0.115, 0.83, 0]}>
      <mesh position={[0, -0.36, 0]} material={getMaterial("pants")} castShadow><capsuleGeometry args={[0.09, 0.56, 4, 10]} /></mesh>
      <mesh position={[0, -0.75, 0.06]} material={getMaterial("black")} castShadow><boxGeometry args={[0.17, 0.1, 0.3]} /></mesh>
    </group>)}
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftArm : rightArm} position={[side * 0.27, 1.35, 0]}>
      <mesh position={[side * 0.02, -0.24, 0]} material={getMaterial("vest")} castShadow><capsuleGeometry args={[0.066, 0.38, 4, 10]} /></mesh>
      <mesh position={[side * 0.02, -0.51, 0]} material={getMaterial("skin")} castShadow><sphereGeometry args={[0.075, 10, 8]} /></mesh>
    </group>)}
    <mesh position={[0, 1.65, 0]} material={getMaterial("skin")} castShadow><sphereGeometry args={[0.17, 16, 12]} /></mesh>
    <mesh position={[0, 1.73, -0.02]} material={getMaterial("hair")} castShadow><sphereGeometry args={[0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    {item.props.ears === true && <group>
      {[-1, 1].map((s) => <group key={s} position={[s * 0.11, 1.87, 0]} rotation={[0, 0, s * -0.25]}>
        <mesh material={getMaterial("hair")} castShadow><coneGeometry args={[0.065, 0.17, 3]} /></mesh>
        <mesh position={[0, -0.035, 0.02]} material={getMaterial("skin")}><coneGeometry args={[0.03, 0.09, 3]} /></mesh>
      </group>)}
    </group>}
    {item.props.headphones === true && <group>
      <mesh position={[0, 1.84, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.19, 0.025, 6, 18, Math.PI]} /><meshStandardMaterial color="#28343c" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.18, 1.68, 0]}><cylinderGeometry args={[0.06, 0.06, 0.08, 12]} /><meshStandardMaterial color="#3b4f5c" /></mesh>)}
    </group>}
    {item.props.earrings === true && [-1, 1].map((s) => <mesh key={s} position={[s * 0.18, 1.48, 0]}><torusGeometry args={[0.025, 0.006, 5, 10]} /><meshStandardMaterial color="#e9c34d" metalness={0.7} /></mesh>)}
    {hat !== "none" && <group>
      <mesh position={[0, 1.76, 0]} material={getMaterial(hat === "cap" ? "blue" : "yellow")} castShadow><sphereGeometry args={[0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 1.77, hat === "cap" ? 0.13 : 0]} material={getMaterial(hat === "cap" ? "blue" : "yellow")} castShadow><boxGeometry args={[0.39, 0.035, hat === "cap" ? 0.28 : 0.4]} /></mesh>
    </group>}
    {item.props.glasses === true && <group>
      {[-1, 1].map((side) => <mesh key={side} position={[side * 0.07, 1.67, 0.15]} material={getMaterial("black")}><boxGeometry args={[0.12, 0.065, 0.035]} /></mesh>)}
      <mesh position={[0, 1.67, 0.16]} material={getMaterial("steel")}><boxGeometry args={[0.035, 0.025, 0.02]} /></mesh>
    </group>}
  </group>;
}