import * as THREE from 'three';
import { WebGPURenderer, type WebGPURendererParameters } from 'three/webgpu';

/** The props React Three Fiber passes to a `gl` factory (its DefaultGLProps: canvas plus WebGL renderer options). */
export type GLFactoryProps = Record<string, unknown>;

type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } };

let probe: Promise<boolean> | null = null;

/** True when this browser can hand out a WebGPU adapter. Cached for the session. */
export function probeWebGPU(): Promise<boolean> {
  probe ??= (async () => {
    try {
      const gpu = (navigator as GpuNavigator).gpu;
      if (!gpu) return false;
      return (await gpu.requestAdapter()) !== null;
    } catch {
      return false;
    }
  })();
  return probe;
}

/**
 * React Three Fiber `gl` factory. Creates and initializes a WebGPURenderer; if that fails
 * it reports the failure and returns a WebGL renderer so the app keeps running.
 */
export async function createGpuRenderer(
  defaults: GLFactoryProps,
  onFailure: () => void,
): Promise<THREE.WebGLRenderer | WebGPURenderer> {
  try {
    // R3F's defaults are WebGL-flavoured (e.g. powerPreference 'default'); WebGPU accepts the rest.
    // MSAA is off: the GI pre-pass copies a single-sample depth texture, which fails validation
    // when the canvas is multisampled. TRAA in the pipeline provides the anti-aliasing instead.
    const renderer = new WebGPURenderer({ ...defaults, antialias: false, powerPreference: 'high-performance' } as WebGPURendererParameters);
    await renderer.init();
    return renderer;
  } catch (error) {
    console.warn('WebGPU renderer unavailable, falling back to WebGL:', error);
    onFailure();
    return new THREE.WebGLRenderer(defaults as THREE.WebGLRendererParameters);
  }
}

/** Narrow check used by components that only work with the WebGPU renderer. */
export function isWebGPURenderer(gl: unknown): gl is WebGPURenderer {
  return (gl as { isWebGPURenderer?: boolean } | null)?.isWebGPURenderer === true;
}
