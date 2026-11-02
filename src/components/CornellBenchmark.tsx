import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Cornell box for visual GI comparisons, modelled on the reference render in
 * `docs/benchmarks/cornell-reference.png`. It is a closed room with a red left wall,
 * green right wall, and white floor, ceiling, and back wall, plus a tall box, a glossy
 * blue sphere, and a bright ceiling light. The camera side is open. Sun, fill, sky,
 * environment, and the factory content are removed so that the only light comes from
 * the ceiling emitter and point light.
 */
export const CORNELL_ROOM = { width: 20, height: 15, depth: 20 } as const;

const WHITE = '#f2f2f2';
const RED = '#ff1a0a';
const GREEN = '#22ff1a';

export function CornellBenchmark() {
  const materials = useMemo(() => ({
    white: new THREE.MeshStandardMaterial({ color: WHITE, roughness: 1, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: RED, roughness: 1, metalness: 0 }),
    green: new THREE.MeshStandardMaterial({ color: GREEN, roughness: 1, metalness: 0 }),
    tall: new THREE.MeshStandardMaterial({ color: WHITE, roughness: 1, metalness: 0 }),
    blue: new THREE.MeshPhysicalMaterial({ color: '#2058ff', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    light: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.96, 0.9).multiplyScalar(6) }),
  }), []);

  const { width: w, height: h, depth: d } = CORNELL_ROOM;
  return (
    <group name="cornell-benchmark">
      {/* Walls, floor, ceiling. Plane normals face into the room. */}
      <mesh name="floor" receiveShadow material={materials.white} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[w, d, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh name="ceiling" receiveShadow material={materials.white} rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]} scale={[w, d, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh name="back-wall" receiveShadow material={materials.white} position={[0, h / 2, -d / 2]} scale={[w, h, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh name="left-wall-red" receiveShadow material={materials.red} rotation={[0, Math.PI / 2, 0]} position={[-w / 2, h / 2, 0]} scale={[d, h, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh name="right-wall-green" receiveShadow material={materials.green} rotation={[0, -Math.PI / 2, 0]} position={[w / 2, h / 2, 0]} scale={[d, h, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Ceiling light: an emissive disc with a matching point light for direct illumination. */}
      <mesh name="ceiling-light" rotation={[Math.PI / 2, 0, 0]} position={[0, h - 0.05, 0]} material={materials.light}>
        <circleGeometry args={[2.5, 48]} />
      </mesh>
      <pointLight position={[0, h - 1, 0]} intensity={600} distance={0} decay={2} color="#fff4e6" />

      {/* Objects. */}
      <mesh name="tall-box" castShadow receiveShadow material={materials.tall} position={[-3.2, 5, -3]} rotation={[0, 0.32, 0]}>
        <boxGeometry args={[5, 10, 5]} />
      </mesh>
      <mesh name="blue-sphere" castShadow receiveShadow material={materials.blue} position={[4, 3, 3]}>
        <sphereGeometry args={[3, 64, 48]} />
      </mesh>
    </group>
  );
}
