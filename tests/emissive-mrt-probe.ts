// Browser fixture: exercise the same Three.js node MRT/bloom pipeline as VXGI,
// using its WebGL backend so CI can verify shader output without WebGPU hardware.
import {
  Color, DirectionalLight, Mesh, MeshBasicNodeMaterial, MeshStandardNodeMaterial,
  OrthographicCamera, PlaneGeometry, RenderPipeline, Scene, WebGPURenderer,
} from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { createEmissiveMRT } from '../src/components/emissiveMrt';

export async function createProbe() {
  const renderer = new WebGPURenderer({ forceWebGL: true, antialias: false });
  renderer.setSize(128, 128);
  document.body.append(renderer.domElement);
  await renderer.init();

  const scene = new Scene();
  scene.background = new Color('white');
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 4;
  const material = new MeshStandardNodeMaterial({ color: 0xffffff, emissive: 0xff0000, emissiveIntensity: .6, roughness: .1 });
  const object = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(object);
  const light = new DirectionalLight(0xffffff, 4);
  light.position.z = 3;
  scene.add(light);
  const cover = new Mesh(new PlaneGeometry(1.2, 1.2), new MeshBasicNodeMaterial({ color: 0, opacity: .5, transparent: true, depthWrite: false }));
  cover.position.z = 1;
  cover.visible = false;
  scene.add(cover);

  const scenePass = pass(scene, camera);
  scenePass.setMRT(createEmissiveMRT());
  const pipeline = new RenderPipeline(renderer);
  pipeline.outputNode = scenePass.getTextureNode('emissive');
  pipeline.needsUpdate = true;

  const sample = async () => {
    // PassNode updates once per frame; let the browser advance between changes.
    await new Promise(resolve => setTimeout(resolve, 120));
    pipeline.render();
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(renderer.domElement, 0, 0);
    return {
      center: Array.from(context.getImageData(64, 64, 1, 1).data),
      corner: Array.from(context.getImageData(8, 8, 1, 1).data),
      halo: Array.from(context.getImageData(99, 64, 1, 1).data),
    };
  };

  return { renderer, scene, scenePass, pipeline, material, cover, sample, bloom };
}
