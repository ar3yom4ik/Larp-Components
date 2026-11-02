import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneItem } from '../types';
import { sim } from '../sim/engine';
import { getMaterial } from './ModelKit';

export function LogicModel({ item }: { item: SceneItem }) {
  const signal = sim.signalState.get(item.id) ?? false;
  const accent = signal ? '#b6ff8a' : item.color || '#8fa9c2';
  if (item.kind === 'laser') {
    const range = Number(item.props.range ?? 3);
    return <group>
      {[-1, 1].map((side) => <group key={side} position={[side * range / 2, 0, 0]}>
        <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[0.14, 1.16, 0.14]} /></mesh>
        <mesh position={[0, 0.05, 0]} castShadow><boxGeometry args={[0.3, 0.1, 0.3]} /></mesh>
        <mesh position={[0, 1.18, 0]} material={getMaterial('dark')} castShadow><boxGeometry args={[0.2, 0.2, 0.18]} /></mesh>
        <mesh position={[side * -0.1, 1.18, 0.01]}><circleGeometry args={[0.045, 14]} /><meshStandardMaterial color={signal ? '#79ef92' : '#ff5656'} emissive={signal ? '#b6ff8a' : '#ff3d3d'} emissiveIntensity={2} /></mesh>
      </group>)}
      <mesh position={[0, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.009, 0.009, range - 0.2, 6]} /><meshBasicMaterial color={signal ? '#7eff99' : '#ff4e4e'} transparent opacity={signal ? 0.95 : 0.55} toneMapped={false} /></mesh>
      <mesh position={[0, 1.18, 0]}><sphereGeometry args={[0.075, 10, 10]} /><meshBasicMaterial color={signal ? '#8effa6' : '#ff5b5b'} toneMapped={false} /></mesh>
    </group>;
  }
  if (item.kind === 'button') return <group>
    <mesh position={[0, 0.54, 0]} castShadow><boxGeometry args={[0.32, 1.08, 0.32]} /></mesh>
    <mesh position={[0, 1.14, 0]} castShadow><cylinderGeometry args={[0.2, 0.24, 0.16, 20]} /></mesh>
    <mesh position={[0, 1.23, 0]}><cylinderGeometry args={[0.12, 0.12, 0.06, 18]} /><meshStandardMaterial color={signal ? '#7df090' : '#d94d43'} emissive={signal ? '#58d46d' : '#a22c24'} emissiveIntensity={signal ? 1.2 : 0.2} /></mesh>
  </group>;
  if (item.kind === 'plc') return <group>
    <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[0.9, 1.5, 0.42]} /></mesh>
    <mesh position={[0, 0.9, 0.23]}><boxGeometry args={[0.68, 0.7, 0.03]} /><meshStandardMaterial color="#173f38" emissive={signal ? '#4dae62' : '#255f48'} emissiveIntensity={0.7} /></mesh>
    {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.3 + i * 0.2, 1.28, 0.22]}><planeGeometry args={[0.09, 0.04]} /><meshStandardMaterial color={i === 0 ? accent : '#94a6b7'} emissive={i === 0 ? accent : '#000'} emissiveIntensity={1} /></mesh>)}
  </group>;
  // proximity sensor
  return <group>
    <mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[0.14, 1.04, 0.14]} /></mesh>
    <mesh position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.18, 14]} /></mesh>
    <mesh position={[0, 1.08, 0.1]}><circleGeometry args={[0.055, 12]} /><meshStandardMaterial color={signal ? '#78ef91' : '#66c8ee'} emissive={signal ? '#b6ff8a' : '#52b8e8'} emissiveIntensity={1.5} /></mesh>
  </group>;
}

export function CollectorModel({ item }: { item: SceneItem }) {
  const width = Number(item.props.width ?? 1), depth = Number(item.props.depth ?? 0.8), height = Number(item.props.height ?? 0.55);
  const count = sim.collectors.get(item.id)?.count ?? 0;
  return <group>
    <mesh position={[0, 0.04, 0]} receiveShadow><boxGeometry args={[width, 0.08, depth]} /></mesh>
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[width - 0.08, depth - 0.08]} /><meshStandardMaterial color="#d9b16f" roughness={0.8} /></mesh>
    {[-1, 1].map((s) => <group key={s}><mesh position={[s * width / 2, height / 2 + 0.08, 0]} castShadow><boxGeometry args={[0.035, height, depth]} /><meshStandardMaterial color="#d6a14e" transparent opacity={0.8} /></mesh><mesh position={[0, height / 2 + 0.08, s * depth / 2]} castShadow><boxGeometry args={[width, height, 0.035]} /><meshStandardMaterial color="#d6a14e" transparent opacity={0.8} /></mesh></group>)}
    <mesh position={[0, height + 0.12, depth / 2 + 0.01]}><planeGeometry args={[Math.max(0.5, width * 0.75), 0.16]} /><meshStandardMaterial color="#27333b" emissive="#213b45" emissiveIntensity={0.3} /></mesh>
    <mesh position={[0.0001, height + 0.12, depth / 2 + 0.02]}><planeGeometry args={[0.6, 0.12]} /><meshBasicMaterial color={count > 0 ? '#76e892' : '#9db4c1'} transparent opacity={0.01} /></mesh>
  </group>;
}

export function IndustrialLight({ item }: { item: SceneItem }) {
  const color = String(item.props.color ?? '#fff1d0'), intensity = Number(item.props.intensity ?? 35), height = Number(item.props.height ?? 4.2);
  const castShadow = item.props.castShadow === true;
  return <group>
    <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.28, 0.34, 0.12, 16]} /></mesh>
    <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, height, 10]} /></mesh>
    <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.32, 0.2, 0.24, 20]} /></mesh>
    <mesh position={[0, height - 0.13, 0]}><circleGeometry args={[0.24, 20]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} /></mesh>
    {String(item.props.lightType ?? 'spot') === 'point' ? <pointLight position={[0, height - 0.16, 0]} color={color} intensity={intensity} distance={Number(item.props.distance ?? 8)} decay={2} castShadow={castShadow} shadow-mapSize={[1024, 1024]} /> : <spotLight position={[0, height - 0.16, 0]} target-position={[0, 0, 0]} color={color} intensity={intensity} distance={Number(item.props.distance ?? 8)} angle={Math.PI / 4} penumbra={0.55} decay={2} castShadow={castShadow} shadow-mapSize={[1024, 1024]} />}
  </group>;
}

export function PaintStationModel() {
  const accent = '#e7c264';
  return <group>
    <mesh position={[0, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.2, 1.9]} /><meshStandardMaterial color="#36434c" /></mesh>
    <mesh position={[0, 1.5, -0.94]}><boxGeometry args={[2.4, 2.8, 0.04]} /><meshStandardMaterial color="#6b92a0" transparent opacity={0.22} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 1.2, 1.5, 0]}><boxGeometry args={[0.08, 2.8, 1.9]} /><meshStandardMaterial color="#849ca8" metalness={0.4} transparent opacity={0.45} /></mesh>)}
    <mesh position={[0, 2.9, 0]} castShadow><boxGeometry args={[2.5, 0.12, 2]} /><meshStandardMaterial color={accent} metalness={0.3} /></mesh>
    <mesh position={[0, 0.15, 1.2]} castShadow><boxGeometry args={[0.7, 0.12, 0.7]} /><meshStandardMaterial color="#5b6e79" /></mesh>
    <mesh position={[0, 1.7, 0.8]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.16, 0.5, 12]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} /></mesh>
    <mesh position={[0, 1.1, 0.8]}><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color="#758a96" /></mesh>
    <mesh position={[0, 0.15, 1.58]}><boxGeometry args={[0.3, 0.22, 0.14]} /><meshStandardMaterial color={accent} /></mesh>
  </group>;
}

export function CutterModel() {
  return <group>
    <mesh position={[0, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[2.5, 0.2, 1.9]} /></mesh>
    <mesh position={[0, 1.3, -0.15]} castShadow><boxGeometry args={[2.3, 2.2, 1.65]} /><meshStandardMaterial color="#d5dee3" /></mesh>
    <mesh position={[0, 1.3, 0.7]}><boxGeometry args={[1.25, 0.8, 0.04]} /><meshStandardMaterial color="#9dd4df" transparent opacity={0.28} /></mesh>
    <mesh position={[-0.5, 1.5, 0.73]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.1, 0.9]} /><meshStandardMaterial color="#193d48" emissive="#2f9baf" emissiveIntensity={0.65} /></mesh>
    <mesh position={[0.2, 0.86, 1.3]}><boxGeometry args={[0.9, 0.04, 0.65]} /><meshStandardMaterial color="#9eacb5" metalness={0.5} /></mesh>
    <mesh position={[0.2, 1.8, 1.3]}><boxGeometry args={[0.37, 0.37, 0.37]} /><meshStandardMaterial color="#f4e7c2" transparent opacity={0.5} /></mesh>
    <mesh position={[0.3, 1.35, 0.76]}><cylinderGeometry args={[0.04, 0.04, 0.7, 10]} /><meshStandardMaterial color="#ffc441" emissive="#ff9c25" emissiveIntensity={0.6} /></mesh>
    <mesh position={[0.82, 1.4, 0.84]}><planeGeometry args={[0.35, 0.25]} /><meshStandardMaterial color="#243b46" emissive="#28a3b8" emissiveIntensity={0.8} /></mesh>
    <mesh position={[0, 2.5, 0]}><boxGeometry args={[2.4, 0.16, 1.8]} /><meshStandardMaterial color="#a7b6bf" /></mesh>
  </group>;
}

export function AssemblyModel() {
  return <group>
    <mesh position={[0, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[2.2, 0.2, 1.8]} /><meshStandardMaterial color="#40515d" /></mesh>
    <mesh position={[0, 0.7, 0.1]}><boxGeometry args={[1.5, 0.08, 1.1]} /><meshStandardMaterial color="#93a4ae" metalness={0.5} /></mesh>
    {[-0.55, 0, 0.55].map((x) => <group key={x}><mesh position={[x, 1.35, -0.45]}><boxGeometry args={[0.08, 1.5, 0.08]} /><meshStandardMaterial color="#758b98" /></mesh><mesh position={[x, 2.1, -0.45]}><boxGeometry args={[0.42, 0.15, 0.5]} /><meshStandardMaterial color={x === 0 ? '#f0bc55' : '#738793'} /></mesh><mesh position={[x, 1.95, -0.45]}><cylinderGeometry args={[0.05, 0.05, 0.24, 10]} /><meshStandardMaterial color="#f0bc55" emissive="#ab6e20" emissiveIntensity={0.3} /></mesh></group>)}
    <mesh position={[0, 0.95, 0.8]}><boxGeometry args={[0.8, 0.8, 0.12]} /><meshStandardMaterial color="#203841" emissive="#46aac0" emissiveIntensity={0.4} /></mesh>
  </group>;
}

export function KilnModel() {
  return <group>
    <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[0.8, 0.9, 1.8, 24]} /><meshStandardMaterial color="#8c8f8e" metalness={0.55} roughness={0.5} /></mesh>
    <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.82, 0.82, 1.5, 20]} /><meshStandardMaterial color="#c18e5c" roughness={0.8} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 1.1, 0.8, 0]} castShadow><boxGeometry args={[0.25, 1.6, 1.4]} /><meshStandardMaterial color="#7d8c94" /></mesh>)}
    <mesh position={[0, 1.85, 0]}><boxGeometry args={[2.6, 0.13, 1.3]} /><meshStandardMaterial color="#9eabb3" /></mesh>
    <mesh position={[0, 0.85, 0.76]}><planeGeometry args={[0.6, 0.6]} /><meshStandardMaterial color="#4d2a18" emissive="#f36c24" emissiveIntensity={1.05} /></mesh>
  </group>;
}

export function MobileRobotModel({ item }: { item: SceneItem }) {
  const root = useRef<THREE.Group>(null); const arm = useRef<THREE.Group>(null);
  useFrame(() => {
    const rt = sim.humans.get(item.id);
    if (!rt || !root.current) return;
    const pose = sim.getPhysicsPose(item.id) ?? item;
    const rot = pose.rotation * Math.PI / 180, dx = rt.x - pose.position[0], dz = rt.z - pose.position[2];
    root.current.position.set((dx * Math.cos(rot) - dz * Math.sin(rot)) / item.scale, (rt.y - pose.position[1]) / item.scale, (dx * Math.sin(rot) + dz * Math.cos(rot)) / item.scale);
    root.current.rotation.y = rt.yaw - rot;
    if (arm.current) arm.current.rotation.z = rt.walking ? Math.sin(rt.phase * 0.5) * 0.06 : Math.sin(sim.time) * 0.12;
  });
  return <group ref={root}>
    <mesh position={[0, 0.29, 0]} castShadow><boxGeometry args={[1.2, 0.34, 0.9]} /><meshStandardMaterial color="#d7e0e5" /></mesh>
    <mesh position={[0, 0.47, 0]}><boxGeometry args={[1.16, 0.06, 0.86]} /><meshStandardMaterial color={item.color || '#4bc1b8'} /></mesh>
    {[-1, 1].map((s) => [-1, 1].map((z) => <mesh key={`${s}${z}`} position={[s * 0.44, 0.19, z * 0.34]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.12, 14]} /><meshStandardMaterial color="#26353c" /></mesh>))}
    <group ref={arm} position={[0, 0.62, 0]}>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.15, 0.19, 0.44, 16]} /><meshStandardMaterial color="#6f8794" /></mesh>
      <mesh position={[0.23, 0.56, 0]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.13, 0.62, 0.13]} /><meshStandardMaterial color="#e0b644" /></mesh>
      <mesh position={[0.44, 0.87, 0]} rotation={[0, 0, 0.8]}><boxGeometry args={[0.12, 0.55, 0.12]} /><meshStandardMaterial color="#e0b644" /></mesh>
      <mesh position={[0.64, 1.0, 0]}><boxGeometry args={[0.28, 0.1, 0.24]} /><meshStandardMaterial color="#5c707b" /></mesh>
    </group>
    <mesh position={[0, 0.63, -0.3]}><cylinderGeometry args={[0.09, 0.11, 0.18, 12]} /><meshStandardMaterial color="#344750" /></mesh>
    <mesh position={[0, 0.76, -0.3]}><circleGeometry args={[0.07, 12]} /><meshStandardMaterial color="#6de6d8" emissive="#53d8cb" emissiveIntensity={1} /></mesh>
  </group>;
}
