import { useSyncExternalStore } from 'react';

export type SkinId = 'larp' | 'vc' | 'rpro';
/** `max` uses WebGPU voxel GI (VXGI) + TRAA when available, otherwise the WebGL approximation. */
export type GraphicsQuality = 'standard' | 'enhanced' | 'max';
export interface GraphicsSettings {
  preset: GraphicsQuality;
  exposure: number; ambient: number; sun: number; fill: number; env: number;
  shadows: boolean; shadowSize: 1024 | 2048 | 4096; shadowStrength: number; softShadows: boolean;
  sunAzimuth: number; sunElevation: number; toneMapping: 'neutral' | 'aces' | 'linear';
  pixelRatio: number; adaptive: boolean; fog: boolean; fogFar: number; grid: boolean;
  productBoost: number; background: string; useSkinBackground: boolean;
  contactShadows: boolean; contactOpacity: number;
  ao: boolean; aoIntensity: number; aoRadius: number; bounce: number;
}
export interface BuildingSettings { width: number; depth: number; height: number; walls: boolean; roof: boolean; lights: boolean; floorColor: string; wallColor: string }
export interface Appearance { skin: SkinId; graphics: GraphicsQuality; gfx: GraphicsSettings; building: BuildingSettings }

export const SKINS: Record<SkinId, { name: string; appName: string; accent: string; note: string }> = {
  larp: { name: 'Larp UI', appName: 'Larp Components 5.1', accent: '#2a8be0', note: 'Default balanced studio theme' },
  vc: { name: 'Visual Components', appName: 'Visual Components-inspired 5.1', accent: '#f5a623', note: 'Industrial ribbon workspace, independently developed' },
  rpro: { name: 'R-pro', appName: 'R-pro 5.1', accent: '#d83a45', note: 'Dark graphite with red robot-programming accents' },
};

export const defaultGfx = (preset: GraphicsQuality): GraphicsSettings => {
  const common: GraphicsSettings = {
    preset, exposure: 1, ambient: 0.32, sun: 2.5, fill: 0.28, env: 0.5,
    shadows: true, shadowSize: 2048, shadowStrength: 1, softShadows: true,
    sunAzimuth: 230, sunElevation: 45, toneMapping: 'neutral',
    pixelRatio: 1.25, adaptive: false, fog: true, fogFar: 160, grid: true,
    productBoost: 0.15, background: '#e3e6e9', useSkinBackground: true,
    contactShadows: true, contactOpacity: 0.50,
    ao: false, aoIntensity: 1.0, aoRadius: 0.55, bounce: 0,
  };
  if (preset === 'enhanced') return { ...common, exposure: 1.02, shadowSize: 2048, pixelRatio: 1.25, env: 0.55, bounce: 0.3, contactOpacity: 0.55, ao: true, aoIntensity: 0.8, aoRadius: 0.42 };
  // Max: WebGPU voxel cone-traced GI (r187 VXGI) with TRAA. The WebGL fallback is an
  // explicit approximation (bounce lights + screen-space GTAO + contact shadows), not path tracing.
  if (preset === 'max') return { ...common, exposure: 1.0, ambient: 0.22, sun: 2.5, fill: 0.22, shadowSize: 2048, pixelRatio: 1.25, env: 0.35, bounce: 0.65, contactOpacity: 0.7, ao: true, aoIntensity: 1.5, aoRadius: 0.8 };
  return common;
};
const defaults: Appearance = {
  skin: 'larp', graphics: 'standard', gfx: defaultGfx('standard'),
  building: { width: 28, depth: 20, height: 7, walls: true, roof: true, lights: true, floorColor: '#e4e7e9', wallColor: '#d5dbe0' },
};
let state: Appearance = defaults;
try {
  const saved = JSON.parse(localStorage.getItem('larp-appearance') || 'null');
  if (saved) {
    // 'gi' was the previous name of the max preset.
    const stored = saved.graphics === 'gi' ? 'max' : saved.graphics;
    const quality: GraphicsQuality = ['standard', 'enhanced', 'max'].includes(stored) ? stored : 'standard';
    // Revision 3 retuned the max preset (WebGPU VXGI). Earlier saved graphics values are
    // reset once; settings saved from revision 3 onward survive subsequent loads.
    const gfx = saved.graphicsRevision === 3 ? { ...defaultGfx(quality), ...(saved.gfx || {}) } : defaultGfx(quality);
    state = { ...defaults, ...saved, graphics: quality, gfx, building: { ...defaults.building, ...(saved.building || {}) } };
  }
} catch { /* preferences are optional */ }
const listeners = new Set<() => void>();
const emit = () => {
  try {
    if (typeof document !== 'undefined') document.documentElement.dataset.skin = state.skin;
    localStorage.setItem('larp-appearance', JSON.stringify({ ...state, graphicsRevision: 3 }));
    localStorage.setItem('larp-graphics', state.graphics);
    localStorage.setItem('larp-building', JSON.stringify(state.building));
  } catch { /* storage can be unavailable in private browsing */ }
  listeners.forEach((fn) => fn());
};
if (typeof document !== 'undefined') document.documentElement.dataset.skin = state.skin;
export function setAppearance(patch: Partial<Appearance>) {
  const next = { ...state, ...patch, building: { ...state.building, ...(patch.building || {}) } };
  if (patch.graphics && !patch.gfx) next.gfx = defaultGfx(patch.graphics);
  state = next; emit();
}
export function setGfx(patch: Partial<GraphicsSettings>) { state = { ...state, gfx: { ...state.gfx, ...patch } }; emit(); }
export function setSkin(skin: SkinId) { setAppearance({ skin }); }
export function setBuilding(building: Partial<BuildingSettings>) { setAppearance({ building: { ...state.building, ...building } }); }
export function getAppearance() { return state; }
export function useAppearance() { return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getAppearance); }
export function appName() { return SKINS[state.skin].appName; }

// Test-only access to the same reactive store used by the UI.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __larpTheme: { setGfx: typeof setGfx; setBuilding: typeof setBuilding; setAppearance: typeof setAppearance; getAppearance: typeof getAppearance } }).__larpTheme = { setGfx, setBuilding, setAppearance, getAppearance };
}
