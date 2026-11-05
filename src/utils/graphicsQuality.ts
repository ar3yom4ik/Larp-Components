/** Conservative first-run hints only. A saved/user-selected preset always wins. */
export function preferLowGraphics(hints: { cores?: number; memoryGb?: number }): boolean {
  return (Number.isFinite(hints.memoryGb) && hints.memoryGb! > 0 && hints.memoryGb! <= 4) ||
    (Number.isFinite(hints.cores) && hints.cores! > 0 && hints.cores! <= 4);
}

/** Runtime-only resolution tiers: retain the requested value and recover gradually. */
export const ADAPTIVE_SCALE = [1, .85, .7, .6, .5] as const;
export function adaptivePixelRatio(requested: number, level: number): number {
  const index = Math.max(0, Math.min(ADAPTIVE_SCALE.length - 1, Math.trunc(level)));
  const minimum = Math.min(.5, requested); // never increase a user's sub-0.5 setting
  return Math.round(Math.max(minimum, requested * ADAPTIVE_SCALE[index]) * 100) / 100;
}
