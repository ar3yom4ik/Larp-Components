import * as THREE from 'three';

/** WebGL triplanar world-space projection for tileable PBR textures. The vertex
 * position is already skinned/morphed at this point; no UV attribute is needed. */
export function applyWorldProjection(shader: Parameters<THREE.Material['onBeforeCompile']>[0]) {
  shader.vertexShader = `varying vec3 larpWorldPosition;\nuniform float larpWorldScale;\n` + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <displacementmap_vertex>', `#ifdef USE_DISPLACEMENTMAP
    vec3 larpP = (modelMatrix * vec4(transformed, 1.0)).xyz * larpWorldScale;
    vec3 larpN = abs(normalize(mat3(modelMatrix) * objectNormal));
    vec3 larpW = pow(larpN, vec3(4.0)); larpW /= max(larpW.x + larpW.y + larpW.z, 0.0001);
    float larpHeight = texture2D(displacementMap, larpP.zy).x * larpW.x + texture2D(displacementMap, larpP.xz).x * larpW.y + texture2D(displacementMap, larpP.xy).x * larpW.z;
    transformed += normalize(objectNormal) * (larpHeight * displacementScale + displacementBias);
  #endif`);
  shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nlarpWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = `varying vec3 larpWorldPosition;
uniform float larpWorldScale;
vec3 larpWorldNormal() { return normalize(cross(dFdx(larpWorldPosition), dFdy(larpWorldPosition))); }
vec3 larpWeights() { vec3 w = pow(abs(larpWorldNormal()), vec3(4.0)); return w / max(w.x + w.y + w.z, 0.0001); }
vec4 larpSample(sampler2D tex) {
  vec3 p = larpWorldPosition * larpWorldScale, w = larpWeights();
  return texture2D(tex, p.zy) * w.x + texture2D(tex, p.xz) * w.y + texture2D(tex, p.xy) * w.z;
}
` + shader.fragmentShader;
  for (const [slot, uv] of [['map','vMapUv'], ['roughnessMap','vRoughnessMapUv'], ['metalnessMap','vMetalnessMapUv'], ['emissiveMap','vEmissiveMapUv'], ['alphaMap','vAlphaMapUv']] as const) {
    shader.fragmentShader = shader.fragmentShader.split(`texture2D( ${slot}, ${uv} )`).join(`larpSample( ${slot} )`);
  }
  shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', THREE.ShaderChunk.aomap_fragment.replace('texture2D( aoMap, vAoMapUv )', 'larpSample( aoMap )'));
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_NORMALMAP_OBJECTSPACE )
    vec3 p = larpWorldPosition * larpWorldScale, w = larpWeights(), n = larpWorldNormal();
    vec3 nx = texture2D(normalMap,p.zy).xyz * 2.0 - 1.0;
    vec3 ny = texture2D(normalMap,p.xz).xyz * 2.0 - 1.0;
    vec3 nz = texture2D(normalMap,p.xy).xyz * 2.0 - 1.0;
    nx.xy *= normalScale; ny.xy *= normalScale; nz.xy *= normalScale;
    vec3 worldN = normalize(vec3(nx.z * sign(n.x), nx.y, nx.x) * w.x + vec3(ny.x, ny.z * sign(n.y), ny.y) * w.y + vec3(nz.x, nz.y, nz.z * sign(n.z)) * w.z);
    normal = normalize(mat3(viewMatrix) * worldN);
  #elif defined( USE_BUMPMAP )
    normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
  #endif`);
  const bump = THREE.ShaderChunk.bumpmap_pars_fragment.replace(/vec2 dHdxy_fwd\(\) \{[\s\S]*?\n\t\}/, `vec2 dHdxy_fwd() {
    float h = bumpScale * larpSample(bumpMap).x;
    return vec2(dFdx(h), dFdy(h));
  }`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <bumpmap_pars_fragment>', bump);
}
