import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { builtinGIContext, mrt, normalView, packNormalToRGB, pass, sample, screenUV, unpackRGBToNormal, velocity } from 'three/tsl';
import { createEmissiveMRT } from './emissiveMrt';
import { RenderPipeline, UnsignedByteType, type WebGPURenderer } from 'three/webgpu';
import { vxgi } from 'three/addons/lighting/vxgi/VXGINode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { isWebGPURenderer } from '../utils/gpu';
import { GiScene } from '../utils/giScene';
import { configureVoxelGi, updateVoxelGi, type VoxelGi } from '../utils/vxgi';
import { TemporalFrames } from '../utils/temporalFrames';
import { setGraphicsStatus } from '../graphicsStatus';

export const GI_VOXEL_RESOLUTION = 96;
export const GI_REFRESH_SECONDS = 2;
const GEOMETRY_DEBOUNCE_MS = 250;
const MAX_GPU_FRAMES_IN_FLIGHT = 2;

declare global { interface Window { __larpGI?: VoxelGi } }

type Active = {
  pipeline: RenderPipeline; gi: VoxelGi; geometry: GiScene;
  bloom: ReturnType<typeof bloom> | null;
  inFlight: number; pending: boolean; disposed: boolean; started: boolean;
};

/**
 * Three r187's official VXGI pattern: normal/depth/velocity pre-pass, voxel GI,
 * builtinGIContext, then TRAA. Only physical scene roots are voxelized; the
 * renderer owns the final frame, with no second GI-less render over it.
 */
export function GlobalIlluminationPipeline({ voxelKey, lightKey, running, floorColor, includeFloor, resolution = GI_VOXEL_RESOLUTION, refreshSeconds = GI_REFRESH_SECONDS, giStrength, aoIntensity, aoDistance, bloomEnabled = true, bloomStrength = .65, onUnavailable }: {
  voxelKey: unknown; lightKey: unknown; running: boolean; floorColor: string; includeFloor: boolean;
  resolution?: number; refreshSeconds?: number; giStrength: number; aoIntensity: number; aoDistance: number;
  bloomEnabled?: boolean; bloomStrength?: number; onUnavailable?: (message: string) => void;
}) {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  const active = useRef<Active | null>(null);
  const sinceRefresh = useRef(0);
  const failed = useRef(false);
  const temporal = useRef(new TemporalFrames());
  const lastVoxelKey = useRef(voxelKey);
  const runningRef = useRef(running); runningRef.current = running;
  const floorRef = useRef({floorColor, includeFloor}); floorRef.current = {floorColor, includeFloor};

  useEffect(() => {
    if (!isWebGPURenderer(gl)) {
      setGraphicsStatus({ gi: 'failed', giDetail: 'VXGI needs the WebGPU renderer' });
      onUnavailable?.('VXGI needs WebGPU');
      return undefined;
    }
    const renderer = gl as WebGPURenderer;
    const owned: { dispose: () => void }[] = [];
    const own = <T extends { dispose: () => void }>(resource: T): T => { owned.push(resource); return resource; };
    const dispose = () => { for (const resource of owned.reverse()) { try { resource.dispose(); } catch (error) { console.warn('VXGI cleanup failed', error); } } };
    let created: Active | null = null;
    try {
      const geometry = own(new GiScene(scene));
      const prePass = own(pass(scene, camera));
      prePass.name = 'GI pre-pass';
      prePass.transparent = false;
      prePass.setMRT(mrt({ output: packNormalToRGB(normalView), velocity }));
      const prePassNormal = sample(uv => unpackRGBToNormal(prePass.getTextureNode().sample(uv)));
      const prePassDepth = prePass.getTextureNode('depth');
      const prePassVelocity = prePass.getTextureNode('velocity');
      prePass.getTexture('output').type = UnsignedByteType;

      const gi = own(vxgi(prePassDepth, prePassNormal, scene, camera, resolution));
      configureVoxelGi(gi, giStrength, aoIntensity, aoDistance);
      const giContext = builtinGIContext(gi.getAONode().sample(screenUV).r, gi.getGINode().sample(screenUV).rgb);
      const scenePass = own(pass(scene, camera));
      scenePass.contextNode = giContext;
      if (bloomEnabled) scenePass.setMRT(createEmissiveMRT());
      const traaPass = own(traa(scenePass, prePassDepth, prePassVelocity, camera));
      const glow = bloomEnabled ? own(bloom(scenePass.getTextureNode('emissive'), bloomStrength, .4, 1.0)) : null;
      const pipeline = own(new RenderPipeline(renderer));
      pipeline.outputNode = glow ? traaPass.add(glow) : traaPass;
      pipeline.needsUpdate = true;

      created = { pipeline, gi, geometry, bloom: glow, inFlight: 0, pending: false, disposed: false, started: false };
      active.current = created;
      window.__larpGI = gi;
      gi.needsUpdate = true;
      sinceRefresh.current = 0;
      failed.current = false;
      temporal.current.reset();
      setGraphicsStatus({ gi: 'starting', giDetail: `voxel grid ${resolution}³` });
      invalidate();
    } catch (error) {
      dispose();
      failed.current = true;
      const message = error instanceof Error ? error.message : String(error);
      console.warn('VXGI pipeline could not start:', error);
      setGraphicsStatus({ gi: 'failed', giDetail: message });
      onUnavailable?.(message);
      return undefined;
    }

    return () => {
      if (created) created.disposed = true;
      if (active.current === created) active.current = null;
      if (window.__larpGI === created?.gi) delete window.__larpGI;
      dispose();
    };
    // Uniform values are updated below without destroying the pipeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, invalidate, resolution, bloomEnabled, onUnavailable]);

  // Scene edits can happen at mouse-move frequency. Coalesce costly voxel rebuilds
  // until the user stops moving; sunlight changes only re-inject the light.
  useEffect(() => {
    if (lastVoxelKey.current === voxelKey) return;
    lastVoxelKey.current = voxelKey;
    const timer = window.setTimeout(() => {
      if (!active.current) return;
      active.current.gi.needsUpdate = true;
      temporal.current.reset();
      invalidate();
    }, GEOMETRY_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [voxelKey, invalidate]);
  useEffect(() => {
    if (!active.current) return;
    active.current.gi.lightingNeedsUpdate = true;
    temporal.current.reset(); invalidate();
  }, [lightKey, invalidate]);
  useEffect(() => {
    if (!active.current) return;
    updateVoxelGi(active.current.gi, giStrength, aoIntensity, aoDistance);
    if (active.current.bloom) active.current.bloom.strength.value = bloomStrength;
    temporal.current.reset(); invalidate();
  }, [giStrength, aoIntensity, aoDistance, bloomStrength, invalidate]);
  useEffect(() => { temporal.current.reset(); invalidate(); }, [running, invalidate]);

  useFrame((_, delta) => {
    const current = active.current;
    if (!current || failed.current) return;
    temporal.current.observe(camera);
    if (running) {
      sinceRefresh.current += delta;
      if (sinceRefresh.current >= Math.max(.25, refreshSeconds)) {
        sinceRefresh.current = 0;
        current.gi.needsUpdate = true;
      }
    }
    if (current.inFlight >= MAX_GPU_FRAMES_IN_FLIGHT) { current.pending = true; return; }
    try {
      if (current.gi.needsUpdate) {
        current.gi.volume.bounds.copy(current.geometry.prepare(floorRef.current.includeFloor, floorRef.current.floorColor));
        temporal.current.reset();
      }
      current.pending = false;
      current.pipeline.render();
      temporal.current.rendered();
      const queue = (gl as unknown as WebGPURenderer & {backend?: {device?: {queue?: {onSubmittedWorkDone?: () => Promise<void>}}}}).backend?.device?.queue;
      if (queue?.onSubmittedWorkDone) {
        current.inFlight += 1;
        void queue.onSubmittedWorkDone().then(() => {
          if (current.disposed) return;
          current.inFlight -= 1;
          if (!current.started) {
            current.started = true;
            setGraphicsStatus({ gi: 'vxgi', giDetail: `voxel grid ${resolution}³` });
          }
          if (current.pending || (!runningRef.current && temporal.current.pending)) invalidate();
        }).catch(error => {
          if (current.disposed || failed.current) return;
          failed.current = true;
          const message = error instanceof Error ? error.message : String(error);
          console.warn('VXGI GPU work failed:', error); onUnavailable?.(message);
        });
      } else if (!current.started) {
        current.started = true;
        setGraphicsStatus({ gi: 'vxgi', giDetail: `voxel grid ${resolution}³` });
      }
      if (!running && temporal.current.pending && current.inFlight < MAX_GPU_FRAMES_IN_FLIGHT) invalidate();
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
