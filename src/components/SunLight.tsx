import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GraphicsSettings } from '../theme';
import { setGraphicsStatus } from '../graphicsStatus';
import { isWebGPURenderer } from '../utils/gpu';

/**
 * Directional sun with a shadow frustum that stays sharp.
 *
 * A single fixed shadow camera spanning the whole building gives one texel per
 * 10-20 cm on a large plant, which is what made shadows look "terrible". Instead:
 *
 * - the frustum has a fixed half-size (`shadowExtent`, presets use 20-32 m) so texel
 *   density stays constant no matter how big the layout is;
 * - it follows the orbit target (`sunFollowView`), so wherever you look has crisp
 *   shadows, and the sun direction is unchanged, so lighting still reads correctly;
 * - the centre is snapped to the shadow-map texel grid, which removes the shimmering
 *   that a continuously moving frustum would otherwise produce;
 * - softness comes from `shadow.radius` (r187 PCF spread); r186+ deprecates
 *   `PCFSoftShadowMap` in favour of PCF plus radius, which is what this uses.
 *
 * Every applied value is published to `graphicsStatus`, so the settings panel can show
 * the real shadow texel size.
 */
export function SunLight({ gfx, controlsRef, building }: {
  gfx: GraphicsSettings;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  building: { width: number; depth: number; height: number };
}) {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const { gl, invalidate } = useThree();
  const centre = useMemo(() => new THREE.Vector3(), []);
  const last = useMemo(() => ({ x: NaN, z: NaN, extent: -1, size: -1, focusX: NaN, focusZ: NaN, reportedSize: -1 }), []);

  const direction = useMemo(() => {
    const azimuth = (gfx.sunAzimuth * Math.PI) / 180;
    const elevation = (gfx.sunElevation * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.sin(azimuth),
    ).normalize();
  }, [gfx.sunAzimuth, gfx.sunElevation]);

  // Radius and strength are plain uniforms, so they can change without a new shadow pass.
  useEffect(() => {
    const sun = light.current;
    if (!sun) return;
    sun.shadow.radius = gfx.shadowRadius;
    sun.shadow.intensity = gfx.shadowStrength;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = Math.max(0.01, gfx.shadowExtent / 1400);
    // WebGLShadowMap does not resize an existing map when mapSize changes.
    // The common WebGPU shadow node owns and resizes its own target instead.
    if (!isWebGPURenderer(gl) && sun.shadow.map && sun.shadow.map.width !== gfx.shadowSize) {
      sun.shadow.map.depthTexture?.dispose();
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    if (!gfx.shadows) setGraphicsStatus({ shadowSize: 0, shadowTexelCm: 0 });
    else setGraphicsStatus({ shadowSize: gfx.shadowSize, shadowExtent: gfx.shadowExtent, shadowTexelCm: Math.round(gfx.shadowExtent * 2000 / gfx.shadowSize) / 10 });
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, gfx.shadowRadius, gfx.shadowStrength, gfx.shadowExtent, gfx.shadowSize, gfx.shadows, gfx.sunAzimuth, gfx.sunElevation, building.height, invalidate]);

  useFrame(() => {
    const sun = light.current;
    if (!sun) {
      return;
    }
    const extent = gfx.shadowExtent;
    const size = gfx.shadowSize;
    // Follow the orbit target so the visible area keeps a high texel density.
    const focus = controlsRef.current?.target;
    if (gfx.sunFollowView && focus) centre.set(focus.x, 0, focus.z);
    else centre.set(0, 0, 0);

    // Snap to the shadow texel grid: moving the frustum by sub-texel amounts makes
    // static shadows crawl, which is much more noticeable than a slightly offset sun.
    const texel = (extent * 2) / size;
    const x = Math.round(centre.x / texel) * texel;
    const z = Math.round(centre.z / texel) * texel;

    const distance = Math.max(40, extent * 2.6 + building.height * 2);
    sun.position.set(x + direction.x * distance, direction.y * distance + 1, z + direction.z * distance);
    if (target.current) {
      target.current.position.set(x, 0, z);
      target.current.updateMatrixWorld();
      sun.target = target.current;
    }
    const camera = sun.shadow.camera;
    if (camera.left !== -extent || camera.right !== extent || camera.top !== extent || camera.bottom !== -extent || camera.near !== 1 || camera.far !== distance * 2.4) {
      camera.left = -extent;
      camera.right = extent;
      camera.top = extent;
      camera.bottom = -extent;
      camera.near = 1;
      camera.far = distance * 2.4;
      camera.updateProjectionMatrix();
    }

    // Re-render the shadow map only when something visible changed: the snapped frustum,
    // the shadow settings, or the area the camera is looking at. Moving products are
    // covered separately by SimDriver while the simulation runs.
    const focusMoved = !Number.isFinite(last.focusX) || Math.abs(centre.x - last.focusX) > 0.05 || Math.abs(centre.z - last.focusZ) > 0.05;
    if (last.x !== x || last.z !== z || last.extent !== extent || last.size !== size || focusMoved) {
      last.x = x; last.z = z; last.extent = extent; last.size = size; last.focusX = centre.x; last.focusZ = centre.z;
      gl.shadowMap.needsUpdate = true;
      invalidate();
      last.reportedSize = -1;
    }
    const actualSize = gfx.shadows ? (sun.shadow.map?.width ?? size) : 0;
    if (last.reportedSize !== actualSize || last.extent !== extent) {
      last.reportedSize = actualSize;
      setGraphicsStatus({ shadowSize: actualSize, shadowExtent: extent, shadowTexelCm: actualSize ? Math.round(extent * 2000 / actualSize) / 10 : 0 });
    }
  });

  return (
    <>
      <object3D ref={target} position={[0, 0, 0]} />
      <directionalLight
        ref={light}
        position={[direction.x * 40, direction.y * 40, direction.z * 40]}
        intensity={gfx.sun}
        color="#fffaf0"
        castShadow={gfx.shadows}
        shadow-mapSize-width={gfx.shadowSize}
        shadow-mapSize-height={gfx.shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-gfx.shadowExtent}
        shadow-camera-right={gfx.shadowExtent}
        shadow-camera-top={gfx.shadowExtent}
        shadow-camera-bottom={-gfx.shadowExtent}
        shadow-bias={-0.0004}
        shadow-radius={gfx.shadowRadius}
        shadow-intensity={gfx.shadowStrength}
        shadow-normalBias={Math.max(0.01, gfx.shadowExtent / 1400)}
      />
    </>
  );
}
