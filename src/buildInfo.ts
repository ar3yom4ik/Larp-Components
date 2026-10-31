/**
 * Build identity, used by the settings window footer, the help screen and the
 * `Ctrl+Alt+J` shortcut that prints the version to the output panel.
 *
 * `__APP_VERSION__` and `__BUILD_TIME__` are injected by Vite (`define`), so the
 * single-file build and the dev server report the same values as `package.json`.
 * The fallbacks keep unit tests and any non-Vite consumer working.
 */
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_TIME__: string | undefined;

export const APP_NAME = 'Larp Components 5.1';

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';

const rawBuildTime: string = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

/** `2026-10-31 14:05 UTC`, or a dash when the bundle was built without the define. */
export function buildStamp(time: string = rawBuildTime): string {
  if (!time) return '—';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/** One-line description for the output panel and the settings footer. */
export function buildLine(extra: Record<string, string | number | undefined> = {}): string {
  const parts = [`${APP_NAME} ${APP_VERSION}`, `build ${buildStamp()}`];
  for (const [key, value] of Object.entries(extra)) if (value !== undefined && value !== '') parts.push(`${key} ${value}`);
  return parts.join(' · ');
}
