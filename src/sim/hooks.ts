import { useEffect, useState } from "react";
import { sim } from "./engine";

export interface SimSnapshot {
  time: number;
  placed: number;
  spawned: number;
  lost: number;
  pallets: number;
  throughput: number;
  boxes: number;
  running: boolean;
}

function read(): SimSnapshot {
  return {
    time: Math.floor(sim.time * 10) / 10,
    placed: sim.stats.placed,
    spawned: sim.stats.spawned,
    lost: sim.stats.lost,
    pallets: sim.stats.pallets,
    throughput: Math.round(sim.throughputPerMin() * 10) / 10,
    boxes: sim.boxes.length,
    running: sim.running,
  };
}

/** Low-frequency snapshot of the simulation so React never re-renders at frame rate. */
export function useSimSnapshot(intervalMs = 250): SimSnapshot {
  const [snap, setSnap] = useState<SimSnapshot>(read);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSnap((prev) => {
        const next = read();
        const same = (Object.keys(next) as (keyof SimSnapshot)[]).every((key) => next[key] === prev[key]);
        return same ? prev : next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return snap;
}

export function formatClock(total: number) {
  const seconds = Math.max(0, Math.floor(total));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
