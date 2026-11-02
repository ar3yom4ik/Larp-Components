import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneItem } from '../types';
import { sim } from '../sim/engine';
import { signalAnchor, signalTargets, signalWireColor } from '../utils/signalPorts';

function Wire({ source, target }: { source: SceneItem; target: SceneItem }) {
  const packet = useRef<THREE.Group>(null);
  const cable = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const color = signalWireColor(source.props.wireColor);
  const packetColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.6), [color]);
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...signalAnchor(source, 'source'));
    const b = new THREE.Vector3(...signalAnchor(target, 'target'));
    const mid = a.clone().lerp(b, 0.5);
    mid.y = Math.max(a.y, b.y) + Math.max(0.45, a.distanceTo(b) * 0.12);
    return new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x, a.y + 0.22, a.z), mid, new THREE.Vector3(b.x, b.y + 0.22, b.z), b]);
  }, [source.kind, source.position, source.rotation, source.rotationX, source.rotationZ, source.scale, source.props.range, target.kind, target.position, target.rotation, target.rotationX, target.rotationZ, target.scale, target.props.range]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.024, 8, false), [curve]);
  const glowGeometry = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.065, 8, false), [curve]);
  useEffect(() => () => { geometry.dispose(); glowGeometry.dispose(); }, [geometry, glowGeometry]);
  const duration = Math.max(0.65, Math.min(2.4, curve.getLength() / 4));
  const animation = useRef({ revision: sim.signalActivations.get(source.id) ?? 0, wasLive: false, progress: -1, queued: 0, repeatDelay: 0 });

  useFrame((_, delta) => {
    const state = animation.current;
    const live = sim.signalState.get(source.id) === true;
    const revision = sim.signalActivations.get(source.id) ?? 0;
    const newPulses = Math.max(0, revision - state.revision);
    // A newly mounted wire may already be high; short pulses are counted by the
    // engine even if they were over before this frame was drawn.
    if (newPulses) state.queued += newPulses;
    else if (live && !state.wasLive) state.queued += 1;
    state.revision = revision;
    state.wasLive = live;

    if (state.progress < 0) {
      state.repeatDelay -= delta;
      if (state.queued > 0) { state.queued -= 1; state.progress = 0; }
      else if (live && state.repeatDelay <= 0) state.progress = 0;
    }
    const travelling = state.progress >= 0;
    if (packet.current) {
      packet.current.visible = travelling;
      if (travelling) {
        packet.current.userData.progress = Math.min(1, state.progress);
        packet.current.position.copy(curve.getPointAt(Math.min(1, state.progress)));
      }
    }
    if (travelling) {
      // Draw the endpoint before hiding/repeating, so every pulse visibly
      // reaches the connected part even after a momentary signal is released.
      if (state.progress >= 1) { state.progress = -1; state.repeatDelay = 0.3; }
      else state.progress = Math.min(1, state.progress + delta / duration);
    }
    const energized = live || travelling;
    if (cable.current) cable.current.emissiveIntensity = energized ? 2.4 : 0.12;
    if (glow.current) glow.current.opacity = energized ? 0.28 : 0;
  });

  const start = curve.getPoint(0), end = curve.getPoint(1);
  return <group name="signal-wire" userData={{ signalWire: true, sourceId: source.id, targetId: target.id }}>
    <mesh name="signal-cable" geometry={geometry} raycast={() => null}>
      <meshStandardMaterial ref={cable} color={color} emissive={color} emissiveIntensity={0.12} roughness={0.4} />
    </mesh>
    <mesh name="signal-glow" geometry={glowGeometry} raycast={() => null}>
      <meshBasicMaterial ref={glow} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    {[start, end].map((position, index) => <mesh key={index} position={position} raycast={() => null}>
      <sphereGeometry args={[0.055, 10, 10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>)}
    <group ref={packet} name="signal-packet" visible={false}>
      <mesh raycast={() => null}><sphereGeometry args={[0.075, 12, 12]} /><meshBasicMaterial color={packetColor} toneMapped={false} /></mesh>
      <mesh raycast={() => null}><sphereGeometry args={[0.13, 12, 12]} /><meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  </group>;
}

export function WireLayer({ items }: { items: SceneItem[] }) {
  const wires = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return items.filter((item) => item.visible !== false)
      .flatMap((source) => signalTargets(source).map((id) => ({ source, target: byId.get(id) })))
      .filter((wire): wire is { source: SceneItem; target: SceneItem } => !!wire.target && wire.target.visible !== false);
  }, [items]);
  return <>{wires.map((w) => <Wire key={`${w.source.id}-${w.target.id}`} source={w.source} target={w.target} />)}</>;
}
