/**
 * Share the frame with rendering without starving simulation when the GPU is
 * slow. Previous versions cut the slice to 1.2 ms as frame time increased,
 * even if rendering (not simulation) was the slow part. Use a bounded fraction
 * of the non-simulation frame instead, and retain a minimum useful slice.
 */
export function simulationFrameBudget(frameMs: number, lastStepMs: number): number {
  const frame = Number.isFinite(frameMs) ? frameMs : 16;
  const simulation = Number.isFinite(lastStepMs) ? Math.max(0, lastStepMs) : 0;
  const renderMs = Math.max(16, frame - simulation);
  return Math.max(5, Math.min(40, renderMs * 0.35));
}

/** Observe at least six fixed steps at slow speeds to avoid a false 0x warning. */
export function simulationRateSampleMs(speed: number): number {
  const requested = Number.isFinite(speed) ? Math.max(.01, speed) : 1;
  return Math.min(10_000, Math.max(1000, 100 / requested));
}
