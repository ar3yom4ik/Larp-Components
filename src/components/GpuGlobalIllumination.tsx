import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { builtinGIContext, mrt, normalView, packNormalToRGB, pass, sample, screenUV, unpackRGBToNormal, velocity } from 'three/tsl';
import { RenderPipeline, UnsignedByteType, type WebGPURenderer } from 'three/webgpu';
import { vxgi } from 'three/addons/lighting/vxgi/VXGINode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { isWebGPURenderer } from '../utils/gpu';

/** Voxel grid resolution per axis. 128 keeps the software-rendered debug path tractable. */
export const GI_VOXEL_RESOLUTION = 128;
/** While the simulation runs, the voxel grid is rebuilt at most this often (seconds). */
export const GI_REFRESH_SECONDS = 1.5;

type VXGIResult = ReturnType<typeof vxgi>;

declare global {
  interface Window {
    __larpGI?: VXGIResult;
  }
}

/**
 * WebGPU VXGI pipeline used by the max graphics preset (r187 `webgpu_vxgi` pattern):
 * depth + normal + velocity pre-pass -> voxel cone-traced AO/GI -> scene pass with
 * `builtinGIContext` -> TRAA. Must be mounted inside a Canvas whose renderer is WebGPU.
 *
 * `voxelKey` should change whenever scene geometry changes (items array, building shell).
 * Voxelization is expensive, so it is not run every frame.
 */
export function GlobalIlluminationPipeline({ voxelKey, running }: { voxelKey: unknown; running: boolean }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const active = useRef<{ pipeline: RenderPipeline; gi: VXGIResult } | null>(null);
  const sinceRefresh = useRef(0);

  useEffect(() => {
    if (!isWebGPURenderer(gl)) return undefined;
    const renderer = gl as WebGPURenderer;

    // Pre-pass: depth (built-in), packed view-space normal, and velocity for TRAA.
    const prePass = pass(scene, camera);
    prePass.name = 'GI pre-pass';
    prePass.transparent = false;
    prePass.setMRT(mrt({ output: packNormalToRGB(normalView), velocity }));
    const prePassNormal = sample((uv) => unpackRGBToNormal(prePass.getTextureNode().sample(uv)));
    const prePassDepth = prePass.getTextureNode('depth');
    const prePassVelocity = prePass.getTextureNode('velocity');
    prePass.getTexture('output').type = UnsignedByteType;

    const gi = vxgi(prePassDepth, prePassNormal, scene, camera, GI_VOXEL_RESOLUTION);
    gi.coneCount.value = 4;
    gi.coneAngle.value = 0.2;
    gi.giIntensity.value = 1;
    gi.aoIntensity.value = 1;
    gi.normalOffset.value = 1.5;
    gi.bounces = 1;
    gi.volume.stepScale.value = 0.5;

    const giContext = builtinGIContext(gi.getAONode().sample(screenUV).r, gi.getGINode().sample(screenUV).rgb);
    const scenePass = pass(scene, camera);
    scenePass.contextNode = giContext;
    const traaPass = traa(scenePass, prePassDepth, prePassVelocity, camera);

    const pipeline = new RenderPipeline(renderer);
    pipeline.outputNode = gi.useTemporalFiltering ? traaPass : scenePass;

    active.current = { pipeline, gi };
    window.__larpGI = gi;
    gi.volume.needsUpdate = true;
    sinceRefresh.current = 0;
    invalidate();

    return () => {
      active.current = null;
      if (window.__larpGI === gi) delete window.__larpGI;
      gi.dispose();
      (pipeline as unknown as { dispose?: () => void }).dispose?.();
    };
  }, [gl, scene, camera, invalidate]);

  useEffect(() => {
    if (!active.current) return;
    active.current.gi.volume.needsUpdate = true;
    invalidate();
  }, [voxelKey, invalidate]);

  useFrame((_, delta) => {
    const current = active.current;
    if (!current) return;
    if (running) {
      sinceRefresh.current += delta;
      if (sinceRefresh.current >= GI_REFRESH_SECONDS) {
        sinceRefresh.current = 0;
        current.gi.volume.needsUpdate = true;
      }
    }
    current.pipeline.render();
  }, 1);

  return null;
}
