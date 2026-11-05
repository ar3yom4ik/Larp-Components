import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, CircleAlert, Package, Play, Repeat2, Settings2 } from "lucide-react";
import type { RobotProgram, SceneItem } from "../types";
import { MACHINE_KINDS } from "../data/products";
import { sim } from "../sim/engine";
import { programToCode } from "../sim/programCode";
import { PalletPattern } from "./PalletPattern";
import { t } from "../i18n";
import { cn } from "../utils/cn";

export function inferProgram(robot: SceneItem, items: SceneItem[]): RobotProgram {
  const dist = (x: number, z: number) => Math.hypot(x - robot.position[0], z - robot.position[2]);
  const conveyors = [...sim.conveyors.values()];
  const source = [...conveyors].sort((a, b) => { const p = a.pointAt(a.length), q = b.pointAt(b.length); return dist(p.x, p.z) - dist(q.x, q.z); })[0];
  const pallet = items.filter((i) => i.kind === "crates").sort((a, b) => dist(a.position[0], a.position[2]) - dist(b.position[0], b.position[2]))[0];
  return robot.program ?? { mode: "palletize", sourceId: source?.id ?? "", targetId: pallet?.id ?? "", repeat: true, delay: 0, clearance: 0.3, paintColor: "#d6534c" };
}


export function TaskBuilder({ robot, items, onUpdate }: { robot: SceneItem; items: SceneItem[]; onUpdate: (id: string, patch: Partial<SceneItem>, record?: boolean) => void }) {
  const [draft, setDraft] = useState<RobotProgram>(() => inferProgram(robot, items));
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setDraft(inferProgram(robot, items)), [robot.id, robot.program]);
  const set = (patch: Partial<RobotProgram>) => setDraft((cur) => ({ ...cur, ...patch }));
  const conveyors = items.filter((i) => i.kind === "conveyor" || i.kind === "roller");
  const sources = [...conveyors, ...items.filter(i => i.kind === "crates")];
  const sensors = items.filter(i => i.kind === "color-sensor" && i.visible !== false);
  const machines = items.filter((i) => draft.mode === "paint" ? i.kind === "paint" : draft.mode === "assemble" ? i.kind === "assembly" : MACHINE_KINDS.has(i.kind) && !["paint", "assembly"].includes(i.kind));
  const targets = draft.mode === "palletize" ? items.filter((i) => i.kind === "crates" && i.id !== draft.sourceId) : conveyors.filter((i) => i.id !== draft.sourceId);
  const pallet = items.find((i) => i.id === draft.targetId && i.kind === "crates");
  const rt = sim.robots.get(robot.id);
  const linked = !!robot.program && JSON.stringify(robot.program) === JSON.stringify(draft);
  const ready = sources.some((c) => c.id === draft.sourceId) && targets.some((c) => c.id === draft.targetId) && (!["tend", "paint", "assemble"].includes(draft.mode) || machines.some((m) => m.id === draft.machineId));
  const choose = (label: string, value: string, list: SceneItem[], onChange: (id: string) => void) => <label className="block"><span className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/40">{t(label)}</span><select aria-label={t(label)} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-white/15 bg-[#232326] px-2 py-2 text-[12px] outline-none focus:border-[var(--app-accent)]"><option value="">{t("Choose component")}</option>{list.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>;
  return <div className="flex min-h-0 flex-1 flex-col"><div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">{([ ["palletize", "Pick & palletize"], ["transfer", "Pick & place"], ["tend", "Tend a machine"], ["paint", "Paint product"], ["assemble", "Assemble parts"] ] as const).map(([mode, name]) => <button key={mode} type="button" onClick={() => { set({ mode, targetId: "", targetIds:undefined, machineId: "" }); }} className={cn("rounded border px-3 py-1.5 text-[11px] transition", draft.mode === mode ? "border-[var(--app-accent)] bg-[#225881]/40 text-[#9bd5ff]" : "border-white/10 text-white/50 hover:bg-white/5")}>{t(name)}</button>)}</div>
        <div className="mb-4 flex items-center gap-2 overflow-x-auto border-y border-white/10 py-3 text-[11px] text-white/65">{[t("Waiting for product"), t("Pick"), ...(draft.inspectSensorId ? [t("Inspect color")] : []), ...(draft.mode === "tend" ? [t("Process")] : []), t("Place")].map((label, i) => <div key={label} className="flex shrink-0 items-center gap-2">{i > 0 && <ArrowRight size={12} className="text-white/20" />}<span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--app-accent)]/15 font-mono text-[9px] text-[var(--app-accent-bright)]">{i + 1}</span>{t(label)}</span></div>)}<Repeat2 size={13} className="ml-auto shrink-0 text-[var(--green)]" /></div>
        <div className="grid gap-3 sm:grid-cols-2">{choose("Source", draft.sourceId, sources, (id) => set({ sourceId: id, sourceKind:items.find(item=>item.id===id)?.kind === "crates" ? "pallet" : undefined, ...(id===draft.targetId ? {targetId:"",targetIds:undefined} : {}) }))}{choose("Destination", draft.targetId, targets, (id) => set({ targetId: id, targetIds:draft.targetIds?.length ? [id,...draft.targetIds.filter(value => value !== id)] : undefined }))}{(draft.mode === "tend" || draft.mode === "paint" || draft.mode === "assemble") && choose(draft.mode === "assemble" ? "Assembly station" : "Processing machine", draft.machineId ?? "", machines, (id) => set({ machineId: id }))}</div>
        {draft.mode === "palletize" && sensors.length > 0 && <div className="mt-3">{choose("Inspect with color sensor (optional)", draft.inspectSensorId ?? "", sensors, id => set({inspectSensorId:id || undefined}))}<p className="mt-1 text-[10px] text-white/40">{t("The robot brings each held part into this sensor's beam before choosing a wired pallet.")}</p></div>}
        {draft.mode === "palletize" && draft.targetId && targets.length > 1 && <fieldset className="mt-3 rounded border border-white/10 p-2">
          <legend className="px-1 text-[10px] uppercase tracking-wider text-white/45">{t("Additional pallets")}</legend>
          <p className="mb-2 text-[10px] text-white/40">{t("Without signal wires, pallets fill in order. Wire color-sensor outputs to pallets to sort each detected part.")}</p>
          <div className="flex flex-wrap gap-2">{targets.filter(item => item.id !== draft.targetId).map(item => {
            const ids = draft.targetIds ?? [draft.targetId], selected = ids.includes(item.id);
            return <label key={item.id} className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70">
              <input aria-label={`${t('Additional pallet')}: ${item.name}`} type="checkbox" checked={selected} onChange={event => {
                const next = event.target.checked ? [...ids,item.id] : ids.filter(id => id !== item.id);
                set({targetIds:next.length > 1 ? next : undefined});
              }} className="accent-[var(--app-accent)]" />{item.name}{selected && <span className="text-white/35">{ids.indexOf(item.id)+1}</span>}
            </label>;
          })}</div>
        </fieldset>}
        <div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-[11px] text-white/65"><input type="checkbox" checked={draft.repeat} onChange={(e) => set({ repeat: e.target.checked })} className="accent-[var(--app-accent)]" />{t("Repeat cycle")}</label><span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--green)]"><Bot size={12} />{t("Auto approach")}</span><span className="flex items-center gap-1 text-[10px] text-[var(--app-accent-bright)]"><Package size={12} />{t("Live targets")}</span></div>
        <button type="button" onClick={() => setAdvanced(!advanced)} className="mt-3 flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70"><Settings2 size={12} />{t("Advanced options")}</button>
        {advanced && <div className="mt-2 grid grid-cols-2 gap-3">{draft.mode === "paint" && <label className="text-[10px] text-white/50">{t("Paint colour")}<input type="color" value={draft.paintColor || "#d6534c"} onChange={(e) => set({ paintColor: e.target.value })} className="ml-2 h-7 w-20 rounded border border-white/15 bg-transparent" /></label>}{([ ["delay", "Delay", 0, 30, 0.25], ["clearance", "Clearance", 0.05, 0.6, 0.05] ] as const).map(([key, label, min, max, step]) => <label key={key} className="text-[10px] text-white/50">{t(label)}<input type="number" value={draft[key]} min={min} max={max} step={step} onChange={(e) => set({ [key]: Math.max(min, Math.min(max, Number(e.target.value))) })} className="ml-2 w-20 rounded border border-white/15 bg-[#202024] p-1 font-mono" /></label>)}</div>}
        <div className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-white/40">{rt?.error ? <CircleAlert size={13} className="mt-0.5 shrink-0 text-[#f2b84a]" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[var(--green)]" />}<p>{t(rt?.error || "Bindings follow moved components. Approach and release are calculated automatically.")}</p></div>

      </div>
      {pallet && <div className="border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"><h4 className="mb-2 text-[10px] uppercase tracking-wider text-white/45">{t("Pallet pattern")}</h4><PalletPattern compact props={pallet.props} onChange={(patch) => onUpdate(pallet.id, { props: { ...pallet.props, ...patch } }, true)} /></div>}
    </div>
  </div><div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#242427] px-4 py-2">        <button type="button" disabled={!ready} onClick={() => {
            if (draft.mode === "paint" && draft.machineId) { const machine = items.find((i) => i.id === draft.machineId); if (machine) onUpdate(machine.id, { props: { ...machine.props, paintColor: draft.paintColor || "#d6534c" } }); }
            if (pallet) {
              const prior = items.find((i) => i.program?.targetId === draft.sourceId && i.program.mode === "tend");
              const processing = items.find((i) => i.id === (draft.mode === "tend" ? draft.machineId : prior?.program?.machineId));
              const product = processing?.props.outputProduct;
              if (typeof product === "string" && product !== pallet.props.product) onUpdate(pallet.id, { props: { ...pallet.props, product } });
            }
            onUpdate(robot.id, { program: draft, script: programToCode(draft), props: draft.mode === "paint" ? { ...robot.props, gripper: "paint" } : robot.props });
          }} className="flex items-center gap-2 rounded bg-[#277fbc] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#349ce1] disabled:cursor-not-allowed disabled:opacity-35"><Play size={12} fill="currentColor" />{t(linked ? "Task linked" : "Link task")}{linked && <CheckCircle2 size={12} />}</button><span className="hidden text-[10px] text-white/30 sm:inline">{t("Bindings follow moved components.")}</span></div></div>;
}