import * as THREE from 'three';

/**
 * Recolours the worker's shirt without touching skin, trousers or boots.
 *
 * The bundled worker uses a small flat-colour palette texture. Instead of rebuilding
 * the texture (or tinting the whole body), the material's fragment shader finds the
 * warm, saturated, blue-free palette band that belongs to the clothing and replaces
 * just those pixels with the chosen shirt colour. Everything else keeps its texture,
 * which is why the face, hands and footwear stay correct for any shirt colour.
 */

const UNIFORM = 'larpShirtColor';
const MIX = 'larpShirtMix';

type ShirtMaterial = THREE.MeshStandardMaterial & {
  __larpShirtPatched?: boolean;
  __larpShirtUniforms?: { color: THREE.IUniform<THREE.Color>; mix: THREE.IUniform<number> };
};

const MASK = `
  {
    vec3 shirtSample = diffuseColor.rgb;
    float shirtMax = max(max(shirtSample.r, shirtSample.g), shirtSample.b);
    // Warm hue (red >= green > blue), bright, and no blue cast: the palette's
    // high-visibility yellow/orange clothing band, but never skin, denim or boots.
    float shirtMask = step(shirtSample.b, shirtSample.r * 0.30)
                    * step(shirtSample.b, shirtSample.g * 0.55)
                    * step(0.16, shirtMax)
                    * step(0.22, shirtSample.g);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${UNIFORM}, shirtMask * ${MIX});
  }
`;

/** Applies (or updates) the shirt recolouring on one material. */
export function applyShirtTint(material: THREE.Material | THREE.Material[], color: string | null | undefined, enabled = true) {
  const list = Array.isArray(material) ? material : [material];
  const target = color ? new THREE.Color(color) : null;
  for (const entry of list) {
    const m = entry as ShirtMaterial;
    if (!m.isMeshStandardMaterial) continue;
    if (!m.__larpShirtPatched) {
      const previous = m.onBeforeCompile.bind(m);
      m.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        const uniforms = m.__larpShirtUniforms;
        if (!uniforms) return;
        shader.uniforms[UNIFORM] = uniforms.color;
        shader.uniforms[MIX] = uniforms.mix;
        shader.fragmentShader = `uniform vec3 ${UNIFORM};\nuniform float ${MIX};\n${shader.fragmentShader}`;
        if (shader.fragmentShader.includes('#include <color_fragment>')) {
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${MASK}`);
        }
      };
      const cacheKey = m.customProgramCacheKey.bind(m);
      m.customProgramCacheKey = () => `${cacheKey()}|larp-shirt-v1`;
      m.__larpShirtUniforms = { color: { value: new THREE.Color('#f7b51e') }, mix: { value: 0 } };
      m.__larpShirtPatched = true;
      m.needsUpdate = true;
    }
    const uniforms = m.__larpShirtUniforms;
    if (!uniforms) continue;
    if (target) uniforms.color.value.copy(target);
    uniforms.mix.value = target && enabled ? 1 : 0;
  }
}

/** Default hi-visibility shirt when the worker has no colour of its own. */
export const DEFAULT_SHIRT_COLOR = '#f7b51e';
