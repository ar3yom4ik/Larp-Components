import { useSyncExternalStore } from 'react';

export type SkinId = 'larp' | 'vc' | 'rpro' | 'custom';
/** Named presets. `standard`, `enhanced` and `max` keep their earlier meaning. */
export type GraphicsQuality = 'low' | 'standard' | 'enhanced' | 'max';
/** Antialiasing mode. `fxaa` runs a post-process pass instead of multisampling. */
export type AntialiasMode = 'off' | 'fxaa' | 'msaa';
export const ANTIALIAS_MODES: AntialiasMode[] = ['off', 'fxaa', 'msaa'];
/** 3D render scale presets. Values below 1 render fewer pixels than the screen has. */
export const RESOLUTION_STEPS = [0.5, 0.65, 0.75, 0.9, 1, 1.25, 1.5, 2];
/**
 * Global illumination mode, shown in the settings as Off / Ambient occlusion / Approximate / VXGI.
 * `vxgi` needs WebGPU and falls back to `approx` when the browser cannot start WebGPU.
 */
export type GiMode = 'off' | 'ao' | 'approx' | 'vxgi';
export type ToneMapping = 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces' | 'agx' | 'neutral';
export const TONE_MAPPINGS: ToneMapping[] = ['none', 'linear', 'reinhard', 'cineon', 'aces', 'agx', 'neutral'];
export const GI_MODES: GiMode[] = ['off', 'ao', 'approx', 'vxgi'];
export const QUALITY_PRESETS: GraphicsQuality[] = ['low', 'standard', 'enhanced', 'max'];

export interface GraphicsSettings {
  preset: GraphicsQuality;
  exposure: number; ambient: number; sun: number; fill: number; env: number;
  shadows: boolean; shadowSize: 1024 | 2048 | 4096; shadowStrength: number; softShadows: boolean;
  sunAzimuth: number; sunElevation: number; toneMapping: ToneMapping;
  pixelRatio: number; adaptive: boolean; fog: boolean; fogFar: number; grid: boolean;
  productBoost: number; background: string; useSkinBackground: boolean;
  contactShadows: boolean; contactOpacity: number;
  gi: GiMode; aoIntensity: number; aoRadius: number; bounce: number;
  showFps: boolean; antialias: AntialiasMode;
}
export interface BuildingSettings { width: number; depth: number; height: number; walls: boolean; roof: boolean; lights: boolean; floorColor: string; wallColor: string }

/** Every chrome surface of the "Custom" skin. All values are #rrggbb. */
export interface ColorScheme {
  accent: string; appBg: string; panelBg: string; ribbonBg: string; tabBg: string;
  titleBg: string; dockBg: string; viewportBg: string; statusBg: string; chromeText: string; border: string;
}
export const DEFAULT_SCHEME: ColorScheme = {
  accent: '#4aa3e8', appBg: '#1b1d21', panelBg: '#262a30', ribbonBg: '#2f343b',
  tabBg: '#22252a', titleBg: '#1f2226', dockBg: '#202329', viewportBg: '#dfe4e8',
  statusBg: '#2f6f9e', chromeText: '#e8ecf1', border: '#ffffff1f',
};
export const SCHEME_FIELDS: { key: keyof ColorScheme; label: string }[] = [
  { key: 'accent', label: 'Accent' },
  { key: 'appBg', label: 'Window background' },
  { key: 'titleBg', label: 'Title bar' },
  { key: 'tabBg', label: 'Tab bar' },
  { key: 'ribbonBg', label: 'Ribbon' },
  { key: 'panelBg', label: 'Panels' },
  { key: 'dockBg', label: 'Bottom dock' },
  { key: 'viewportBg', label: '3D viewport' },
  { key: 'statusBg', label: 'Status bar' },
  { key: 'chromeText', label: 'Chrome text' },
];

export interface Appearance {
  skin: SkinId; graphics: GraphicsQuality; gfx: GraphicsSettings; building: BuildingSettings;
  /** Custom UI accent colour (#rrggbb). Undefined means the skin's own accent. */
  accent?: string;
  /** Only used by the `custom` skin; falls back to DEFAULT_SCHEME. */
  scheme: ColorScheme;
}

export const SKINS: Record<SkinId, { name: string; appName: string; accent: string; note: string }> = {
  larp: { name: 'Larp UI', appName: 'Larp Components 5.1', accent: '#2a8be0', note: 'Default balanced studio layout' },
  vc: { name: 'Visual Components', appName: 'Visual Components-inspired 5.1', accent: '#f5a623', note: 'Industrial ribbon layout, independently developed' },
  rpro: { name: 'R-pro', appName: 'R-pro 5.1', accent: '#d83a45', note: 'Dark graphite layout with robot-programming accents' },
  custom: { name: 'Custom', appName: 'Larp Components 5.1', accent: DEFAULT_SCHEME.accent, note: 'Fully customizable colour scheme' },
};

export const defaultGfx = (preset: GraphicsQuality): GraphicsSettings => {
  const common: GraphicsSettings = {
    preset, exposure: 1, ambient: 0.32, sun: 2.5, fill: 0.28, env: 0.5,
    shadows: true, shadowSize: 2048, shadowStrength: 1, softShadows: true,
    sunAzimuth: 230, sunElevation: 45, toneMapping: 'neutral',
    pixelRatio: 1.25, adaptive: false, fog: true, fogFar: 160, grid: true,
    productBoost: 0.15, background: '#e3e6e9', useSkinBackground: true,
    contactShadows: true, contactOpacity: 0.50,
    gi: 'off', aoIntensity: 1.0, aoRadius: 0.55, bounce: 0, showFps: false, antialias: 'msaa',
  };
  if (preset === 'low') return { ...common, shadowSize: 1024, softShadows: false, contactShadows: false, pixelRatio: 1, fog: false, toneMapping: 'linear', adaptive: true, antialias: 'fxaa' };
  if (preset === 'enhanced') return { ...common, exposure: 1.02, shadowSize: 2048, pixelRatio: 1.25, env: 0.55, gi: 'approx', bounce: 0.3, contactOpacity: 0.55, aoIntensity: 0.8, aoRadius: 0.42 };
  // Max: WebGPU voxel cone-traced GI (r187 VXGI) with TRAA. The WebGL fallback is an
  // explicit approximation (bounce lights + screen-space GTAO + contact shadows), not path tracing.
  if (preset === 'max') return { ...common, exposure: 1.0, ambient: 0.22, sun: 2.5, fill: 0.22, shadowSize: 2048, pixelRatio: 1.25, env: 0.35, gi: 'vxgi', bounce: 0.65, contactOpacity: 0.7, aoIntensity: 1.5, aoRadius: 0.8 };
  return common;
};

const defaults: Appearance = {
  skin: 'larp', graphics: 'standard', gfx: defaultGfx('standard'), scheme: { ...DEFAULT_SCHEME },
  building: { width: 28, depth: 20, height: 7, walls: true, roof: true, lights: true, floorColor: '#e4e7e9', wallColor: '#d5dbe0' },
};

const HEX = /^#[0-9a-f]{6}$/i;
/** Keeps only valid #rrggbb values, so an imported or old save cannot inject CSS. */
export function sanitizeScheme(saved: unknown): ColorScheme {
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_SCHEME };
  const out = { ...DEFAULT_SCHEME };
  for (const field of SCHEME_FIELDS) {
    const value = (saved as Record<string, unknown>)[field.key];
    if (typeof value === 'string' && HEX.test(value)) out[field.key] = value.toLowerCase();
  }
  return out;
}

/** Fills in fields that older saves do not have and rejects values that are no longer valid. */
export function sanitizeGfx(quality: GraphicsQuality, saved: Partial<Record<string, unknown>> | null | undefined): GraphicsSettings {
  const base = defaultGfx(quality);
  const raw = { ...base, ...(saved || {}) } as GraphicsSettings & { ao?: boolean };
  if (!(saved && 'gi' in saved)) {
    // Revision 3 and older stored `ao` + `bounce` instead of a GI mode.
    raw.gi = quality === 'max' ? 'vxgi' : raw.ao ? 'approx' : 'off';
  }
  delete raw.ao;
  if (!GI_MODES.includes(raw.gi)) raw.gi = base.gi;
  if (!TONE_MAPPINGS.includes(raw.toneMapping)) raw.toneMapping = base.toneMapping;
  if (!ANTIALIAS_MODES.includes(raw.antialias)) raw.antialias = base.antialias;
  if (!Number.isFinite(raw.pixelRatio) || raw.pixelRatio <= 0) raw.pixelRatio = base.pixelRatio;
  raw.pixelRatio = Math.max(0.35, Math.min(3, raw.pixelRatio));
  return { ...raw, preset: quality };
}

let state: Appearance = defaults;
try {
  const saved = JSON.parse(localStorage.getItem('larp-appearance') || 'null');
  if (saved) {
    // 'gi' was the previous name of the max preset.
    const stored = saved.graphics === 'gi' ? 'max' : saved.graphics;
    const quality: GraphicsQuality = QUALITY_PRESETS.includes(stored) ? stored : 'standard';
    state = {
      ...defaults, ...saved, graphics: quality,
      gfx: sanitizeGfx(quality, saved.gfx),
      building: { ...defaults.building, ...(saved.building || {}) },
      scheme: sanitizeScheme(saved.scheme),
      accent: typeof saved.accent === 'string' && HEX.test(saved.accent) ? saved.accent : undefined,
    };
    if (!(state.skin in SKINS)) state.skin = defaults.skin;
  }
} catch { /* preferences are optional */ }

// ---- colour helpers for the accent customisation ----
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: number, amount: number): string {
  const rgb = hexToRgb(hex).map((c) => Math.round(c + (target - c) * amount));
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
export const lighten = (hex: string, amount: number) => mix(hex, 255, amount);
export const darken = (hex: string, amount: number) => mix(hex, 0, amount);

// Variables written by the previous applyDocument call; they are removed before the
// next one so switching back to a built-in skin restores that skin's stylesheet values.
let appliedVars: string[] = [];

/** The colour scheme in effect: the user's scheme on the custom skin, otherwise the skin's. */
export function activeScheme(appearance: Appearance = state): ColorScheme {
  return appearance.skin === 'custom' ? sanitizeScheme(appearance.scheme) : { ...DEFAULT_SCHEME };
}

function applyDocument() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.skin = state.skin;
  const vars: Record<string, string> = {};
  if (state.skin === 'custom') {
    const s = activeScheme(state);
    Object.assign(vars, {
      '--app-bg': s.appBg,
      '--title-bg': s.titleBg,
      '--tab-bg': s.tabBg,
      '--ribbon-bg': s.ribbonBg,
      '--panel-bg': s.panelBg,
      '--panel-head': lighten(s.panelBg, 0.07),
      '--dock-bg': s.dockBg,
      '--menu-bg': s.panelBg,
      '--viewport-bg': s.viewportBg,
      '--status-bg': s.statusBg,
      '--status-text': '#ffffff',
      '--chrome-text': s.chromeText,
      '--panel-title': s.chromeText,
      '--border': s.border,
      '--file-bg': darken(s.ribbonBg, 0.12),
      '--file-hover': lighten(s.ribbonBg, 0.12),
    });
  }
  // A custom accent overrides the skin accent. On the custom skin the scheme owns it.
  const accent = state.skin === 'custom'
    ? activeScheme(state).accent
    : state.accent;
  if (accent) {
    Object.assign(vars, {
      '--app-accent': accent,
      '--app-accent-bright': lighten(accent, 0.35),
      '--app-accent-deep': darken(accent, 0.3),
      '--app-accent-soft': `${accent}24`,
      // Selection highlights follow the accent on the custom skin, so the whole
      // interface really is one colour scheme.
      ...(state.skin === 'custom' ? { '--teal': lighten(accent, 0.2), '--sel': lighten(accent, 0.45) } : {}),
    });
  }
  const next = Object.keys(vars);
  appliedVars.forEach((name) => { if (!next.includes(name)) root.style.removeProperty(name); });
  next.forEach((name) => root.style.setProperty(name, vars[name]));
  appliedVars = next;
}

const listeners = new Set<() => void>();
const emit = () => {
  try {
    applyDocument();
    localStorage.setItem('larp-appearance', JSON.stringify({ ...state, graphicsRevision: 4 }));
    localStorage.setItem('larp-graphics', state.graphics);
    localStorage.setItem('larp-building', JSON.stringify(state.building));
  } catch { /* storage can be unavailable in private browsing */ }
  listeners.forEach((fn) => fn());
};
applyDocument();

export function setAppearance(patch: Partial<Appearance>) {
  const next = { ...state, ...patch, building: { ...state.building, ...(patch.building || {}) } };
  if (patch.graphics && !patch.gfx) next.gfx = defaultGfx(patch.graphics);
  state = next; emit();
}
export function setGfx(patch: Partial<GraphicsSettings>) { state = { ...state, gfx: { ...state.gfx, ...patch } }; emit(); }
export function setSkin(skin: SkinId) { setAppearance({ skin }); }
export function setAccent(accent: string | undefined) { setAppearance({ accent }); }
/** Updates one colour of the custom scheme (the custom skin only). */
export function setScheme(patch: Partial<ColorScheme>) {
  state = { ...state, scheme: sanitizeScheme({ ...state.scheme, ...patch }) };
  emit();
}
export function resetScheme() { state = { ...state, scheme: { ...DEFAULT_SCHEME } }; emit(); }
export function setBuilding(building: Partial<BuildingSettings>) { setAppearance({ building: { ...state.building, ...building } }); }
/** Preset applied to the individual graphics parameters (the user can change them afterwards). */
export function applyPreset(graphics: GraphicsQuality) { setAppearance({ graphics, gfx: defaultGfx(graphics) }); }
/** True once any parameter differs from its preset, so the UI can show "Custom". */
export function isCustomGraphics(appearance: Appearance = state): boolean {
  const base = defaultGfx(appearance.graphics);
  return (Object.keys(base) as (keyof GraphicsSettings)[]).some((key) => key !== 'preset' && appearance.gfx[key] !== base[key]);
}
export function getAppearance() { return state; }
export function useAppearance() { return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getAppearance, getAppearance); }
export function appName() { return SKINS[state.skin].appName; }

// Test-only access to the same reactive store used by the UI.
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __larpTheme: Record<string, unknown> }).__larpTheme = { setGfx, setBuilding, setAppearance, getAppearance, applyPreset, setScheme, setSkin, setAccent };
}
