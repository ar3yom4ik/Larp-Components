import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator as WebGPUPMREMGenerator } from 'three/webgpu';
import { isWebGPURenderer } from '../utils/gpu';
import { setGraphicsStatus } from '../graphicsStatus';

/**
 * Studio lighting environment.
 *
 * Three.js `Environment` from drei renders its virtual scene into a
 * `WebGLCubeRenderTarget`, which the WebGPU renderer cannot use, so the VXGI/Max path
 * ended up with no image-based lighting at all. This component builds the same kind of
 * studio (a soft "room" with a few large emissive panels) and pre-filters it with the
 * PMREM generator that matches the active renderer:
 *
 * - WebGL: `THREE.PMREMGenerator`, the classic GGX pre-filter.
 * - WebGPU: `PMREMGenerator` from `three/webgpu` (r187 node-based PMREM).
 *
 * The result is assigned to `scene.environment`, so `env` still controls reflections and
 * diffuse IBL, and the environment also feeds the VXGI volume as indirect light.
 */
export function StudioEnvironment({ intensity, resolution = 64, dark }: { intensity: number; resolution?: number; dark?: boolean }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const created = useRef<{ texture: THREE.Texture; dispose: () => void } | null>(null);

  useEffect(() => {
    // A tiny studio: one room box that bounces light back plus three soft panels.
    const studio = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(30, 18, 30),
      new THREE.MeshBasicMaterial({ color: dark ? '#23262b' : '#c9ced4', side: THREE.BackSide }),
    );
    room.position.y = 6;
    studio.add(room);

    const panel = (color: string, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false }),
      );
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.lookAt(0, 4, 0);
      studio.add(mesh);
    };
    // Key, cool rim and a warm bounce from below: enough variation to read as a studio.
    panel(dark ? '#c8d6ff' : '#fff6e8', [0, 11, 0], [18, 18, 1]);
    panel(dark ? '#7fa6ff' : '#cfe4ff', [-12, 6, -8], [10, 10, 1]);
    panel(dark ? '#ffd9a8' : '#ffe9c9', [11, 4, 7], [8, 8, 1]);
    panel(dark ? '#8b93a0' : '#eef1f4', [0, -2, 0], [26, 26, 1]);

    let texture: THREE.Texture | null = null;
    let dispose = () => {};
    try {
      const webgpu = isWebGPURenderer(gl);
      if (webgpu) {
        const generator = new WebGPUPMREMGenerator(gl as never);
        const target = generator.fromScene(studio, 0.02, 0.1, 100, { size: Math.max(64, resolution) });
        texture = target.texture;
        dispose = () => { target.dispose(); generator.dispose(); };
      } else {
        const generator = new THREE.PMREMGenerator(gl as THREE.WebGLRenderer);
        const target = generator.fromScene(studio, 0.02, 0.1, 100);
        texture = target.texture;
        dispose = () => { target.dispose(); generator.dispose(); };
      }
    } catch (error) {
      // Never let the environment take the canvas down with it.
      console.warn('Studio environment could not be generated; using direct lighting only.', error);
      setGraphicsStatus({ rendererDetail: 'environment unavailable' });
    } finally {
      studio.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }

    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    if (texture) {
      scene.environment = texture;
      scene.environmentIntensity = intensity;
    }
    created.current = texture ? { texture, dispose } : null;
    invalidate();

    return () => {
      scene.environment = previousEnvironment ?? null;
      scene.environmentIntensity = previousIntensity;
      if (created.current) { created.current.dispose(); created.current = null; }
      invalidate();
    };
    // Built once per renderer/resolution; intensity is applied live below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, resolution, dark, invalidate]);

  useEffect(() => {
    if (!created.current) return;
    scene.environmentIntensity = intensity;
    invalidate();
  }, [intensity, scene, invalidate]);

  return null;
}
