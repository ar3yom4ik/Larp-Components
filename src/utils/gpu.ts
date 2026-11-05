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
  onFailure: (message: string) => void,
): Promise<THREE.WebGLRenderer | WebGPURenderer> {
  let renderer: WebGPURenderer | null = null;
  try {
    // R3F's defaults are WebGL-flavoured (e.g. powerPreference 'default'); WebGPU accepts the rest.
    // MSAA is off: the GI pre-pass copies a single-sample depth texture, which fails validation
    // when the canvas is multisampled. TRAA in the pipeline provides the anti-aliasing instead.
    renderer = new WebGPURenderer({ ...defaults, antialias: false, powerPreference: 'high-performance' } as WebGPURendererParameters);
    await renderer.init();
    // WebGPURenderer can itself silently choose a WebGL backend. VXGI needs
    // compute shaders and must never be reported as active on that backend.
    if (!(renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend) throw new Error('WebGPU backend unavailable');
    const reportLoss = renderer.onDeviceLost.bind(renderer);
    renderer.onDeviceLost = info => {
      if (info.reason === 'destroyed') return; // normal renderer teardown, not a failed device
      reportLoss(info); onFailure(info.message || 'WebGPU device lost');
    };
    renderer.onError = (info: unknown) => {
      const detail = typeof info === 'object' && info !== null && 'message' in info ? String(info.message) : String(info);
      console.warn('WebGPU error, switching to WebGL:', detail);
      onFailure(detail || 'WebGPU error');
    };
    return renderer;
  } catch (error) {
    renderer?.dispose();
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('WebGPU renderer unavailable, falling back to WebGL:', error);
    onFailure(detail);
    // A canvas that acquired a WebGPU context cannot reliably acquire WebGL.
    // R3F needs a temporary renderer while the failure callback remounts a fresh Canvas.
    return new THREE.WebGLRenderer({ ...defaults, canvas: document.createElement('canvas') } as THREE.WebGLRendererParameters);
  }
}

/** Narrow check used by components that only work with the WebGPU renderer. */
export function isWebGPURenderer(gl: unknown): gl is WebGPURenderer {
  const renderer = gl as { isWebGPURenderer?: boolean; backend?: { isWebGPUBackend?: boolean } } | null;
  return renderer?.isWebGPURenderer === true && renderer.backend?.isWebGPUBackend === true;
}
