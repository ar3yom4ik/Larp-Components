import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Info,
  Lock,
  LockOpen,
  Minus,
  Move3D,
  Plus,
  Search,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import type { Category, SceneItem } from "../types";
import { CATEGORIES, getDef } from "../data/library";
import { samplePath } from "../sim/spline";
import { sim } from "../sim/engine";
import { useSimSnapshot } from "../sim/hooks";
import { PartIcon, partAccent } from "./PartIcon";
import { cn } from "../utils/cn";
import { ProductPicker } from "./ProductPicker";
import { ModelMaterialEditor } from "./ModelMaterialEditor";
import { WorkerEditor } from "./WorkerEditor";
import { workerShirtColor } from "./RiggedHuman";
import { PalletPattern } from "./PalletPattern";
import { MACHINE_KINDS } from "../data/products";
import { t, useLanguage } from "../i18n";
import { isSignalSource, signalTargets, signalTargetsPatch, signalWireColor } from "../utils/signalPorts";

interface PropertiesPanelProps {
  selected: SceneItem | null;
  items: SceneItem[];
  onUpdate: (id: string, changes: Partial<SceneItem>, record?: boolean) => boolean | void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSelect: (id: string | null) => void;
  selectedPoint: number | null;
  onSelectPoint: (index: number | null) => void;
  onAddPoint: () => void;
  onRemovePoint: () => void;
  onReversePath: () => void;
  onEditProgram: () => void;
  onBeginEdit: () => void;
  onImportCharacter: (id: string) => void;
  layoutName: string;
}

type InspectorTab = "properties" | "scene";

const COLOR_SWATCHES = ["#6DBE45", "#4DA3E8", "#35C4D4", "#F2C230", "#E58A62", "#D4443A", "#DCE5EE", "#6B7280"];

const RANGES: Record<string, [number, number, number]> = {
  speed: [0, 2, 0.05],
  interval: [0.5, 15, 0.5],
  payload: [1, 60, 1],
  cycleTime: [2, 60, 1],
  force: [50, 600, 10],
  stations: [1, 4, 1],
  rate: [4, 60, 1],
  capacity: [100, 1200, 50],
  lift: [1, 8, 0.2],
  load: [0.5, 5, 0.1],
  levels: [1, 6, 1],
  bays: [1, 4, 1],
  cols: [1, 4, 1],
  rows: [1, 4, 1],
  layers: [1, 5, 1],
  height: [1, 5, 0.1],
  length: [1, 10, 0.5],
  voltage: [110, 480, 10], intensity: [0, 200, 1], distance: [1, 30, 1], range: [0.3, 8, 0.1], radius: [0.2, 3, 0.1], requiredParts: [1, 8, 1], width: [0.4, 4, 0.1], depth: [0.4, 4, 0.1],
  gap: [0.01, 0.15, 0.01], walkSpeed: [0.25, 1.8, 0.05], panelWidth: [0.5, 2.5, 0.1], gateSegment: [0, 12, 1],
};

const UNITS: Record<string, string> = {
  speed: "m/s",
  interval: "s",
  payload: "kg",
  cycleTime: "s",
  force: "t",
  rate: "ppm",
  capacity: "kg",
  lift: "m",
  load: "t",
  height: "m",
  length: "m",
  voltage: "V",
};

const LABELS: Record<string, string> = {
  active: "Running",
  stopper: "End stopper",
  cycleTime: "Cycle time",
  interval: "Spawn interval", requireSupply: "Require supply", walkSpeed: "Walk speed", panelWidth: "Panel width", gateSegment: "Gate segment", gateOpen: "Gate open", cols: "Columns",
};

const isRobotKind = (kind: SceneItem["kind"]) => ["robot", "cobot", "kuka", "fanuc"].includes(kind);
const label = (key: string) => t(LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()));

export function PropertiesPanel(props: PropertiesPanelProps) {
  const [tab, setTab] = useState<InspectorTab>("properties");
  return (
    <aside className="app-panel app-properties flex min-h-0 w-full min-w-0 flex-1 flex-col border-l border-white/[0.12] bg-[#2d2d30]">
      <div className="app-panel-head flex h-[34px] shrink-0 items-center justify-between border-b border-white/10 bg-[#2b2b2d] px-3">
        <span className="text-[15px] text-[#ececec]">{t("Properties")}</span>
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">{t("Parametric")}</span>
      </div>
      <div className="grid shrink-0 grid-cols-2 border-b border-white/10 bg-[#252526]">
        {(["properties", "scene"] as InspectorTab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "relative py-2 text-[11px] capitalize transition",
              tab === id ? "bg-[#2d2d30] text-white" : "text-[#9a9a9e] hover:text-white",
            )}
          >
            {t(id === "properties" ? "Properties" : "Scene tree")}
            {tab === id && <span className="absolute inset-x-0 top-0 h-[2px] bg-[var(--app-accent)]" />}
          </button>
        ))}
      </div>
      {tab === "properties" ? <PropertiesTab {...props} /> : <SceneTab items={props.items} selected={props.selected} onUpdate={props.onUpdate} onSelect={props.onSelect} layoutName={props.layoutName} />}
    </aside>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.08] px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#a8a8ad]">{t(title)}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function CosmeticSelect({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <label className="block text-[10px] text-white/45">{t(label)}<select aria-label={t(label)} value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputCls, "mt-1.5")}>{options.map(([id, name]) => <option key={id} value={id}>{t(name)}</option>)}</select></label>;
}

const inputCls =
  "w-full rounded-sm border border-white/[0.12] bg-[#1e1e1e] px-2 py-1 font-mono text-[11px] text-[#e2e2e2] outline-none transition focus:border-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-40";

function Toggle({ checked, onChange, label: accessibleLabel }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={accessibleLabel}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-[16px] w-[30px] shrink-0 rounded-full border transition", checked ? "border-[var(--app-accent)] bg-[var(--app-accent)]" : "border-white/20 bg-white/10")}
    >
      <span className={cn("absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white transition", checked ? "left-[16px]" : "left-[2px] opacity-60")} />
    </button>
  );
}

function PropertiesTab({ selected, items, onUpdate, onDelete, onDuplicate, onSelect, selectedPoint, onSelectPoint, onAddPoint, onRemovePoint, onReversePath, onEditProgram, onBeginEdit, onImportCharacter, layoutName }: PropertiesPanelProps) {
  useSimSnapshot(500);

  if (!selected) {
    const counts = CATEGORIES.filter((c) => c !== "All").map((category) => ({
      category,
      count: items.filter((item) => getDef(item.kind).category === category).length,
    }));
    return (
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="rounded-sm border border-white/10 bg-[#252526] p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--app-accent)]/20 text-[var(--app-accent-bright)]">
            <Move3D size={17} />
          </div>
          <h3 className="mt-3 text-[13px] font-medium text-[#ececec]">{t("Nothing selected")}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-[#9a9a9e]">{t("Select a component in the 3D view to edit its parameters, spline and robot program.")}</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/35">
          <span>{t("Overview")}</span>
          <span className="normal-case tracking-normal">{layoutName}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {counts.slice(0, 6).map((entry) => (
            <div key={entry.category} className="rounded-sm border border-white/[0.08] bg-[#252526] px-2.5 py-2">
              <div className="font-mono text-[16px] font-light text-[#ececec]">{String(entry.count).padStart(2, "0")}</div>
              <div className="mt-0.5 text-[9.5px] uppercase tracking-wider text-white/35">{t(entry.category)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-[var(--app-accent)]/25 bg-[var(--app-accent)]/[0.07] px-2.5 py-2">
          <Info size={12} className="mt-0.5 shrink-0 text-[var(--app-accent-bright)]" />
          <p className="text-[10px] leading-relaxed text-[#b4b4b9]"> {t("Click")} <b>{t("AI Factory")}</b> {t("in the ribbon to procedurally generate a complete, working production line.")} </p>
        </div>
      </div>
    );
  }

  const def = getDef(selected.kind);
  const accent = selected.color || partAccent(selected.kind);
  const isConveyor = selected.kind === "conveyor" || selected.kind === "roller" || selected.kind === "fence";
  const isFence = selected.kind === "fence";
  const isRobot = isRobotKind(selected.kind);
  const isLogic = ["button", "laser", "sensor", "plc"].includes(selected.kind) || isRobot;
  const isWorker = selected.kind === "operator" || selected.kind === "mobile-robot";
  const feederSources = selected.kind === "feeder" ? items.filter((item) => isSignalSource(item) && signalTargets(item).includes(selected.id)) : [];
  const connectedTargets = isLogic ? signalTargets(selected) : [];
  const targetCandidates = isLogic ? items.filter((item) => item.id !== selected.id && !["fence", "wall", "light"].includes(item.kind)) : [];
  const points = selected.points ?? [];
  const length = isFence ? points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0) : isConveyor ? samplePath(points.length >= 2 ? points : [[-1, 0], [1, 0]], 0.2).length : 0;
  const rt = isRobot ? sim.robots.get(selected.id) : undefined;
  const pallet = sim.pallets.get(selected.id);
  const machine = sim.machines.get(selected.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-white/[0.08] p-3">
          <div className="flex items-start gap-2.5">
            <div className="relative flex h-[54px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-[#3a3a3d]">
              <PartIcon kind={selected.kind} className="h-[42px] w-[50px]" />
              <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={selected.name}
                onChange={(event) => onUpdate(selected.id, { name: event.target.value }, false)}
                className="w-full min-w-0 rounded-sm border border-transparent bg-transparent text-[13px] font-medium text-[#f0f0f0] outline-none transition hover:border-white/10 focus:border-[var(--app-accent)] focus:bg-[#1e1e1e] focus:px-1"
              />
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider" style={{ color: accent, backgroundColor: `${accent}22` }}>
                  {t(def.category)}
                </span>
                <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">{selected.id.slice(-4)}</span>
              </div>
              {rt && (
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[9px] text-white/50">
                  <span className={cn("h-1.5 w-1.5 rounded-full", rt.status === "moving" ? "bg-[var(--green)]" : rt.status === "waiting" ? "bg-[var(--app-accent)]" : rt.status === "error" ? "bg-[#ff6b5e]" : "bg-white/30")} />
                  {t(rt.status)} · {rt.cycles} {t("cycles")} </div>
              )}
              {pallet && (
                <div className="mt-1.5 font-mono text-[9px] text-white/50">
                  {pallet.cursor}/{pallet.capacity} {t("boxes · shipped")} {pallet.shipped}
                </div>
              )}
              {machine && <div className="mt-1.5 font-mono text-[9px] text-white/50">{t(machine.busy ? "machining" : "idle")} · {machine.cycles} {t("parts")}</div>}
            </div>
            <button type="button" onClick={() => onSelect(null)} className="rounded-sm p-1 text-white/35 transition hover:bg-white/10 hover:text-white" title={t("Close")}>
              <X size={13} />
            </button>
          </div>
        </div>

        <Section title={t("Transform")}>
          <div className="grid grid-cols-3 gap-1.5">
            {(["X", "Y", "Z"] as const).map((axis, index) => (
              <label key={axis} className="block">
                <span className="mb-1 block text-[9.5px] font-medium" style={{ color: axis === "X" ? "#ff9f7a" : axis === "Y" ? "var(--green)" : "var(--app-accent-bright)" }}>
                  {axis}
                </span>
                <input
                  type="number"
                  step={0.1}
                  disabled={selected.locked}
                  onFocus={onBeginEdit}
                  value={Number(selected.position[index].toFixed(2))}
                  onChange={(event) => {
                    const position = [...selected.position] as [number, number, number];
                    position[index] = Math.max(-200, Math.min(200, Number(event.target.value)));
                    onUpdate(selected.id, { position }, false);
                  }}
                  className={inputCls}
                />
              </label>
            ))}
          </div>
          <div className="mt-2 text-[9.5px] text-[#9a9a9e]">{t("Rotation °")}</div>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {([['X', 'rotationX'], ['Y', 'rotation'], ['Z', 'rotationZ']] as const).map(([axis, key]) => <label key={axis} className="block">
              <span className="mb-1 block text-[9.5px] text-white/50">{axis}</span>
              <input aria-label={`${t("Rotation")} ${axis}`} type="number" step={5} disabled={selected.locked} onFocus={onBeginEdit} value={Number((selected[key] ?? 0).toFixed(1))} onChange={(event) => onUpdate(selected.id, { [key]: Number(event.target.value) }, false)} className={inputCls} />
            </label>)}
          </div>
          {(selected.rotationX || selected.rotationZ) && selected.kind !== 'imported-model' && <p className="mt-1.5 text-[9.5px] text-amber-300/80">{t("Tilted equipment is displayed in 3D; simulation collisions and operations use an upright approximation.")}</p>}
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {!isConveyor && (
              <label className="block">
                <span className="mb-1 block text-[9.5px] text-[#9a9a9e]">{t("Scale")}</span>
                <input
                  type="number"
                  step={0.1}
                  min={selected.kind === "imported-model" ? 0.001 : 0.2}
                  max={selected.kind === "imported-model" ? 1000 : 3}
                  value={selected.scale}
                  onChange={(e) => onUpdate(selected.id, { scale: Math.max(selected.kind === "imported-model" ? 0.001 : 0.2, Math.min(selected.kind === "imported-model" ? 1000 : 3, Number(e.target.value))) }, false)}
                  className={inputCls}
                />
              </label>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onUpdate(selected.id, { locked: !selected.locked })}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-sm border py-1 text-[10px] transition",
                selected.locked ? "border-[#f2c230]/40 bg-[#f2c230]/10 text-[#f2c230]" : "border-white/10 text-[#b4b4b9] hover:bg-white/[0.06]",
              )}
            >
              {selected.locked ? <Lock size={11} /> : <LockOpen size={11} />} {t(selected.locked ? "Locked" : "Lock")}
            </button>
            <button
              type="button"
              onClick={() => onUpdate(selected.id, { visible: selected.visible === false })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-white/10 py-1 text-[10px] text-[#b4b4b9] transition hover:bg-white/[0.06]"
            >
              {selected.visible === false ? <EyeOff size={11} /> : <Eye size={11} />} {t(selected.visible === false ? "Hidden" : "Visible")}
            </button>
          </div>
        </Section>

        {isConveyor && (
          <Section
            title={t(isFence ? "Fence path" : "Spline")}
            action={
              <span className="font-mono text-[9px] text-white/40">
                {points.length} {t("pts ·")} {length.toFixed(1)} {t("m")} </span>
            }
          >
            <div className="space-y-1">
              {points.map((p, index) => (
                <div
                  key={index}
                  onClick={() => onSelectPoint(index)}
                  className={cn("flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition", selectedPoint === index ? "border-[var(--teal)] bg-[var(--teal)]/10" : "border-white/[0.08] bg-[#252526]")}
                >
                  <span className="w-4 text-center font-mono text-[9px] text-white/45">{index + 1}</span>
                  {[0, 1].map((axis) => (
                    <input
                      key={axis}
                      type="number"
                      step={0.25}
                      value={Number(p[axis].toFixed(2))}
                      onFocus={() => onSelectPoint(index)}
                      onChange={(event) => {
                        const next = points.map((q, i) => (i === index ? ((axis === 0 ? [Number(event.target.value), q[1]] : [q[0], Number(event.target.value)]) as [number, number]) : q));
                        onUpdate(selected.id, { points: next }, false);
                      }}
                      className={cn(inputCls, "min-w-0 py-0.5")}
                    />
                  ))}
                </div>
              ))}
            </div>
            {isConveyor && !isFence && <div className="mb-2 flex items-center justify-between rounded border border-white/10 bg-[#252526] px-2 py-1.5"><span className="text-[10px] text-white/55">{t("End stopper")}</span><Toggle label={t("End stopper")} checked={selected.props.stopper === true} onChange={(v) => onUpdate(selected.id, { props: { ...selected.props, stopper: v } })} /></div>}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={onAddPoint} className="flex items-center justify-center gap-1 rounded-sm border border-white/10 py-1 text-[10px] text-[#cfcfcf] hover:bg-white/10">
                <Plus size={11} /> {t("Add")} </button>
              <button type="button" onClick={onRemovePoint} disabled={selectedPoint === null || points.length <= 2} className="flex items-center justify-center gap-1 rounded-sm border border-white/10 py-1 text-[10px] text-[#cfcfcf] hover:bg-white/10 disabled:opacity-30">
                <Minus size={11} /> {t("Remove")} </button>
              <button type="button" onClick={onReversePath} className="flex items-center justify-center gap-1 rounded-sm border border-white/10 py-1 text-[10px] text-[#cfcfcf] hover:bg-white/10">
                <ArrowLeftRight size={11} /> {t(isFence ? "Reverse" : "Reverse flow")}
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/40">{t(isFence ? "Drag the posts to draw a sharp-cornered guard fence. Panels and corner posts are generated automatically." : "Drag the handles to bend the belt. Reverse flow swaps the entry and exit, including the stopper.")}</p>
          </Section>
        )}

        {isRobot && (
          <Section title={t("Program")}>
            <button type="button" onClick={onEditProgram} className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#1f6aa5] py-1.5 text-[11px] font-medium text-white transition hover:bg-[var(--file-hover)]">
              <Braces size={13} /> {t("Edit robot program")} </button>
            <p className="mt-2 text-[9.5px] leading-relaxed text-white/35">{t("Robots are programmed in JavaScript with the Larp robot API (pick, place, waitForPart, machine and pallet helpers).")}</p>
            {rt?.error && <p className="mt-1.5 rounded-sm bg-[#ff6b5e]/10 px-2 py-1 font-mono text-[9.5px] text-[#ff9a8f]">{rt.error}</p>}
          </Section>
        )}

        {selected.kind === "feeder" && <>
          <Section title={t("Products")}><ProductPicker label={t("Spawn product")} value={String(selected.props.product || "carton")} onChange={(product) => onUpdate(selected.id, { props: { ...selected.props, product } })} />{selected.props.requireSupply && <p className="mt-2 text-[10px] text-white/45">{t("Supply")}: {sim.feeders.get(selected.id)?.supply ?? 0}</p>}</Section>
          <Section title={t("Feeder control")}>
            <div className="flex items-center justify-between text-[11px] text-white/75"><span>{t("Mode")}</span><span className="font-medium text-[var(--app-accent-bright)]">{t(feederSources.length ? "Signal-controlled" : "Automatic")}</span></div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/45">{t(feederSources.length ? "One part per signal activation. Requests wait if the output is blocked or supply is empty; the spawn interval sets the minimum spacing." : "Runs automatically. Connect a button, sensor, laser or PLC to produce one part per signal activation.")}</p>
            {feederSources.length > 0 && <p className="mt-2 text-[10px] text-white/55">{t("Signal sources")}: {feederSources.map((item) => item.name).join(", ")} · {t("Pending")}: {sim.pendingFeederSignals(selected.id)}</p>}
          </Section>
        </>}
        {MACHINE_KINDS.has(selected.kind) && <Section title={t("Product transformation")}><div className="space-y-3"><ProductPicker label={t("Input product")} allowAny value={String(selected.props.inputProduct || "any")} onChange={(inputProduct) => onUpdate(selected.id, { props: { ...selected.props, inputProduct } })} /><ProductPicker label={t("Output product")} value={String(selected.props.outputProduct || "machined")} onChange={(outputProduct) => onUpdate(selected.id, { props: { ...selected.props, outputProduct } })} />{selected.kind === "paint" && <label className="block text-[10px] text-white/45">{t("Paint colour")}<input aria-label={t("Paint colour")} type="color" value={String(selected.props.paintColor || "#d6534c")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, paintColor: e.target.value } })} className="mt-1 h-8 w-full rounded border border-white/15 bg-transparent" /></label>}{selected.kind === "assembly" && <label className="block text-[10px] text-white/45">{t("Required parts")}<input aria-label={t("Required parts")} type="number" min={1} max={8} value={Number(selected.props.requiredParts ?? 2)} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, requiredParts: Math.max(1, Math.min(8, Number(e.target.value))) } })} className={cn(inputCls, "mt-1")} /></label>}<p className="text-[10px] leading-relaxed text-white/35">{t("One product in, one product out. The item keeps its physical identity.")}{selected.kind === "assembly" ? " " + t("Multiple parts are combined into one assembly.") : ""}</p></div></Section>}
        {isRobot && <Section title={t("Tool")}><label className="block"><span className="mb-1.5 block text-[10px] text-white/45">{t("Gripper")}</span><select aria-label={t("Gripper")} value={String(selected.props.gripper || "vacuum")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, gripper: e.target.value } })} className={inputCls}>{[["vacuum", "Vacuum cup"], ["parallel", "Parallel jaws"], ["three-finger", "Three-finger"], ["magnetic", "Magnetic"], ["soft", "Soft gripper"]].map(([id, name]) => <option key={id} value={id}>{t(name)}</option>)}</select></label><p className="mt-2 text-[10px] leading-relaxed text-white/35">{t("Magnetic tools pick metal only. Paint tools apply the program colour to an existing product.")}</p></Section>}
        {selected.kind === "crates" && <Section title={t("Pallet pattern")}><PalletPattern props={selected.props} onChange={(patch) => onUpdate(selected.id, { props: { ...selected.props, ...patch } })} /><div className="mt-3"><ProductPicker label={t("Product")} value={String(selected.props.product || "carton")} onChange={(product) => onUpdate(selected.id, { props: { ...selected.props, product } })} /></div></Section>}
        {selected.kind === "operator" && <WorkerEditor item={selected} items={items} onUpdate={onUpdate} onBeginEdit={onBeginEdit} onImportCharacter={onImportCharacter} />}
        {isWorker && <Section title={t(selected.kind === "mobile-robot" ? "Delivery robot task" : "Human tasks")}><div className="space-y-3"><label className="block text-[10px] text-white/45">{t("Task")}<select aria-label={t("Task")} value={String(selected.props.task || "patrol")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, task: e.target.value } })} className={cn(inputCls, "mt-1.5")}>{[["idle", "Stand by"], ["patrol", "Patrol route"], ["inspect", "Inspect products"], ["carry", "Carry products"], ["tend", "Tend a machine"], ["operate", "Operate a machine"], ["replenish", "Replenish feeder"]].map(([id, name]) => <option key={id} value={id}>{t(name)}</option>)}</select></label>{["sourceId", ...(selected.props.task === "carry" ? ["targetId"] : [])].map((key) => <label key={key} className="block text-[10px] text-white/45">{t(key === "sourceId" ? "Source station" : "Destination station")}<select aria-label={t(key === "sourceId" ? "Source station" : "Destination station")} value={String(selected.props[key] || "")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, [key]: e.target.value } })} className={cn(inputCls, "mt-1.5")}><option value="">{t("Nearest station")}</option>{items.filter((i) => MACHINE_KINDS.has(i.kind) || ["feeder", "conveyor", "roller", "crates"].includes(i.kind)).map((i) => <option key={i.id} value={i.id}>{t(i.name)}</option>)}</select></label>)}{selected.kind === "operator" && <div className="space-y-3 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-white/35">{t("Cosmetics")}</p>
          <CosmeticSelect label="Head" value={String(selected.props.hat || "none")} options={[["none", "None"], ["hardhat", "Hard hat"], ["cap", "Cap"]]} onChange={(value) => onUpdate(selected.id, { props: { ...selected.props, hat: value } })} />
          <CosmeticSelect label="Head accessory" value={selected.props.ears === true ? "ears" : selected.props.headphones === true ? "headphones" : "none"} options={[["none", "None"], ["ears", "Cat ears"], ["headphones", "Headphones"]]} onChange={(value) => onUpdate(selected.id, { props: { ...selected.props, ears: value === "ears", headphones: value === "headphones" } })} />
          <CosmeticSelect label="Face" value={selected.props.glasses === true ? "glasses" : "none"} options={[["none", "None"], ["glasses", "Safety glasses"]]} onChange={(value) => onUpdate(selected.id, { props: { ...selected.props, glasses: value === "glasses" } })} />
          <CosmeticSelect label="Ears" value={selected.props.earrings === true ? "earrings" : "none"} options={[["none", "None"], ["earrings", "Earrings"]]} onChange={(value) => onUpdate(selected.id, { props: { ...selected.props, earrings: value === "earrings" } })} />
          <label className="flex items-center justify-between gap-2 text-[10px] text-white/55">
            {t("T-shirt colour")}
            <input aria-label={t("T-shirt colour")} type="color" value={workerShirtColor(selected)} onChange={(e) => onUpdate(selected.id, { color: e.target.value })} className="h-7 w-12 rounded border border-white/15 bg-transparent" />
          </label>
          {String(selected.props.hat || "none") !== "none" && (
            <label className="flex items-center justify-between gap-2 text-[10px] text-white/55">
              {t("Hat colour")}
              <input aria-label={t("Hat colour")} type="color" value={String(selected.props.hatColor ?? (String(selected.props.hat) === "cap" ? workerShirtColor(selected) : "#f7b51e"))} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, hatColor: e.target.value } })} className="h-7 w-12 rounded border border-white/15 bg-transparent" />
            </label>
          )}
          <p className="text-[9.5px] leading-relaxed text-white/35">{t("The worker colour sets the T-shirt. Hats and caps follow the hat colour; the hi-vis default is yellow.")}</p>
        </div>}
        <p className="mt-2 text-[10px] text-white/40">{t("Completed tasks")}: {sim.humans.get(selected.id)?.completed ?? 0}</p></div></Section>}


        {selected.kind === "collector" && <Section title={t("Receive box")}><div className="rounded border border-white/10 bg-[#202023] p-3 text-center"><div className="font-mono text-[28px] font-light text-[#e6f2ef]">{sim.collectors.get(selected.id)?.count ?? 0}</div><div className="mt-1 text-[9px] uppercase tracking-widest text-white/35">{t("Products received")}</div></div><p className="mt-2 text-[10px] leading-relaxed text-white/35">{t("Open the conveyor end stopper to drop products into this box. Every product that settles is counted once.")}</p></Section>}
        {isLogic && <Section title={t("Automation")}><div className="space-y-3">
          {isRobot && <>
            <label className="block text-[10px] text-white/45">{t("Robot output")}
              <select aria-label={t("Robot output")} disabled={selected.locked} className={cn(inputCls, "mt-1")} value={selected.props.outputMode === "operation-end" ? "operation-end" : "moving"} onChange={(event) => onUpdate(selected.id, {props: {...selected.props, outputMode: event.target.value}})}>
                <option value="moving">{t("Moving or holding")}</option>
                <option value="operation-end">{t("Pulse on operation end")}</option>
              </select>
            </label>
            <p className="text-[10px] leading-relaxed text-white/45">{t("A connected IN queues one activation per visual-program pick. Operation-end OUT pulses after each successful place.")}</p>
            {items.some((item) => isSignalSource(item) && signalTargets(item).includes(selected.id)) && <p className="text-[10px] text-white/55">{t("Pending robot signals")}: {sim.pendingRobotSignals(selected.id)}</p>}
          </>}
          <label className="block text-[10px] text-white/45">{t("Signal target")}
            <select aria-label={t("Signal target")} disabled={selected.locked} className={cn(inputCls, "mt-1")} value={connectedTargets[0] ?? ""} onChange={(e) => onUpdate(selected.id, signalTargetsPatch(selected, e.target.value ? [e.target.value, ...connectedTargets.slice(1).filter((id) => id !== e.target.value)] : []))}>
              <option value="">{t("Not connected")}</option>{connectedTargets[0] && !targetCandidates.some((item) => item.id === connectedTargets[0]) && <option value={connectedTargets[0]}>{connectedTargets[0]}</option>}{targetCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block text-[10px] text-white/45">{t("Add another signal target")}
            <select aria-label={t("Add another signal target")} disabled={selected.locked || targetCandidates.every((item) => connectedTargets.includes(item.id))} className={cn(inputCls, "mt-1")} value="" onChange={(e) => { if (e.target.value) onUpdate(selected.id, signalTargetsPatch(selected, [...connectedTargets, e.target.value])); }}>
              <option value="">{t("Choose a target")}</option>{targetCandidates.filter((item) => !connectedTargets.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {connectedTargets.length > 0 && <div className="space-y-1 text-[10px] text-white/55"><span>{t("Connected targets")}</span>{connectedTargets.map((id) => <div key={id} className="flex items-center justify-between gap-2 rounded bg-white/[0.03] px-2 py-1"><span className="truncate">{items.find((item) => item.id === id)?.name ?? id}</span><button type="button" disabled={selected.locked} aria-label={`${t("Remove connection")}: ${items.find((item) => item.id === id)?.name ?? id}`} onClick={() => onUpdate(selected.id, signalTargetsPatch(selected, connectedTargets.filter((target) => target !== id)))} className="rounded px-1.5 text-white/50 hover:bg-white/10 disabled:opacity-40">×</button></div>)}</div>}
          <label className="block text-[10px] text-white/45">{t("Wire colour")}
            <span className="mt-1 flex items-center gap-2">
              <input aria-label={t("Wire colour")} type="color" disabled={selected.locked} value={signalWireColor(selected.props.wireColor)} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, wireColor: e.target.value } })} className="h-8 w-12 cursor-pointer rounded border border-white/15 bg-transparent disabled:opacity-40" />
              <span className="font-mono text-[10px] text-white/55">{signalWireColor(selected.props.wireColor).toUpperCase()}</span>
            </span>
          </label>
          <label className="block text-[10px] text-white/45">{t("Address")}<input value={String(selected.props.address || "DI-01")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, address: e.target.value } })} className={cn(inputCls, "mt-1")} /></label>
          {selected.kind === "button" && <button type="button" onClick={() => { const current = sim.signalState.get(selected.id) === true; sim.setButton(selected.id, !current); onUpdate(selected.id, { props: { ...selected.props, signal: !current } }, false); }} className="primary-action w-full">{sim.signalState.get(selected.id) ? t("Release button") : t("Press button")}</button>}
          {selected.kind === "laser" && <label className="flex items-center justify-between text-[11px] text-white/65">{t("Normally closed")}<Toggle label={t("Normally closed")} checked={selected.props.normallyClosed === true} onChange={(v) => onUpdate(selected.id, { props: { ...selected.props, normallyClosed: v } })} /></label>}
          <div className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1.5 text-[10px] text-white/55"><span>{t("Live signal")}</span><span className={cn("flex items-center gap-1 font-mono", sim.signalState.get(selected.id) ? "text-[#76e08b]" : "text-white/35")}><i className={cn("h-1.5 w-1.5 rounded-full", sim.signalState.get(selected.id) ? "bg-[#76e08b]" : "bg-white/30")} />{sim.signalState.get(selected.id) ? "TRUE" : "FALSE"}</span></div>
        </div></Section>}
        {selected.kind === "light" && <Section title={t("Light")}><div className="space-y-3"><label className="block text-[10px] text-white/45">{t("Type")}<select aria-label={t("Light type")} value={String(selected.props.lightType || "spot")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, lightType: e.target.value } })} className={cn(inputCls, "mt-1")}><option value="spot">{t("Spot")}</option><option value="point">{t("Point")}</option></select></label><label className="block text-[10px] text-white/45">{t("Colour")}<input aria-label={t("Light colour")} type="color" value={String(selected.props.color || "#fff1d0")} onChange={(e) => onUpdate(selected.id, { props: { ...selected.props, color: e.target.value } })} className="mt-1 h-8 w-full bg-transparent" /></label><label className="flex items-center justify-between text-[11px] text-white/65">{t("Cast shadows")}<Toggle label={t("Cast shadows")} checked={selected.props.castShadow === true} onChange={(v) => onUpdate(selected.id, { props: { ...selected.props, castShadow: v } })} /></label><p className="text-[10px] text-white/35">{t("Lights also respond to the enhanced and global-illumination graphics modes.")}</p></div></Section>}
        {selected.kind === "imported-model" && <ModelMaterialEditor item={selected} onUpdate={onUpdate} onBeginEdit={onBeginEdit} />}

        {selected.kind !== "imported-model" && <Section title={t("Appearance")}>
          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdate(selected.id, { color })}
                className={cn("h-5 w-5 rounded-[3px] border transition hover:scale-110", (selected.color || accent) === color ? "border-white ring-1 ring-white/40" : "border-white/15")}
                style={{ backgroundColor: color }}
                aria-label={`Accent ${color}`}
              />
            ))}
          </div>
          {selected.kind === "operator" && <p className="mt-2 text-[10px] leading-relaxed text-white/40">{t("For a worker this colour is the T-shirt colour.")}</p>}
        </Section>}

        {selected.kind !== "imported-model" && <Section title={t("Behaviour")}>
          <div className="space-y-3">
            {Object.entries(selected.props).filter(([key]) => !["product", "inputProduct", "outputProduct", "gripper", "task", "hat", "glasses", "sourceId", "targetId", "machineId", "connectedTo", "signal", "address", "wireColor", "outputMode", "paintColor", "lightType", "color", "castShadow", "ears", "headphones", "earrings", "requireSupply", ...(selected.kind === "crates" ? ["cols", "rows", "layers"] : [])].includes(key)).map(([key, value]) => (
              <PropControl key={key} kind={selected.kind} propKey={key} value={value} onChange={(next) => onUpdate(selected.id, { props: { ...selected.props, [key]: next } }, false)} />
            ))}
            {Object.keys(selected.props).length === 0 && <p className="text-[10px] text-white/35">{t("No parameters.")}</p>}
          </div>
        </Section>}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-white/10 bg-[#2d2d30] p-2.5">
        <button type="button" onClick={() => onDuplicate(selected.id)} className="flex items-center justify-center gap-1.5 rounded-sm border border-white/15 py-1.5 text-[10.5px] text-[#d4d4d4] transition hover:bg-white/10">
          <Copy size={12} /> {t("Duplicate")} </button>
        <button type="button" onClick={() => onDelete(selected.id)} className="flex items-center justify-center gap-1.5 rounded-sm border border-[#ff6b5e]/30 bg-[#ff6b5e]/10 py-1.5 text-[10.5px] text-[#ff9a8f] transition hover:bg-[#ff6b5e]/20">
          <Trash2 size={12} /> {t("Delete")} </button>
      </div>
    </div>
  );
}

function PropControl({ kind, propKey, value, onChange }: { kind: SceneItem["kind"]; propKey: string; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#c4c4c8]">{label(propKey)}</span>
        <Toggle label={label(propKey)} checked={value} onChange={onChange} />
      </div>
    );
  }
  if (typeof value === "number") {
    const robotSpeed = propKey === "speed" && ["robot", "cobot", "kuka", "fanuc"].includes(kind);
    const range: [number, number, number] = robotSpeed ? [10, 100, 5] : RANGES[propKey] ?? [0, Math.max(100, value * 2), 1];
    const unit = robotSpeed ? "%" : UNITS[propKey] ?? "";
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#c4c4c8]">{label(propKey)}</span>
          <span className="font-mono text-[10.5px] text-[#e6e6e6]">
            {Number.isInteger(value) ? value : value.toFixed(2)} <span className="text-[8.5px] text-white/35">{t(unit)}</span>
          </span>
        </div>
        <input
          type="range"
          min={range[0]}
          max={range[1]}
          step={range[2]}
          value={Math.max(range[0], Math.min(range[1], value))}
          onChange={(event) => onChange(Number(event.target.value))}
          className="accent-range mt-1.5 w-full"
        />
      </div>
    );
  }
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] text-[#c4c4c8]">{label(propKey)}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputCls, "w-[110px] text-right")} />
    </label>
  );
}

function SceneTab({ items, selected, onUpdate, onSelect, layoutName }: { items: SceneItem[]; selected: SceneItem | null; onUpdate: PropertiesPanelProps["onUpdate"]; onSelect: (id: string | null) => void; layoutName: string }) {
  const language = useLanguage();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const query = search.toLowerCase();
    return CATEGORIES.filter((c): c is Category => c !== "All").map((category) => ({
      category,
      items: items.filter((item) => getDef(item.kind).category === category && (!query || item.name.toLowerCase().includes(query) || t(item.name).toLowerCase().includes(query))),
    }));
  }, [items, search, language]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-2.5 pb-1.5">
        <div className="flex items-center gap-2 rounded-sm border border-white/[0.12] bg-[#1e1e1e] px-2 py-1">
          <Search size={11} className="text-white/35" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Filter scene tree...")} className="w-full bg-transparent text-[11px] text-white/80 outline-none placeholder:text-white/30" />
          <span className="font-mono text-[9px] text-white/30">{items.length}</span>
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-medium text-white/80">
          <ChevronDown size={11} className="text-white/35" /> {layoutName}
        </div>
        {groups.map((group) => {
          const closed = collapsed[group.category];
          return (
            <div key={group.category}>
              <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [group.category]: !c[group.category] }))} className="flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 transition hover:bg-white/5">
                {closed ? <ChevronRight size={10} className="text-white/35" /> : <ChevronDown size={10} className="text-white/35" />}
                <span className="text-[10px] uppercase tracking-wider text-white/45">{t(group.category)}</span>
                <span className="font-mono text-[9px] text-white/25">{group.items.length}</span>
              </button>
              {!closed &&
                group.items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <div key={item.id} className={cn("group flex items-center gap-1 border-l-2 py-[2px] pl-1 pr-1.5 transition", active ? "border-[var(--teal)] bg-[var(--app-accent)]/20" : "border-transparent hover:bg-white/5")}>
                      <button type="button" onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left">
                        <PartIcon kind={item.kind} className="h-5 w-6 shrink-0" />
                        <span className={cn("truncate text-[11px]", active ? "text-white" : "text-[#b9b9be] group-hover:text-white")}>{t(item.name)}</span>
                      </button>
                      <button type="button" onClick={() => onUpdate(item.id, { visible: item.visible === false })} className="shrink-0 text-white/25 transition hover:text-white/70" title={t("Show/hide")}>
                        {item.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      <button type="button" onClick={() => onUpdate(item.id, { locked: !item.locked })} className={cn("shrink-0 transition", item.locked ? "text-[#f2c230]" : "text-white/25 hover:text-white/70")} title={t("Lock")}>
                        {item.locked ? <Lock size={10} /> : <Unlock size={10} />}
                      </button>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
