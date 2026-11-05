import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import { sim } from '../sim/engine';

/** Contact shadow targets stay allocated across simulation ticks and are disposed on unmount. */
export function StableContactShadows({ width, height, opacity, running, sceneKey }: {
  width: number; height: number; opacity: number; running: boolean; sceneKey: unknown;
}) {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const invalidate = useThree(state => state.invalidate);
  const group = useRef<THREE.Group>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const dirty = useRef(true);
  const elapsed = useRef(0);
  const lastSimTime = useRef(sim.time);
  const resources = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(160, 160);
    const blurTarget = new THREE.WebGLRenderTarget(160, 160);
    target.texture.generateMipmaps = false; blurTarget.texture.generateMipmaps = false;
    const geometry = new THREE.PlaneGeometry(width, height).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(geometry);
    const depth = new THREE.MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( vec3( 0.0 ), 1.0 - fragCoordZ );');
    };
    const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
    const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
    horizontal.depthTest = vertical.depthTest = false;
    return { target, blurTarget, geometry, blurPlane, depth, horizontal, vertical };
  }, [width, height]);
  useEffect(() => () => {
    resources.target.dispose(); resources.blurTarget.dispose(); resources.geometry.dispose();
    resources.depth.dispose(); resources.horizontal.dispose(); resources.vertical.dispose();
  }, [resources]);
  useEffect(() => { dirty.current = true; invalidate(); }, [sceneKey, width, height, running, invalidate]);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (!running && lastSimTime.current !== sim.time) dirty.current = true;
    lastSimTime.current = sim.time;
    if (!group.current || !camera.current || (!dirty.current && (!running || elapsed.current < .25))) return;
    dirty.current = false; elapsed.current = 0;
    const oldBackground = scene.background, oldOverride = scene.overrideMaterial, oldTarget = gl.getRenderTarget();
    const wasVisible = group.current.visible;
    try {
      group.current.visible = false;
      scene.background = null;
      scene.overrideMaterial = resources.depth;
      gl.setRenderTarget(resources.target);
      gl.render(scene, camera.current);
      resources.blurPlane.material = resources.horizontal;
      resources.horizontal.uniforms.tDiffuse.value = resources.target.texture;
      resources.horizontal.uniforms.h.value = 1.5 / 256;
      gl.setRenderTarget(resources.blurTarget);
      gl.render(resources.blurPlane, camera.current);
      resources.blurPlane.material = resources.vertical;
      resources.vertical.uniforms.tDiffuse.value = resources.blurTarget.texture;
      resources.vertical.uniforms.v.value = 1.5 / 256;
      gl.setRenderTarget(resources.target);
      gl.render(resources.blurPlane, camera.current);
    } finally {
      gl.setRenderTarget(oldTarget);
      group.current.visible = wasVisible;
      scene.overrideMaterial = oldOverride;
      scene.background = oldBackground;
    }
  });
  return <group ref={group} rotation-x={Math.PI / 2} position={[0, .015, 0]}>
    <mesh geometry={resources.geometry} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <meshBasicMaterial transparent map={resources.target.texture} opacity={opacity} depthWrite={false} />
    </mesh>
    <orthographicCamera ref={camera} args={[-width / 2, width / 2, height / 2, -height / 2, 0, 5]} />
  </group>;
}
