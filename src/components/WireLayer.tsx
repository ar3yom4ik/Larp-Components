import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneItem } from '../types';
import { sim } from '../sim/engine';

function Wire({ source, target }: { source: SceneItem; target: SceneItem }) {
  const packet = useRef<THREE.Mesh>(null);
  const cable = useRef<THREE.MeshStandardMaterial>(null);
  const active = sim.signalState.get(source.id) === true;
  const curve = useMemo(() => {
    const a = new THREE.Vector3(source.position[0], 0.7, source.position[2]);
    const b = new THREE.Vector3(target.position[0], 0.8, target.position[2]);
    const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(1.8, 0.65 + a.distanceTo(b) * 0.15);
    return new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x, a.y + 0.35, a.z), mid, new THREE.Vector3(b.x, b.y + 0.35, b.z), b]);
  }, [source.position, target.position]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.017, 6, false), [curve]);
  useFrame(({ clock }) => {
    const live = sim.signalState.get(source.id) === true;
    if (packet.current) { packet.current.visible = live; if (live) packet.current.position.copy(curve.getPointAt((clock.elapsedTime * 0.35) % 1)); }
    if (cable.current) { cable.current.color.set(live ? '#70d3f2' : '#596a77'); cable.current.emissive.set(live ? '#3aa9d2' : '#000000'); cable.current.emissiveIntensity = live ? 0.6 : 0; }
  });
  return <group>
    <mesh geometry={geometry}><meshStandardMaterial ref={cable} color={active ? '#70d3f2' : '#596a77'} emissive={active ? '#3aa9d2' : '#000000'} emissiveIntensity={active ? 0.6 : 0} roughness={0.45} /></mesh>
    <mesh ref={packet} visible={active}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color="#b9fbff" toneMapped={false} /></mesh>
    <mesh position={[source.position[0], 0.68, source.position[2]]}><boxGeometry args={[0.16, 0.09, 0.12]} /><meshStandardMaterial color={active ? '#80eb9a' : '#5a6e7a'} emissive={active ? '#4ccd72' : '#000'} emissiveIntensity={0.7} /></mesh>
  </group>;
}

export function WireLayer({ items }: { items: SceneItem[] }) {
  const wires = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return items.filter((item) => typeof item.props.connectedTo === 'string' && item.props.connectedTo)
      .map((source) => ({ source, target: byId.get(String(source.props.connectedTo)) }))
      .filter((wire): wire is { source: SceneItem; target: SceneItem } => !!wire.target);
  }, [items]);
  return <>{wires.map((w) => <Wire key={`${w.source.id}-${w.target.id}`} source={w.source} target={w.target} />)}</>;
}
