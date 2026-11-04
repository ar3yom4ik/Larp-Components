import { emissive, mrt, output, vec4 } from 'three/tsl';

/** A separate emissive-only WebGPU attachment, with the scene's alpha/blending. */
export function createEmissiveMRT() {
  const targets = mrt({ output, emissive: vec4(emissive, output.a) });
  // Without an explicit clear color, a bright scene background also blooms.
  targets.setClearColor('emissive', 0x000000, 0);
  // Transparent geometry must attenuate emission behind it instead of replacing it.
  targets.setBlendMode('emissive', targets.getBlendMode('output'));
  return targets;
}
