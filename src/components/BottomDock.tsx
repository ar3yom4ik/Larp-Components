import { ChatPanel } from './Multiplayer';
import type { MultiplayerClient } from '../multiplayer/client';
import { signalTargets } from '../utils/signalPorts';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isRobotKind } from "../utils/kinds";
import { AlertTriangle, BookOpen, Braces, ChevronDown, ChevronUp, Eraser, Play, RotateCcw, Terminal, BarChart3, Cable, MessageSquare } from "lucide-react";
import type { SceneItem } from "../types";
import { sim } from "../sim/engine";
import { API_DOC, API_DOC_RU, blankScript } from "../sim/scripts";
import { useSimSnapshot, formatClock } from "../sim/hooks";
import { cn } from "../utils/cn";
import { TaskBuilder } from "./TaskBuilder";
import { programToCode } from "../sim/programCode";
import { getLanguage, t } from "../i18n";

export type DockTab = "output" | "program" | "stats" | "chat" | "signals";

interface DockProps {
  multiplayer: MultiplayerClient;
  tab: DockTab;
  setTab: (tab: DockTab) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  items: SceneItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateItem: (id: string, changes: Partial<SceneItem>, record?: boolean) => void;
  onTemplate: (template: "palletize" | "tend") => void;
  showApi: number;
  fullHeight?: boolean;
}

const LEVEL_STYLE = {
  info: "text-[var(--green)]",
  ok: "text-[#a6e36f] font-medium",
  warn: "text-[#f0b429]",
  error: "text-[#ff6b5e]",
} as const;

function OutputPanel() {
  const version = useSyncExternalStore(sim.subscribe, sim.getLogVersion);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [version]);
  return (
    <div ref={ref} className="dock-output thin-scroll min-h-0 flex-1 select-text overflow-y-auto bg-[#1e1e1e] px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.55]">
      {sim.logs.map((line) => (
        <div key={line.id} className={cn("whitespace-pre-wrap break-words", LEVEL_STYLE[line.level])}>
          {t(line.text)}
        </div>
      ))}
    </div>
  );
}

function ProgramPanel({
  items,
  selectedId,
  onSelect,
  onUpdateItem,
  showApi,
}: Pick<DockProps, "items" | "selectedId" | "onSelect" | "onUpdateItem" | "onTemplate" | "showApi">) {
  const robots = useMemo(() => items.filter((item) => isRobotKind(item.kind)), [items]);
  const current = robots.find((robot) => robot.id === selectedId) ?? robots[0] ?? null;
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [error, setError] = useState<string | null>(null);
  const [apiOpen, setApiOpen] = useState(false);
  const gutter = useRef<HTMLDivElement>(null);
  const loadedFor = useRef<{ id: string; script: string } | null>(null);
  useSimSnapshot(500);

  useEffect(() => {
    if (!current) return;
    const script = current.program ? programToCode(current.program) : current.script ?? blankScript;
    if (!loadedFor.current || loadedFor.current.id !== current.id || loadedFor.current.script !== script) {
      loadedFor.current = { id: current.id, script };
      setDraft(script);
      setError(null);
    }
  }, [current]);

  useEffect(() => {
    if (showApi > 0) { setApiOpen(true); setMode("code"); }
  }, [showApi]);

  const dirty = current ? draft !== (current.script ?? blankScript) : false;
  const rt = current ? sim.robots.get(current.id) : undefined;
  const lines = draft.split("\n").length;

  const apply = () => {
    if (!current) return;
    const problem = sim.check(draft);
    if (problem) {
      setError(problem);
      sim.log(`${current.name}: SyntaxError - ${problem}`, "error");
      return;
    }
    setError(null);
    onUpdateItem(current.id, { script: draft, program: undefined }, true);
    sim.log(`${current.name}: program applied`, "ok");
  };

  if (!current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#1e1e1e] text-center">
        <Braces size={22} className="text-white/25" />
        <p className="text-[12px] text-[#9a9a9e]">{t("Add a robot to the scene to write a program for it.")}</p>
      </div>
    );
  }

  return (
    <div className="program-content flex min-h-0 flex-1 bg-[#1e1e1e]">
      <div className="program-robots thin-scroll w-[126px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#252526]">
        <div className="px-2 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/35">{t("Robots")}</div>
        {robots.map((robot) => {
          const status = sim.robots.get(robot.id)?.status ?? "stopped";
          return (
            <button
              key={robot.id}
              type="button"
              onClick={() => onSelect(robot.id)}
              className={cn(
                "flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left text-[11px] transition",
                robot.id === current.id ? "border-[var(--teal)] bg-[#37373d] text-white" : "border-transparent text-[#bdbdbd] hover:bg-white/5",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  status === "moving" ? "bg-[var(--green)]" : status === "waiting" ? "bg-[var(--app-accent)]" : status === "error" ? "bg-[#ff6b5e]" : "bg-white/25",
                )}
              />
              <span className="truncate">{t(robot.name)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="program-toolbar flex min-h-[35px] shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#29292c] px-2 py-1">
          <span className="max-w-[135px] truncate text-[11px] text-white/80">{t(current.name)}</span>
          <div className="flex rounded border border-white/10 p-0.5">{([ ["visual", "Visual builder"], ["code", "Code"] ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setMode(id)} className={cn("rounded-sm px-2 py-1 text-[10px]", mode === id ? "bg-[#267bb5] text-white" : "text-white/45 hover:text-white")}>{t(label)}</button>)}</div>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/40">{t(rt?.status ?? "stopped")}</span>
          {mode === "code" && <div className="ml-auto flex items-center gap-1">
            {dirty && <span className="text-[9px] text-[#f0b429]">{t("unsaved")}</span>}
            <button type="button" onClick={() => { setDraft(current.script ?? blankScript); setError(null); }} className="rounded p-1 text-white/45 hover:bg-white/10" title={t("Revert")}><RotateCcw size={12} /></button>
            <button type="button" onClick={() => setApiOpen(!apiOpen)} className="rounded p-1 text-[var(--app-accent-bright)]" title={t("API reference")}><BookOpen size={12} /></button>
            <button type="button" onClick={apply} className="flex items-center gap-1.5 rounded bg-[#247bb8] px-2.5 py-1 text-[10px]"><Play size={10} fill="currentColor" />{t("Apply code")}</button>
          </div>}
        </div>
        {mode === "visual" ? <TaskBuilder key={current.id} robot={current} items={items} onUpdate={onUpdateItem} /> : <>
        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1">
            <div ref={gutter} className="w-9 shrink-0 select-none overflow-hidden bg-[#1e1e1e] py-1.5 pr-1.5 text-right font-mono text-[11.5px] leading-[1.55] text-white/25">
              {Array.from({ length: lines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={draft}
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
              onScroll={(event) => {
                if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
                if (event.key === "Tab") {
                  event.preventDefault();
                  const el = event.currentTarget;
                  const start = el.selectionStart;
                  const next = `${draft.slice(0, start)}  ${draft.slice(el.selectionEnd)}`;
                  setDraft(next);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              className="thin-scroll min-w-0 flex-1 resize-none whitespace-pre bg-[#1e1e1e] py-1.5 pr-2 font-mono text-[11.5px] leading-[1.55] text-[#d4d4d4] caret-[var(--teal)] outline-none"
              style={{ tabSize: 2 }}
            />
          </div>
          {apiOpen && (
            <pre className="thin-scroll hidden w-[330px] shrink-0 select-text overflow-auto border-l border-white/10 bg-[#252526] p-2.5 font-mono text-[10px] leading-[1.6] text-[#9cdcfe] md:block">
              {getLanguage() === "ru" ? API_DOC_RU : API_DOC}
            </pre>
          )}
        </div>
        {error && (
          <div className="flex shrink-0 items-center gap-2 border-t border-[#ff6b5e]/40 bg-[#3a1f1d] px-2.5 py-1 font-mono text-[10.5px] text-[#ff9a8f]">
            <AlertTriangle size={11} /> {error}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}

function Meter({ value, color = "var(--app-accent)" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
      <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}

function StatsPanel({ onSelect }: { onSelect: (id: string | null) => void }) {
  const snap = useSimSnapshot(500);
  const robots = [...sim.robots.values()];
  const machines = [...sim.machines.values()];
  const pallets = [...sim.pallets.values()];
  const elapsed = Math.max(1, sim.time);
  const util = robots.length ? robots.reduce((sum, r) => sum + r.busyT / elapsed, 0) / robots.length : 0;
  const quality = snap.spawned ? 1 - snap.lost / snap.spawned : 1;
  const cards = [
    ["Sim time", formatClock(snap.time), "#e6e6e6"],
    ["Throughput", `${snap.throughput.toFixed(1)} /min`, "var(--green)"],
    ["Stacked", String(snap.placed), "var(--green)"],
    ["Pallets shipped", String(snap.pallets), "var(--app-accent)"],
    ["Spawned", String(snap.spawned), "#e6e6e6"],
    ["Dropped", String(snap.lost), snap.lost ? "#ff9d6e" : "#e6e6e6"],
    ["Quality", `${(quality * 100).toFixed(0)} %`, "var(--teal)"],
    ["Robot utilization", `${(util * 100).toFixed(0)} %`, "#f0b429"],
  ];
  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-[#1e1e1e] p-2.5">
      <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-8">
        {cards.map(([label, value, color]) => (
          <div key={label} className="rounded-sm border border-white/10 bg-[#2b2b2d] px-2 py-1.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-white/40">{t(label)}</div>
            <div className="mt-0.5 font-mono text-[15px] font-light" style={{ color }}>
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
        <div>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{t("Robots")}</div>
          <div className="space-y-1">
            {robots.map((robot) => (
              <button key={robot.id} type="button" onClick={() => onSelect(robot.itemId)} className="block w-full rounded-sm border border-white/[0.08] bg-[#252526] px-2 py-1.5 text-left transition hover:border-white/25">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-[#e6e6e6]">{t(robot.name)}</span>
                  <span className="shrink-0 font-mono text-[9.5px] text-white/45">
                    {t(robot.status)} · {robot.cycles} {t("cycles ·")} {robot.lastCycle ? `${robot.lastCycle.toFixed(1)} s` : "-"}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Meter value={(robot.busyT / elapsed) * 100} color="var(--green)" />
                </div>
              </button>
            ))}
            {robots.length === 0 && <div className="text-[11px] text-white/35">{t("No robots in the scene.")}</div>}
          </div>
        </div>
        <div>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{t("Machines &amp; pallets")}</div>
          <div className="space-y-1">
            {machines.map((machine) => (
              <div key={machine.id} className="rounded-sm border border-white/[0.08] bg-[#252526] px-2 py-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#e6e6e6]">{t(machine.name)}</span>
                  <span className="font-mono text-[9.5px] text-white/45">{t(machine.busy ? "machining" : "idle")} · {machine.cycles} {t("parts")}</span>
                </div>
                <div className="mt-1.5">
                  <Meter value={(machine.busyTime / elapsed) * 100} color="#f2a33a" />
                </div>
              </div>
            ))}
            {pallets.map((pallet) => (
              <div key={pallet.id} className="rounded-sm border border-white/[0.08] bg-[#252526] px-2 py-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#e6e6e6]">{t(pallet.name)}</span>
                  <span className="font-mono text-[9.5px] text-white/45">
                    {pallet.cursor}/{pallet.capacity} {t("· shipped")} {pallet.shipped}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Meter value={(pallet.cursor / pallet.capacity) * 100} color="var(--app-accent)" />
                </div>
              </div>
            ))}
            {machines.length + pallets.length === 0 && <div className="text-[11px] text-white/35">{t("No machines or pallets in the scene.")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalsPanel({ items, onSelect }: { items: SceneItem[]; onSelect: (id: string) => void }) {
  useSimSnapshot(250);
  const nodes = items.filter((item) => ["button", "laser", "color-sensor", "sensor", "plc", "robot", "cobot", "kuka", "fanuc", "conveyor", "roller", "paint", "assembly"].includes(item.kind));
  return <div className="thin-scroll min-h-0 flex-1 overflow-auto bg-[#1e1e1e] p-2.5 font-mono text-[10.5px]">
    <div className="mb-2 grid grid-cols-[1fr_100px_1fr_70px] gap-2 border-b border-white/10 pb-1 text-[9px] uppercase tracking-wider text-white/35"><span>Source</span><span>Address</span><span>Connected to</span><span>Signal</span></div>
    {nodes.filter((n) => signalTargets(n).length || ["button", "laser", "color-sensor", "sensor", "plc"].includes(n.kind)).map((item) => {
      const targets = signalTargets(item).map((id) => items.find((i) => i.id === id)?.name ?? id).join(", ");
      const active = sim.signalState.get(item.id) === true;
      return <div key={item.id} className="grid grid-cols-[1fr_100px_1fr_70px] items-center gap-2 border-b border-white/[0.05] py-1.5">
        <button type="button" onClick={() => onSelect(item.id)} className="truncate text-left text-[#9dcbe8] hover:underline">{item.name} <span className="text-white/25">&lt;{item.kind}&gt;</span></button>
        <span className="text-white/40">{String(item.props.address || "—")}</span>
        <span className="truncate text-white/55" title={targets}>{targets || "—"}</span>
        <button type="button" onClick={() => item.kind === "button" ? sim.pressButton(item.id) : onSelect(item.id)} className={cn("flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px]", active ? "border-[var(--green-bright)]/40 bg-[var(--green-bright)]/10 text-[#8af0a3]" : "border-white/10 text-white/35")}><i className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[var(--green-bright)]" : "bg-white/25")} />{active ? "TRUE" : "FALSE"}</button>
      </div>;
    })}
    {nodes.length === 0 && <p className="py-6 text-center text-white/35">Add a button, laser trigger, sensor or PLC in CONNECTIVITY.</p>}
    <p className="mt-3 text-[9px] leading-relaxed text-white/30">Wires are drawn from each source to its connected targets. Trigger signals can control feeders and gate robot pick operations; press a button row to toggle it.</p>
  </div>;
}

export function BottomDock(props: DockProps) {
  const { tab, setTab, expanded, setExpanded } = props;
  const tabs: { id: DockTab; label: string; icon: React.ReactNode }[] = [
    { id: "output", label: "Output", icon: <Terminal size={12} /> },
    { id: "program", label: "Program", icon: <Braces size={12} /> },
    { id: "stats", label: "Statistics", icon: <BarChart3 size={12} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={12} /> },
    { id: "signals", label: "Connected Variables", icon: <Cable size={12} /> },
  ];
  return (
    <section className={cn("app-dock flex shrink-0 flex-col border-t border-white/[0.14] bg-[#252526]", props.fullHeight ? "h-full min-h-0 flex-1" : expanded || tab === "program" ? "h-[350px]" : "h-[175px]")}>
      {!props.fullHeight && <div className="flex h-[27px] shrink-0 items-center border-b border-white/10 bg-[#2b2b2d] px-2.5">
        <span className="text-[13px] text-[#e6e6e6]">{t(tabs.find((entry) => entry.id === tab)?.label)}</span>
        <div className="ml-auto flex items-center gap-1">
          {tab === "output" && (
            <button type="button" onClick={() => sim.clearLog()} className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white">
              <Eraser size={11} /> {t("Clear")} </button>
          )}
          <button type="button" onClick={() => setExpanded(!expanded)} className="rounded-sm p-1 text-white/50 hover:bg-white/10 hover:text-white" title={t(expanded ? "Shrink" : "Expand")}>
            {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>}
      {tab === "output" && <OutputPanel />}
      {tab === "program" && (
        <ProgramPanel
          items={props.items}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
          onUpdateItem={props.onUpdateItem}
          onTemplate={props.onTemplate}
          showApi={props.showApi}
        />
      )}
      {tab === "stats" && <StatsPanel onSelect={props.onSelect} />}
      {tab === "chat" && <ChatPanel client={props.multiplayer} />}
      {tab === "signals" && <SignalsPanel items={props.items} onSelect={props.onSelect} />}
      <div className="dock-tabs flex h-[26px] shrink-0 items-end border-t border-white/10 bg-[#1c1c1e]">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              "flex h-[25px] items-center gap-1.5 border-x border-b px-4 text-[12px] transition",
              tab === entry.id ? "border-white/15 bg-[#2b2b2d] text-white" : "border-transparent text-[#9a9a9e] hover:text-white",
            )}
          >
            {entry.icon}
            {t(entry.label)}
          </button>
        ))}
      </div>
    </section>
  );
}
