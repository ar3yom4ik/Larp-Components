import { sim, type Box } from '../sim/engine';

type WireBox = Omit<Box, 'colorSignals'> & { colorSignals?: string[] };
interface Snapshot {
  time: number; clockRevision: number; running: boolean; speed: number;
  boxes: WireBox[]; stats: typeof sim.stats;
  robots: [string, {tip: typeof sim.robots extends Map<string, infer R> ? R extends {tip: infer T} ? T : never : never; joints: {waist:number; shoulder:number; elbow:number; wrist:number}; grip:number; status:string; busyT:number; cycles:number; lastCycle:number; heldId:number | null}][];
  humans: [string, {x:number;y:number;z:number;yaw:number;phase:number;walking:boolean;status:string;completed:number;heldId:number | null}][];
  machines: [string, {busy:boolean;progress:number;busyTime:number;cycles:number;remaining:number;partId:number | null}][];
  pallets: [string, {cursor:number;shipped:number}][];
  conveyors: [string, {active:boolean;speed:number;stopper:boolean}][];
  feeders: [string, {timer:number;supply:number;active:boolean}][];
  collectors: [string, {count:number;capacity:number}][];
  signalState: [string, boolean][]; signalActivations: [string, number][];
  poses: [string, NonNullable<ReturnType<typeof sim.getPhysicsPose>>][];
}

/** The host alone executes physics and robot scripts. Guests render these
 * snapshots and forward user actions to the host instead of simulating locally. */
export function captureSimulation(): Snapshot {
  return {
    time: sim.time, clockRevision: sim.clockRevision, running: sim.running, speed: sim.speed,
    boxes: sim.boxes.map(box => ({ ...box, colorSignals: box.colorSignals ? [...box.colorSignals] : undefined })),
    stats: { ...sim.stats, events: [...sim.stats.events] },
    robots: [...sim.robots].map(([id, r]) => [id, { tip: [...r.tip], joints: { ...r.joints }, grip:r.grip, status:r.status, busyT:r.busyT, cycles:r.cycles, lastCycle:r.lastCycle, heldId:r.held?.id ?? null }]),
    humans: [...sim.humans].map(([id, h]) => [id, {x:h.x,y:h.y,z:h.z,yaw:h.yaw,phase:h.phase,walking:h.walking,status:h.status,completed:h.completed,heldId:h.held?.id ?? null}]),
    machines: [...sim.machines].map(([id, m]) => [id,{busy:m.busy,progress:m.progress,busyTime:m.busyTime,cycles:m.cycles,remaining:m.remaining,partId:m.part?.id ?? null}]),
    pallets: [...sim.pallets].map(([id, p]) => [id,{cursor:p.cursor,shipped:p.shipped}]),
    conveyors: [...sim.conveyors].map(([id,c]) => [id,{active:c.active,speed:c.speed,stopper:c.stopper}]),
    feeders: [...sim.feeders].map(([id,f]) => [id,{timer:f.timer,supply:f.supply,active:f.active}]),
    collectors: [...sim.collectors].map(([id,c]) => [id,{...c}]),
    signalState: [...sim.signalState], signalActivations: [...sim.signalActivations],
    poses: sim.items.flatMap(item => { const pose = sim.getPhysicsPose(item.id); return pose ? [[item.id,pose] as [string, typeof pose]] : []; }),
  };
}
export function applySimulation(input: unknown): {running:boolean; speed:number} | null {
  if (!input || typeof input !== 'object') return null;
  const state = input as Snapshot;
  if (!Array.isArray(state.boxes) || !Array.isArray(state.robots) || !Array.isArray(state.pallets) || !Number.isFinite(state.time)) return null;
  sim.time = state.time; sim.clockRevision = state.clockRevision; sim.running = !!state.running; sim.speed = state.speed;
  const previous = new Map(sim.boxes.map(box => [box.id, box]));
  sim.boxes = state.boxes.map(wire => {
    const box = previous.get(wire.id) ?? {} as Box;
    Object.assign(box, wire, {colorSignals: wire.colorSignals ? new Set(wire.colorSignals) : undefined}); return box;
  });
  const boxes = new Map(sim.boxes.map(box => [box.id, box]));
  sim.stats = state.stats;
  for (const [id, {heldId, ...data}] of state.robots) { const r = sim.robots.get(id); if (r) { Object.assign(r, data); r.held = boxes.get(heldId ?? -1) ?? null; } }
  for (const [id, {heldId, ...data}] of state.humans || []) { const h = sim.humans.get(id); if (h) { Object.assign(h, data); h.held = boxes.get(heldId ?? -1) ?? null; } }
  for (const [id, {partId, ...data}] of state.machines || []) { const m = sim.machines.get(id); if (m) { Object.assign(m, data); m.part = boxes.get(partId ?? -1) ?? null; } }
  for (const [id, data] of state.pallets) { const p = sim.pallets.get(id); if (p) Object.assign(p, data); }
  for (const [id, data] of state.conveyors || []) { const c = sim.conveyors.get(id); if (c) Object.assign(c, data); }
  for (const [id, data] of state.feeders || []) { const f = sim.feeders.get(id); if (f) Object.assign(f, data); }
  for (const [id, data] of state.collectors || []) { const c = sim.collectors.get(id); if (c) Object.assign(c, data); }
  sim.signalState = new Map(state.signalState || []); sim.signalActivations = new Map(state.signalActivations || []);
  sim.networkPoses = new Map(state.poses || []);
  return {running:sim.running, speed:sim.speed};
}
