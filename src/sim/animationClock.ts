import { useRef } from "react";
import { sim } from "./engine";

/**
 * Simulation seconds advanced since this component last rendered. Reading the
 * completed clock rather than requested speed keeps animations in sync with
 * robots and products when the device cannot meet the requested multiplier.
 */
export function useSimulationDelta(): () => number {
  const last = useRef({ time: sim.time, revision: sim.clockRevision });
  return () => {
    const time = sim.time, revision = sim.clockRevision;
    const delta = revision === last.current.revision ? Math.max(0, time - last.current.time) : 0;
    last.current = { time, revision };
    return delta;
  };
}
