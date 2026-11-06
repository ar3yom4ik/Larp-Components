import { GI_GEOMETRY_LAYER } from './giScene';
import type { vxgi } from 'three/addons/lighting/vxgi/VXGINode.js';

export type VoxelGi = ReturnType<typeof vxgi>;
/** Three r187 expects coneAngle in degrees, not radians. */
export const VXGI_CONE_ANGLE_DEGREES = 40;
export const VXGI_CONE_COUNT = 3;

export function configureVoxelGi(gi: VoxelGi, strength: number, occlusion: number, distance: number) {
  gi.coneCount.value = VXGI_CONE_COUNT;
  gi.coneAngle.value = VXGI_CONE_ANGLE_DEGREES;
  gi.normalOffset.value = 1.5;
  gi.bounces = 1;
  gi.volume.stepScale.value = .75;
  gi.volume.layers.set(GI_GEOMETRY_LAYER);
  updateVoxelGi(gi, strength, occlusion, distance);
}

export function updateVoxelGi(gi: VoxelGi, strength: number, occlusion: number, distance: number) {
  gi.giIntensity.value = strength;
  gi.aoIntensity.value = occlusion;
  gi.aoDistance.value = distance;
}
