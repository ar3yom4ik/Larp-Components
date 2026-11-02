import { getAppearance, sanitizeGfx, sanitizeScheme, setAppearance, SKINS, QUALITY_PRESETS, type ColorScheme, type GraphicsQuality, type SkinId } from '../theme';
import { allBindings, importBindings } from '../keybinds';

export const SETTINGS_FORMAT = 'larp-settings';
export const SETTINGS_VERSION = 1;

export interface SettingsFile {
  format: typeof SETTINGS_FORMAT;
  version: number;
  exportedAt: string;
  appearance: {
    skin: SkinId;
    graphics: GraphicsQuality;
    gfx: Record<string, unknown>;
    accent: string | null;
    scheme: ColorScheme;
  };
  keybinds: Record<string, string>;
  language: 'en' | 'ru';
}

/** Snapshot of everything a user tunes in settings: graphics, UI style, accent colour, keybinds and language. */
export function buildSettingsFile(language: 'en' | 'ru'): SettingsFile {
  const appearance = getAppearance();
  return {
    format: SETTINGS_FORMAT,
    version: SETTINGS_VERSION,
    exportedAt: new Date().toISOString(),
    appearance: { skin: appearance.skin, graphics: appearance.graphics, gfx: { ...appearance.gfx }, accent: appearance.accent ?? null, scheme: { ...appearance.scheme } },
    keybinds: allBindings(),
    language,
  };
}

export type ImportResult = { ok: true; keybinds: number } | { ok: false; error: string };

/** Validates a parsed settings file and applies it. Invalid files are rejected without changing anything. */
export function applySettingsFile(input: unknown): ImportResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Not a settings file.' };
  const file = input as Partial<SettingsFile>;
  if (file.format !== SETTINGS_FORMAT) return { ok: false, error: 'This file is not a Larp Components settings export.' };
  if (typeof file.version !== 'number' || file.version > SETTINGS_VERSION) return { ok: false, error: 'This settings file was made by a newer version.' };
  const appearance = file.appearance;
  if (!appearance || typeof appearance !== 'object') return { ok: false, error: 'The settings file has no appearance section.' };
  const graphics = QUALITY_PRESETS.includes(appearance.graphics as GraphicsQuality) ? (appearance.graphics as GraphicsQuality) : 'standard';
  const skin = Object.keys(SKINS).includes(appearance.skin as string) ? (appearance.skin as SkinId) : 'larp';
  const accent = typeof appearance.accent === 'string' && /^#[0-9a-f]{6}$/i.test(appearance.accent) ? appearance.accent : undefined;
  setAppearance({ skin, graphics, gfx: sanitizeGfx(graphics, appearance.gfx as Record<string, unknown>), accent, scheme: sanitizeScheme(appearance.scheme) });
  const keybinds = file.keybinds ? importBindings(file.keybinds) : 0;
  return { ok: true, keybinds };
}
