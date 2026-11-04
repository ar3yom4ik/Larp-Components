import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { builtinGIContext, mrt, normalView, packNormalToRGB, pass, sample, screenUV, unpackRGBToNormal, velocity } from 'three/tsl';
import { createEmissiveMRT } from './emissiveMrt';
import { RenderPipeline, UnsignedByteType, type WebGPURenderer } from 'three/webgpu';
import { vxgi } from 'three/addons/lighting/vxgi/VXGINode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { isWebGPURenderer } from '../utils/gpu';
import { setGraphicsStatus } from '../graphicsStatus';

/** Default voxel grid resolution per axis (r187 recommends at most 256). */
export const GI_VOXEL_RESOLUTION = 96;
/** Default seconds between re-voxelisations while the simulation runs. */
export const GI_REFRESH_SECONDS = 2;

type VXGIResult = ReturnType<typeof vxgi>;

declare global {
  interface Window {
    __larpGI?: VXGIResult;
  }
}

/**
 * WebGPU VXGI pipeline used by the Max graphics preset (r187 `webgpu_vxgi` pattern):
 * depth + normal + velocity pre-pass -> voxel cone-traced AO/GI -> scene pass with
 * `builtinGIContext` -> TRAA. Must be mounted inside a Canvas whose renderer is WebGPU.
 *
 * Differences from the three.js example that matter for an editor:
 * - the pipeline owns the frame (`PostEffects` stays out of the way), otherwise a second
 *   plain `gl.render` would paint over the GI result;
 * - creation is guarded: a driver that cannot run the volume or the pre-pass reports
 *   `onUnavailable` instead of leaving a black viewport, and the caller falls back to the
 *   screen-space approximation;
 * - `voxelKey` changes whenever the geometry *or the lighting* changes, and the volume is
 *   refreshed on a timer while the simulation runs (voxelisation is too expensive per frame);
 * - `resolution` and `refreshSeconds` are exposed to the settings panel.
 */
export function GlobalIlluminationPipeline({ voxelKey, running, resolution = GI_VOXEL_RESOLUTION, refreshSeconds = GI_REFRESH_SECONDS, bloomEnabled = true, bloomStrength = .65, onUnavailable }: {
  voxelKey: unknown;
  running: boolean;
  resolution?: number;
  refreshSeconds?: number;
  bloomEnabled?: boolean; bloomStrength?: number;
  onUnavailable?: (message: string) => void;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const active = useRef<{ pipeline: RenderPipeline; gi: VXGIResult } | null>(null);
  const sinceRefresh = useRef(0);
  const failed = useRef(false);

  useEffect(() => {
    if (!isWebGPURenderer(gl)) {
      setGraphicsStatus({ gi: 'failed', giDetail: 'VXGI needs the WebGPU renderer' });
      onUnavailable?.('VXGI needs WebGPU');
      return undefined;
    }
    const renderer = gl as WebGPURenderer;

    let created: { pipeline: RenderPipeline; gi: VXGIResult } | null = null;
    try {
      // Pre-pass: depth (built-in), packed view-space normal, velocity for TRAA.
      const prePass = pass(scene, camera);
      prePass.name = 'GI pre-pass';
      prePass.transparent = false;
      prePass.setMRT(mrt({ output: packNormalToRGB(normalView), velocity }));
      const prePassNormal = sample((uv) => unpackRGBToNormal(prePass.getTextureNode().sample(uv)));
      const prePassDepth = prePass.getTextureNode('depth');
      const prePassVelocity = prePass.getTextureNode('velocity');
      prePass.getTexture('output').type = UnsignedByteType;

      const gi = vxgi(prePassDepth, prePassNormal, scene, camera, resolution);
      gi.coneCount.value = 4;
      gi.coneAngle.value = 0.24;
      gi.giIntensity.value = 1.1;
      gi.aoIntensity.value = 1.25;
      gi.normalOffset.value = 1.5;
      gi.bounces = 1;
      gi.volume.stepScale.value = 0.5;

      const giContext = builtinGIContext(gi.getAONode().sample(screenUV).r, gi.getGINode().sample(screenUV).rgb);
      const scenePass = pass(scene, camera);
      scenePass.contextNode = giContext;
      // MRT exposes emission separately, so reflections never feed the halo.
      if (bloomEnabled) scenePass.setMRT(createEmissiveMRT());
      const traaPass = traa(scenePass, prePassDepth, prePassVelocity, camera);

      const pipeline = new RenderPipeline(renderer);
      const output = gi.useTemporalFiltering ? traaPass : scenePass;
      pipeline.outputNode = bloomEnabled ? output.add(bloom(scenePass.getTextureNode('emissive'), bloomStrength, .4, 1.0)) : output;
      pipeline.needsUpdate = true;

      created = { pipeline, gi };
      active.current = created;
      window.__larpGI = gi;
      gi.volume.needsUpdate = true;
      sinceRefresh.current = 0;
      failed.current = false;
      setGraphicsStatus({ gi: 'vxgi', giDetail: `voxel grid ${resolution}³` });
      invalidate();
    } catch (error) {
      failed.current = true;
      const message = error instanceof Error ? error.message : String(error);
      console.warn('VXGI pipeline could not start:', error);
      setGraphicsStatus({ gi: 'failed', giDetail: message });
      onUnavailable?.(message);
      return undefined;
    }

    return () => {
      active.current = null;
      if (window.__larpGI === created?.gi) delete window.__larpGI;
      try {
        created?.gi.dispose();
        (created?.pipeline as unknown as { dispose?: () => void } | undefined)?.dispose?.();
      } catch (error) {
        console.warn('VXGI cleanup failed', error);
      }
    };
  }, [gl, scene, camera, invalidate, resolution, bloomEnabled, bloomStrength, onUnavailable]);

  useEffect(() => {
    if (!active.current) return;
    active.current.gi.volume.needsUpdate = true;
    invalidate();
  }, [voxelKey, invalidate]);

  useFrame((_, delta) => {
    const current = active.current;
    if (!current || failed.current) return;
    if (running) {
      sinceRefresh.current += delta;
      if (sinceRefresh.current >= Math.max(0.25, refreshSeconds)) {
        sinceRefresh.current = 0;
        current.gi.volume.needsUpdate = true;
      }
    }
    try {
      current.pipeline.render();
    } catch (error) {
      failed.current = true;
      const message = error instanceof Error ? error.message : String(error);
      console.warn('VXGI render failed, falling back:', error);
      setGraphicsStatus({ gi: 'failed', giDetail: message });
      onUnavailable?.(message);
    }
  }, 1);

  return null;
}
