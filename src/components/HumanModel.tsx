import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneItem } from "../types";
import { sim } from "../sim/engine";
import { getMaterial } from "./ModelKit";
import { RiggedHuman, workerShirtColor } from "./RiggedHuman";
import { WorkerGear, workerShirtMaterial } from "./WorkerCosmetics";

export function HumanModel({ item }: { item: SceneItem }) {
  if (item.worker?.appearance === "classic") return <ClassicHuman item={item} />;
  return <RiggedHuman item={item} fallback={<ClassicHuman item={item} />} />;
}

/** Simple articulated mannequin used when the rigged model cannot load. */
function ClassicHuman({ item }: { item: SceneItem }) {
  const root = useRef<THREE.Group>(null), leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null), leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  useFrame(() => {
    const rt = sim.humans.get(item.id);
    if (!rt || !root.current) return;
    const scale = Number.isFinite(item.scale) && Math.abs(item.scale) > 1e-4 ? item.scale : 1;
    const pose = sim.getPhysicsPose(item.id) ?? item;
    const rot = pose.rotation * Math.PI / 180, dx = rt.x - pose.position[0], dz = rt.z - pose.position[2];
    root.current.position.set((dx * Math.cos(rot) - dz * Math.sin(rot)) / scale, (rt.y - pose.position[1]) / scale, (dx * Math.sin(rot) + dz * Math.cos(rot)) / scale);
    root.current.rotation.y = rt.yaw - rot;
    const swing = rt.walking ? Math.sin(rt.phase) * 0.55 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    const work = !rt.walking && (rt.status === "inspect" || rt.status === "replenish") ? -0.7 + Math.sin(sim.time * 3) * 0.12 : 0;
    if (leftArm.current) leftArm.current.rotation.x = rt.held ? -0.9 : -swing * 0.65 + work;
    if (rightArm.current) rightArm.current.rotation.x = rt.held ? -0.9 : swing * 0.65 + work;
  });
  // The mannequin wears the same shirt colour as the rigged worker, so changing the
  // worker colour always shows up even if the rigged model is unavailable.
  const shirtColor = workerShirtColor(item);
  const shirt = workerShirtMaterial(shirtColor);
  const gear = useMemo(() => ({ props: item.props }), [item.props]);
  return <group ref={root}>
    <mesh position={[0, 1.15, 0]} material={shirt} castShadow><capsuleGeometry args={[0.22, 0.35, 5, 12]} /></mesh>
    <mesh position={[0, 1.18, 0.18]} material={getMaterial("white")}><boxGeometry args={[0.3, 0.055, 0.04]} /></mesh>
    <mesh position={[0, 0.86, 0]} material={getMaterial("pants")} castShadow><boxGeometry args={[0.37, 0.18, 0.26]} /></mesh>
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftLeg : rightLeg} position={[side * 0.115, 0.83, 0]}>
      <mesh position={[0, -0.36, 0]} material={getMaterial("pants")} castShadow><capsuleGeometry args={[0.09, 0.56, 4, 10]} /></mesh>
      <mesh position={[0, -0.75, 0.06]} material={getMaterial("black")} castShadow><boxGeometry args={[0.17, 0.1, 0.3]} /></mesh>
    </group>)}
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftArm : rightArm} position={[side * 0.27, 1.35, 0]}>
      <mesh position={[side * 0.02, -0.24, 0]} material={shirt} castShadow><capsuleGeometry args={[0.066, 0.38, 4, 10]} /></mesh>
      <mesh position={[side * 0.02, -0.51, 0]} material={getMaterial("skin")} castShadow><sphereGeometry args={[0.075, 10, 8]} /></mesh>
    </group>)}
    <mesh position={[0, 1.65, 0]} material={getMaterial("skin")} castShadow><sphereGeometry args={[0.17, 16, 12]} /></mesh>
    <mesh position={[0, 1.73, -0.02]} material={getMaterial("hair")} castShadow><sphereGeometry args={[0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    {/* The mannequin head is centred at 1.65; the gear anchor sits 0.12 below the crown. */}
    <group position={[0, 1.53, 0]}><WorkerGear item={gear} shirtColor={shirtColor} glasses={item.props.glasses === true} /></group>
  </group>;
}
