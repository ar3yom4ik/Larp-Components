import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneItem } from '../types';
import { sim } from '../sim/engine';
import { signalAnchor, signalTargets, signalWireColor } from '../utils/signalPorts';

function wireCurve(source: SceneItem, target: SceneItem) {
  const a = new THREE.Vector3(...signalAnchor(source, 'source'));
  const b = new THREE.Vector3(...signalAnchor(target, 'target'));
  const mid = a.clone().lerp(b, 0.5);
  mid.y = Math.max(a.y, b.y) + Math.max(0.45, a.distanceTo(b) * 0.12);
  return new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x, a.y + 0.22, a.z), mid, new THREE.Vector3(b.x, b.y + 0.22, b.z), b]);
}

function Wire({ source, target }: { source: SceneItem; target: SceneItem }) {
  const packet = useRef<THREE.Group>(null);
  const cable = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const color = signalWireColor(source.props.wireColor);
  const packetColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.6), [color]);
  const curve = useMemo(() => wireCurve(source, target), [source.kind, source.position, source.rotation, source.rotationX, source.rotationZ, source.scale, source.props.range, source.props.mountedTo, target.kind, target.position, target.rotation, target.rotationX, target.rotationZ, target.scale, target.props.range, target.props.mountedTo]);
  const curveRef = useRef(curve);
  const cableMesh = useRef<THREE.Mesh>(null), glowMesh = useRef<THREE.Mesh>(null);
  const endpoints = useRef<(THREE.Mesh | null)[]>([]);
  const moving = useRef<{key: string; elapsed: number; cable?: THREE.BufferGeometry; glow?: THREE.BufferGeometry}>({key: '', elapsed: 0});
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.024, 8, false), [curve]);
  const glowGeometry = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.065, 8, false), [curve]);
  useEffect(() => {
    curveRef.current = curve;
    return () => { geometry.dispose(); glowGeometry.dispose(); moving.current.cable?.dispose(); moving.current.glow?.dispose(); moving.current = {key: '', elapsed: 0}; };
  }, [curve, geometry, glowGeometry]);
  const duration = Math.max(0.65, Math.min(2.4, curve.getLength() / 4));
  const animation = useRef({ revision: sim.signalActivations.get(source.id) ?? 0, wasLive: false, progress: -1, queued: 0, repeatDelay: 0 });

  useFrame((_, delta) => {
    // Rebuild only moving wires, at a bounded rate; ordinary factory wiring
    // continues to use the shared static geometry fast path.
    const sourcePose = sim.getPhysicsPose(source.id) ?? (source.props.mountedTo ? sim.getLiveItem(source.id) : undefined);
    const targetPose = sim.getPhysicsPose(target.id) ?? (target.props.mountedTo ? sim.getLiveItem(target.id) : undefined);
    const motion = moving.current;
    motion.elapsed += delta;
    if ((sourcePose || targetPose) && motion.elapsed >= 0.05) {
      motion.elapsed = 0;
      const a = sourcePose ? { ...source, ...sourcePose } : source;
      const b = targetPose ? { ...target, ...targetPose } : target;
      const key = [...signalAnchor(a, 'source'), ...signalAnchor(b, 'target')].map((v) => v.toFixed(3)).join(',');
      if (key !== motion.key) {
        motion.key = key;
        const next = wireCurve(a, b);
        const nextCable = new THREE.TubeGeometry(next, 48, 0.024, 8, false);
        const nextGlow = new THREE.TubeGeometry(next, 48, 0.065, 8, false);
        motion.cable?.dispose(); motion.glow?.dispose();
        motion.cable = nextCable; motion.glow = nextGlow; curveRef.current = next;
        if (cableMesh.current) cableMesh.current.geometry = nextCable;
        if (glowMesh.current) glowMesh.current.geometry = nextGlow;
        endpoints.current[0]?.position.copy(next.getPoint(0)); endpoints.current[1]?.position.copy(next.getPoint(1));
      }
    } else if (!sourcePose && !targetPose && motion.key) {
      motion.cable?.dispose(); motion.glow?.dispose(); moving.current = {key: '', elapsed: 0}; curveRef.current = curve;
      if (cableMesh.current) cableMesh.current.geometry = geometry;
      if (glowMesh.current) glowMesh.current.geometry = glowGeometry;
      endpoints.current[0]?.position.copy(curve.getPoint(0)); endpoints.current[1]?.position.copy(curve.getPoint(1));
    }
    const activeCurve = curveRef.current;
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
        packet.current.position.copy(activeCurve.getPointAt(Math.min(1, state.progress)));
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

  // Keep JSX endpoint props stable; otherwise an unrelated React render can
  // overwrite the live positions after the moving-geometry key has settled.
  const [start, end] = useMemo(() => [curve.getPoint(0), curve.getPoint(1)], [curve]);
  return <group name="signal-wire" userData={{ signalWire: true, sourceId: source.id, targetId: target.id }}>
    <mesh ref={cableMesh} name="signal-cable" geometry={geometry} raycast={() => null}>
      <meshStandardMaterial ref={cable} color={color} emissive={color} emissiveIntensity={0.12} roughness={0.4} />
    </mesh>
    <mesh ref={glowMesh} name="signal-glow" geometry={glowGeometry} raycast={() => null}>
      <meshBasicMaterial ref={glow} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    {[start, end].map((position, index) => <mesh key={index} ref={(mesh) => { endpoints.current[index] = mesh; }} position={position} raycast={() => null}>
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
