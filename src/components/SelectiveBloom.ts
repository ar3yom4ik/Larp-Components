import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

type EmissiveMaterial = THREE.Material & {
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  emissiveMap?: THREE.Texture | null;
};
type TexturedMaterial = THREE.Material & { map?: THREE.Texture | null; alphaMap?: THREE.Texture | null };

/**
 * Render a black depth mask with only real emissive materials in color. Bright
 * environment reflections are deliberately excluded; they must not generate a
 * blinding halo. Material swaps are restored even if rendering fails.
 */
export class EmissiveMask {
  private masks = new WeakMap<THREE.Material, THREE.MeshBasicMaterial>();
  private maskMaterials = new Set<THREE.MeshBasicMaterial>();
  private saved: { object: THREE.Mesh | THREE.Line | THREE.Points; material: THREE.Material | THREE.Material[] }[] = [];
  private background: THREE.Scene["background"] = null;
  private clearColor = new THREE.Color();

  private emissiveOnly(source: THREE.Material): THREE.MeshBasicMaterial {
    const glowing = source as EmissiveMaterial;
    const intensity = glowing.emissiveIntensity ?? 1;
    const emissive = !!glowing.emissive && intensity > 0 && glowing.emissive.getHex() !== 0;
    let material = this.masks.get(source);
    if (material && material.userData.emissiveMask !== emissive) {
      material.dispose();
      this.maskMaterials.delete(material);
      material = undefined;
    }
    if (!material) {
      material = new THREE.MeshBasicMaterial({ toneMapped: false });
      material.userData.emissiveMask = emissive;
      this.masks.set(source, material);
      this.maskMaterials.add(material);
    }
    // Editors can mutate a material in place. Keep the cached mask in sync so
    // changing color, opacity, maps or render flags takes effect immediately.
    const map = emissive ? glowing.emissiveMap ?? null : (source as TexturedMaterial).map ?? null;
    const alphaMap = (source as TexturedMaterial).alphaMap ?? null;
    if (material.map !== map || material.alphaMap !== alphaMap || material.side !== source.side || material.transparent !== source.transparent) {
      material.map = map;
      material.alphaMap = alphaMap;
      material.side = source.side;
      material.transparent = source.transparent;
      material.needsUpdate = true;
    }
    if (emissive) material.color.copy(glowing.emissive!).multiplyScalar(intensity);
    else material.color.setRGB(0,0,0);
    material.visible = source.visible;
    material.opacity = source.opacity;
    material.alphaTest = source.alphaTest;
    material.depthTest = source.depthTest;
    material.depthWrite = source.depthWrite;
    // Black opaque geometry must overwrite emitters rendered earlier; a
    // translucent surface darkens the emission behind it in proportion to alpha.
    material.colorWrite = source.colorWrite;
    return material;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, render: () => void) {
    this.saved.length = 0;
    this.background = scene.background;
    scene.background = null;
    scene.traverseVisible((object) => {
      const drawable = object as THREE.Mesh | THREE.Line | THREE.Points;
      if (!("material" in drawable) || !drawable.material) return;
      const original = drawable.material;
      this.saved.push({ object: drawable, material: original });
      drawable.material = Array.isArray(original) ? original.map(material => this.emissiveOnly(material)) : this.emissiveOnly(original);
    });
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    try {
      renderer.setClearColor(0x000000,0);
      render();
    } finally {
      for (const entry of this.saved) entry.object.material = entry.material;
      scene.background = this.background;
      renderer.setClearColor(this.clearColor,alpha);
      this.saved.length = 0;
    }
  }

  dispose() {
    for (const material of this.maskMaterials) material.dispose();
    this.maskMaterials.clear();
    this.masks = new WeakMap();
  }
}

/** Separate emissive-only render, blurred and added to the normal scene. */
export class SelectiveBloom {
  readonly bloom: UnrealBloomPass;
  readonly composite: ShaderPass;
  private readonly composer: EffectComposer;
  private readonly mask = new EmissiveMask();
  private readonly renderPass: RenderPass;

  constructor(private renderer:THREE.WebGLRenderer, private scene:THREE.Scene, camera:THREE.Camera, width:number, height:number, strength:number) {
    this.composer = new EffectComposer(renderer);
    this.composer.renderToScreen = false;
    this.renderPass = new RenderPass(scene,camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width,height),strength,.35,.2);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composite = new ShaderPass({
      uniforms: { tDiffuse:{value:null}, bloomTexture:{value:null} },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){vec4 base=texture2D(tDiffuse,vUv); gl_FragColor=vec4(base.rgb+texture2D(bloomTexture,vUv).rgb,base.a);}`,
    });
    // ShaderPass clones shader uniforms, including textures; the composite must
    // sample the actual render target rather than that detached clone.
    this.composite.uniforms.bloomTexture.value = this.bloom.renderTargetsHorizontal[0].texture;
  }

  resize(width:number,height:number,pixelRatio:number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width,height);
  }

  render(delta:number) {
    this.composite.enabled = this.bloom.strength > 0;
    if (this.composite.enabled) this.mask.render(this.renderer,this.scene,()=>this.composer.render(delta));
  }

  dispose() {
    this.mask.dispose();
    this.renderPass.dispose();
    this.bloom.dispose();
    this.composite.dispose();
    this.composer.dispose();
  }
}
