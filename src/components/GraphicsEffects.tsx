import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GraphicsSettings } from '../theme';
import { setModelRenderer } from '../utils/modelImport';

/** Updates the live renderer, not merely its initial onCreated state. */
export function RendererSettings({ gfx }: { gfx: GraphicsSettings }) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    setModelRenderer(gl);
    if (import.meta.env.DEV) (window as unknown as { __larpRenderer: unknown }).__larpRenderer = { gl, scene, camera };
    return () => setModelRenderer(null);
  }, [gl, scene, camera]);
  useEffect(() => {
    gl.toneMapping = gfx.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : gfx.toneMapping === 'linear' ? THREE.LinearToneMapping : THREE.NeutralToneMapping;
    gl.toneMappingExposure = gfx.exposure;
    gl.shadowMap.enabled = gfx.shadows;
    gl.shadowMap.type = gfx.softShadows ? THREE.PCFShadowMap : THREE.BasicShadowMap;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    // In demand mode this makes every control visible immediately as well.
    invalidate();
  }, [gl, invalidate, gfx.exposure, gfx.toneMapping, gfx.shadows, gfx.softShadows, gfx.shadowSize, gfx.shadowStrength]);
  return null;
}

/** Ground-truth ambient occlusion is a screen-space approximation, not path tracing. */
export function AmbientOcclusion({ intensity, radius, pixelRatio }: { intensity: number; radius: number; pixelRatio: number }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const effects = useRef<{ composer: EffectComposer; ao: GTAOPass; output: OutputPass } | null>(null);
  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, size.width, size.height);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.updateGtaoMaterial({ radius: 0.55, thickness: 1, samples: 8 });
    ao.updatePdMaterial({ samples: 8, rings: 2, radius: 3 });
    composer.addPass(ao);
    const output = new OutputPass();
    composer.addPass(output);
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    effects.current = { composer, ao, output };
    invalidate();
    return () => {
      effects.current = null;
      ao.dispose(); output.dispose(); composer.dispose();
    };
    // Size and settings are updated without recreating the GPU pipeline below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, invalidate]);
  useEffect(() => {
    const fx = effects.current;
    if (!fx) return;
    fx.ao.blendIntensity = intensity;
    fx.ao.updateGtaoMaterial({ radius, thickness: 1.0, distanceFallOff: 1.0 });
    invalidate();
  }, [intensity, radius, invalidate]);
  useEffect(() => {
    const fx = effects.current;
    if (!fx) return;
    fx.composer.setPixelRatio(gl.getPixelRatio());
    fx.composer.setSize(size.width, size.height);
    invalidate();
  }, [gl, size.width, size.height, pixelRatio, invalidate]);
  // A positive priority takes over the single final scene render from R3F.
  useFrame((_, delta) => {
    if (effects.current) effects.current.composer.render(delta);
    else gl.render(scene, camera);
  }, 1);
  return null;
}
