import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SelectiveBloom } from './SelectiveBloom';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GraphicsSettings, ToneMapping } from '../theme';

export const TONE_MAPPING_BY_NAME: Record<ToneMapping, THREE.ToneMapping> = {
  none: THREE.NoToneMapping,
  linear: THREE.LinearToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
};
import { setModelRenderer } from '../utils/modelImport';
import { isWebGPURenderer } from '../utils/gpu';
import { setGraphicsStatus } from '../graphicsStatus';

/**
 * Shadow-map filter for the current settings.
 *
 * r186 deprecates `PCFSoftShadowMap`; the supported way to get soft shadows is
 * `PCFShadowMap` plus `light.shadow.radius` (see `SunLight.tsx`). `BasicShadowMap` is
 * kept for the Low preset, where bandwidth matters more than filtering.
 */
export function shadowMapType(gfx: GraphicsSettings): THREE.ShadowMapType {
  if (!gfx.shadows) return THREE.BasicShadowMap;
  return gfx.softShadows ? THREE.PCFShadowMap : THREE.BasicShadowMap;
}

/** Updates the live renderer, not merely its initial onCreated state. */
export function RendererSettings({ gfx }: { gfx: GraphicsSettings }) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    setModelRenderer(gl);
    if (import.meta.env.DEV) (window as unknown as { __larpRenderer: unknown }).__larpRenderer = { gl, scene, camera };
    setGraphicsStatus({
      renderer: isWebGPURenderer(gl) ? 'webgpu' : 'webgl',
      rendererDetail: isWebGPURenderer(gl) ? 'WebGPU backend' : 'WebGL 2 backend',
    });
    return () => setModelRenderer(null);
  }, [gl, scene, camera]);
  useEffect(() => {
    gl.toneMapping = TONE_MAPPING_BY_NAME[gfx.toneMapping] ?? THREE.NeutralToneMapping;
    gl.toneMappingExposure = gfx.exposure;
    gl.shadowMap.enabled = gfx.shadows;
    gl.shadowMap.type = shadowMapType(gfx);
    // Shadows are refreshed on demand (see SunLight / SimDriver) instead of every frame.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    setGraphicsStatus({ pixelRatio: gl.getPixelRatio() });
    // In demand mode this makes every control visible immediately as well.
    invalidate();
  }, [gl, invalidate, gfx.exposure, gfx.toneMapping, gfx.shadows, gfx.softShadows, gfx.shadowSize, gfx.shadowStrength]);
  return null;
}

/**
 * Optional post-processing: screen-space occlusion and/or FXAA.
 *
 * One composer owns the final render whenever either effect is on; the effect list is
 * rebuilt (never patched in place) when the set of passes changes, so switching
 * antialiasing cannot leave a stale render target behind. With everything off, React
 * Three Fiber renders the scene itself, as before.
 *
 * Antialiasing modes:
 * - `msaa`: multisampled default framebuffer (renderer option, `Viewport.tsx`).
 * - `fxaa`: single-sample framebuffer plus this FXAA pass.
 * - `off`: no antialiasing.
 */
export function PostEffects({ gfx, pixelRatio, aoActive, externalPipeline = false }: { gfx: GraphicsSettings; pixelRatio: number; aoActive: boolean; externalPipeline?: boolean }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  // EffectComposer targets a WebGL framebuffer. The WebGPU path (VXGI) has its own
  // pipeline with TRAA, so these post effects are skipped there.
  const webgpu = isWebGPURenderer(gl);
  const fxaa = gfx.antialias === 'fxaa' && !webgpu;
  const ao = aoActive && !webgpu;
  const bloom = gfx.bloom && !webgpu;
  const effects = useRef<{ composer: EffectComposer; ao: GTAOPass | null; fxaa: FXAAPass | null; bloom: SelectiveBloom | null; output: OutputPass } | null>(null);

  useEffect(() => {
    if (!fxaa && !ao && !bloom) return undefined;
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    let aoPass: GTAOPass | null = null;
    if (ao) {
      aoPass = new GTAOPass(scene, camera, size.width, size.height);
      aoPass.output = GTAOPass.OUTPUT.Default;
      aoPass.updateGtaoMaterial({ radius: gfx.aoRadius, thickness: 1, samples: 8 });
      aoPass.updatePdMaterial({ samples: 8, rings: 2, radius: 3 });
      aoPass.blendIntensity = gfx.aoIntensity;
      composer.addPass(aoPass);
    }
    let bloomPass: SelectiveBloom | null = null;
    if (bloom) {
      bloomPass = new SelectiveBloom(gl,scene,camera,size.width,size.height,gfx.bloomStrength);
      composer.addPass(bloomPass.composite);
    }
    let fxaaPass: FXAAPass | null = null;
    if (fxaa) {
      fxaaPass = new FXAAPass();
      composer.addPass(fxaaPass);
    }
    const output = new OutputPass();
    composer.addPass(output);
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    effects.current = { composer, ao: aoPass, fxaa: fxaaPass, bloom: bloomPass, output };
    invalidate();
    return () => {
      effects.current = null;
      aoPass?.dispose();
      fxaaPass?.dispose();
      bloomPass?.dispose();
      output.dispose();
      composer.dispose();
      invalidate();
    };
    // `gfx.aoRadius` / `gfx.aoIntensity` are applied by the effect below without a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, fxaa, ao, bloom]);

  useEffect(() => {
    if (effects.current?.bloom) { effects.current.bloom.bloom.strength = gfx.bloomStrength; invalidate(); }
  }, [gfx.bloomStrength, bloom, invalidate]);

  useEffect(() => {
    const fx = effects.current;
    if (!fx?.ao) return;
    fx.ao.blendIntensity = gfx.aoIntensity;
    fx.ao.updateGtaoMaterial({ radius: gfx.aoRadius, thickness: 1.0, distanceFallOff: 1.0 });
    invalidate();
  }, [gfx.aoIntensity, gfx.aoRadius, ao, invalidate]);

  useEffect(() => {
    const fx = effects.current;
    if (!fx) return;
    // Composer pixel ratio and FXAA both scale with the 3D resolution setting.
    fx.composer.setPixelRatio(gl.getPixelRatio());
    fx.composer.setSize(size.width, size.height);
    fx.bloom?.resize(size.width,size.height,gl.getPixelRatio());
    fx.fxaa?.setSize(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    invalidate();
  }, [gl, size.width, size.height, pixelRatio, fxaa, invalidate]);

  // A positive priority takes over the single final scene render from R3F.
  //
  // When the WebGPU VXGI pipeline is mounted it owns the frame; rendering the scene again
  // here used to draw a second, GI-less image on top of it, which is why the Max preset
  // looked like it had lost its global illumination.
  useFrame((_, delta) => {
    if (externalPipeline) return;
    if (effects.current) {effects.current.bloom?.render(delta);effects.current.composer.render(delta);}
    else gl.render(scene, camera);
  }, 1);
  return null;
}
