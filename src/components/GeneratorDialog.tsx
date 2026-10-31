import { useMemo, useState } from "react";
import { Dices, Factory, Minus, Plus, Sparkles, X } from "lucide-react";
import { DEFAULT_GEN, FACTORY_RECIPES, generateFactory, parsePrompt, validateFactory, type FactoryStyle, type GenOptions } from "../sim/generator";
import type { SceneItem } from "../types";
import { cn } from "../utils/cn";
import { t } from "../i18n";
import { getProduct, PRODUCTS } from "../data/products";
import { ProductPicker } from "./ProductPicker";
import { FactoryStudio } from "./factory/FactoryStudio";
import { PalletPattern } from "./PalletPattern";
import { FloorPlanView } from "./FloorPlanView";

interface Props {
  open: boolean;
  initial: GenOptions;
  onClose: () => void;
  onBuild: (items: SceneItem[], options: GenOptions) => void;
}

const STYLES: { id: FactoryStyle; label: string }[] = [
  { id: "straight", label: "Straight" },
  { id: "L", label: "L-shape" },
  { id: "U", label: "U-shape" },
  { id: "S", label: "S-curve" },
];

export function GeneratorDialog({ open, initial, onClose, onBuild }: Props) {
  const [options, setOptions] = useState<GenOptions>({ ...DEFAULT_GEN, ...initial });
  const [prompt, setPrompt] = useState("");
  const [interpreted, setInterpreted] = useState("");
  const [advanced, setAdvanced] = useState(false);
  // Node graph is the primary mode; the form stays available for quick numeric tweaks.
  const [mode, setMode] = useState<"graph" | "form">("graph");
  const items = useMemo(() => (open ? generateFactory(options) : []), [open, options]);
  const warnings = useMemo(() => open ? validateFactory(items) : [], [open, items]);
  if (!open) return null;
  const set = (patch: Partial<GenOptions>) => setOptions((cur) => ({ ...cur, ...patch }));
  const interpret = () => {
    if (!prompt.trim() || prompt === interpreted) return;
    setOptions((cur) => parsePrompt(prompt, cur));
    setInterpreted(prompt);
  };
  const build = () => {
    // Never silently ignore text when the user presses Build without Interpret.
    const finalOptions = prompt.trim() && prompt !== interpreted ? parsePrompt(prompt, options) : options;
    const finalItems = finalOptions === options ? items : generateFactory(finalOptions);
    const finalWarnings = validateFactory(finalItems);
    if (finalWarnings.length) { setOptions(finalOptions); setInterpreted(prompt); return; }
    onBuild(finalItems, finalOptions);
  };
  const recipe = FACTORY_RECIPES.find((r) => r.id === options.recipe)!;
  const input = options.product === "auto" ? recipe.input : options.product;
  const output = options.stages === 0 ? input : options.outputProduct === "auto" ? recipe.output : options.outputProduct;
  const validTool = options.gripper !== "magnetic" || (getProduct(input).magnetic && getProduct(output).magnetic);
  const select = (label: string, key: keyof GenOptions, entries: [string, string][]) => <label className="block"><span className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/45">{t(label)}</span><select aria-label={t(label)} value={String(options[key])} onChange={(e) => set(key === "machineKind" ? { machineKind: e.target.value as GenOptions["machineKind"], processChain: [], cellMachines: [] } : { [key]: e.target.value } as Partial<GenOptions>)} className="w-full rounded border border-white/15 bg-[#202023] px-2 py-2 text-[12px] outline-none focus:border-[var(--app-accent)]">{entries.map(([id, name]) => <option key={id} value={id}>{t(name)}</option>)}</select></label>;
  if (mode === "graph") {
    return (
      <div className="generator-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
        <div role="dialog" aria-modal="true" aria-label={t("AI Factory")} className="flex h-[92dvh] w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#2b2b2e] shadow-[0_30px_80px_rgba(0,0,0,.65)]">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#232326] px-4"><Factory size={17} className="text-[#f2b14c]" /><h2 className="text-[14px] font-medium">{t("AI Factory")}</h2><span className="ml-1 rounded bg-[var(--app-accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--app-accent-bright)]">5.1</span><div className="ml-2 flex overflow-hidden rounded border border-white/15">
          {([["graph", "Node graph"], ["form", "Form"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={cn("px-2 py-1 text-[10.5px] transition", mode === id ? "bg-[var(--app-accent)]/25 text-white" : "text-white/50 hover:bg-white/10 hover:text-white")}>{t(label)}</button>
          ))}
        </div>
          <button type="button" aria-label={t("Close")} onClick={onClose} className="ml-auto mr-2 rounded p-2 text-white/55 hover:bg-white/10"><X size={16} /></button>
          </div>
          <FactoryStudio onBuild={(items, options) => onBuild(items, options)} onClose={onClose} />
        </div>
      </div>
    );
  }
  return <div className="generator-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-label={t("AI Factory")} className="flex max-h-[92dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#2b2b2e] shadow-[0_30px_80px_rgba(0,0,0,.65)]">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#232326] px-4"><Factory size={17} className="text-[#f2b14c]" /><h2 className="text-[14px] font-medium">{t("AI Factory")}</h2><span className="ml-1 rounded bg-[var(--app-accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--app-accent-bright)]">5.1</span><div className="ml-2 flex overflow-hidden rounded border border-white/15">
          {([["graph", "Node graph"], ["form", "Form"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={cn("px-2 py-1 text-[10.5px] transition", mode === id ? "bg-[var(--app-accent)]/25 text-white" : "text-white/50 hover:bg-white/10 hover:text-white")}>{t(label)}</button>
          ))}
        </div><button type="button" aria-label={t("Close")} onClick={onClose} className="ml-auto rounded p-2 text-white/55 hover:bg-white/10"><X size={16} /></button></div>
      <div className="thin-scroll grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <section><h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">{t("Factory type")}</h3><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{FACTORY_RECIPES.map((r) => <button key={r.id} type="button" onClick={() => set({ recipe: r.id, product: "auto", outputProduct: "auto", stages: r.id === "logistics" ? 0 : Math.max(1, options.stages), gripper: r.id === "bakery" ? "soft" : r.id === "metalworking" || r.id === "turning" ? "parallel" : "vacuum", processChain: [], cellMachines: [], cellInputs: [], cellOutputs: [], cellWorkers: [] })} className={cn("flex min-h-12 items-center gap-2 rounded border px-2.5 py-2 text-left text-[11px] transition", options.recipe === r.id ? "border-[var(--app-accent)]/80 bg-[var(--app-accent)]/10 text-white" : "border-white/10 text-white/55 hover:bg-white/5")}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />{t(r.name)}</button>)}</div><p className="mt-2 text-[11px] text-white/40">{t(recipe.description)}</p></section>
          <section>
            <label htmlFor="factory-description" className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/45">{t("Describe the factory")}</label>
            <div className="flex items-stretch gap-1.5">
              <textarea id="factory-description" aria-label={t("Describe the factory")} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} onBlur={interpret} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); interpret(); } }} placeholder={t("e.g. U-shaped cookie bakery with 2 cells")} className="min-w-0 flex-1 resize-y rounded border border-white/15 bg-[#202023] px-2.5 py-2 text-[12px] outline-none placeholder:text-white/30 focus:border-[var(--app-accent)]" />
              <button type="button" onClick={interpret} className="flex shrink-0 items-center gap-1.5 self-start rounded border border-white/15 px-2.5 py-2 text-[11px] text-white/70 hover:bg-white/10"><Sparkles size={12} className="text-[#f2b14c]" />{t("Interpret")}</button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">{t("Local rule-based interpretation · review the recognized controls and process sequence before building. Text is also applied when you leave this field.")}</p>
          </section>
          <section><h3 className="mb-1.5 text-[10px] uppercase tracking-wider text-white/45">{t("Line shape")}</h3><div className="grid grid-cols-4 gap-1.5">{STYLES.map((style) => <button key={style.id} type="button" onClick={() => set({ style: style.id })} className={cn("rounded border py-2 text-[11px] transition", options.style === style.id ? "border-[var(--app-accent)] bg-[var(--app-accent-deep)]/60 text-white" : "border-white/10 text-white/50 hover:bg-white/5")}>{t(style.label)}</button>)}</div></section>
          <div className="grid grid-cols-3 gap-3">{([["stages", "Processing cells", 0, 8], ["lanes", "Parallel lines", 1, 8], ["columns", "Parallel columns", 1, 4]] as const).map(([key, label, min, max]) => <div key={key}><span className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/45">{t(label)}</span><div className="flex items-center gap-3"><button type="button" aria-label={`${t("Remove")} ${t(label)}`} onClick={() => set({ [key]: Math.max(min, options[key] - 1) })} className="rounded border border-white/15 p-2 hover:bg-white/10"><Minus size={12} /></button><span className="w-5 text-center font-mono text-[15px]">{options[key]}</span><button type="button" aria-label={`${t("Add")} ${t(label)}`} onClick={() => set({ [key]: Math.min(max, options[key] + 1) })} className="rounded border border-white/15 p-2 hover:bg-white/10"><Plus size={12} /></button></div></div>)}</div>
          <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/45">{t("Robot type")}</span><select value={options.cobot ? "cobot" : options.robotBrand} onChange={(e) => set({ cobot: e.target.value === "cobot", robotBrand: e.target.value === "kuka" ? "kuka" : e.target.value === "fanuc" ? "fanuc" : "robot" })} className="w-full rounded border border-white/15 bg-[#202023] px-2 py-2 text-[12px]"><option value="robot">Larp industrial</option><option value="kuka">KUKA</option><option value="fanuc">FANUC</option><option value="cobot">{t("Cobot")}</option></select></label>{select("Gripper", "gripper", [["vacuum", "Vacuum cup"], ["parallel", "Parallel jaws"], ["three-finger", "Three-finger"], ["magnetic", "Magnetic"], ["soft", "Soft gripper"]])}</div>
          <div className="grid grid-cols-[minmax(0,1fr)_112px] items-end gap-4"><p className="text-[10px] leading-relaxed text-white/40">{t("Staff is the total number of people across all parallel lines, not per line.")}</p><label className="block text-[10px] uppercase tracking-wider text-white/45">{t("Staff")}<input aria-label={t("Staff")} type="number" min={0} max={50} value={options.operators ? options.staff : 0} onChange={(e) => { const staff = Math.max(0, Math.min(50, Math.round(Number(e.target.value)))); set({ staff, operators: staff > 0 }); }} className="mt-1.5 w-full rounded border border-white/15 bg-[#202023] px-2 py-2 font-mono text-[12px] text-white" /></label></div>
          <div><div className="mb-1 flex items-center justify-between text-[10px] text-white/45"><span className="uppercase tracking-wider">{t("Feed rate")}</span><span className="font-mono text-white/80">{options.rate} {t("products / min")}</span></div><input aria-label={t("Feed rate")} type="range" min={4} max={24} step={1} value={options.rate} onChange={(e) => set({ rate: Number(e.target.value) })} className="accent-range w-full" /></div>
          {options.processChain.length > 0 && <div className="rounded border border-[var(--app-accent)]/25 bg-[var(--app-accent)]/[0.06] px-3 py-2"><div className="mb-1.5 text-[9px] uppercase tracking-widest text-[#8fc9f5]">{t("Combined process detected")}</div><div className="flex flex-wrap gap-1.5">{options.processChain.map((step, i) => <span key={i} className="flex items-center gap-1 rounded bg-[#202a33] px-2 py-1 text-[10px] text-white/70"><b className="font-mono text-[8px] text-white/30">{i + 1}</b>{t(step.machine)}{i < options.processChain.length - 1 && <span className="text-white/25">→</span>}</span>)}</div><p className="mt-1.5 text-[9.5px] text-white/35">{options.product !== "auto" ? getProduct(options.product).name : "recipe input"} → {options.outputProduct !== "auto" ? getProduct(options.outputProduct).name : "recipe output"}</p></div>}
          <button type="button" onClick={() => setAdvanced(!advanced)} className="flex items-center gap-1.5 text-[11px] text-[var(--app-accent-bright)]"><Plus size={12} className={advanced ? "rotate-45 transition" : "transition"} />{t("Advanced options")}</button>
          {advanced && <div className="space-y-4 border-t border-white/10 pt-3"><div className="grid grid-cols-2 gap-3"><ProductPicker label={t("Input product")} value={input} onChange={(product) => set({ product })} /><ProductPicker label={t("Output product")} value={output} onChange={(outputProduct) => set({ outputProduct })} /></div><div className="grid grid-cols-2 gap-3">{select("Processing machine", "machineKind", [["auto", "Automatic"], ["cnc", "CNC"], ["press", "Press"], ["weld", "Weld cell"], ["packaging", "Case packer"], ["paint", "Paint station"], ["cutter", "Laser cutter"], ["inspection", "Quality inspection"], ["assembly", "Assembly station"], ["kiln", "Industrial kiln"], ["lathe", "Turning lathe"], ["grinder", "Surface grinder"]])}{select("Staff task", "staffTask", [["patrol", "Patrol route"], ["inspect", "Inspect products"], ["carry", "Carry products"], ["replenish", "Replenish feeder"]])}</div><div className="grid grid-cols-2 gap-3">{([["beltSpeed", "Belt speed", 0.1, 1.5, 0.1], ["cycleTime", "Cycle time", 2, 30, 1]] as const).map(([key, label, min, max, step]) => <label key={key} className="block text-[10px] text-white/50">{t(label)}<input aria-label={t(label)} type="number" value={options[key]} min={min} max={max} step={step} onChange={(e) => set({ [key]: Math.max(min, Math.min(max, Number(e.target.value))) })} className="mt-1 w-full rounded border border-white/15 bg-[#202023] px-2 py-1.5 font-mono text-[12px]" /></label>)}</div>
<div className="mt-3"><h3 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">{t("Per-cell recipe")}</h3><div className="space-y-1.5">{Array.from({ length: Math.max(1, options.stages) }, (_, index) => <div key={index} className="grid grid-cols-[52px_1fr_1fr_92px] items-center gap-1.5"><span className="text-[9px] text-white/35">Cell {index + 1}</span><select aria-label={`Cell ${index + 1} input product`} value={options.cellInputs[index] ?? input} onChange={(e) => { const cellInputs = [...options.cellInputs]; cellInputs[index] = e.target.value; set({ cellInputs }); }} className="min-w-0 rounded border border-white/12 bg-[#202023] px-1 py-1 text-[10px]"><option value={input}>Default · {getProduct(input).name}</option>{PRODUCTS.slice(0, 30).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select aria-label={`Cell ${index + 1} output product`} value={options.cellOutputs[index] ?? output} onChange={(e) => { const cellOutputs = [...options.cellOutputs]; cellOutputs[index] = e.target.value; set({ cellOutputs }); }} className="min-w-0 rounded border border-white/12 bg-[#202023] px-1 py-1 text-[10px]"><option value={output}>Default · {getProduct(output).name}</option>{PRODUCTS.slice(0, 30).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select aria-label={`Cell ${index + 1} worker`} value={options.cellWorkers[index] ?? "robot"} onChange={(e) => { const cellWorkers = [...options.cellWorkers]; cellWorkers[index] = e.target.value as "robot" | "human"; set({ cellWorkers }); }} className="rounded border border-white/12 bg-[#202023] px-1 py-1 text-[10px]"><option value="robot">{t("Robot")}</option><option value="human">{t("Human")}</option></select></div>)}</div></div></div>}
          <div className="flex flex-wrap gap-4 border-t border-white/10 pt-3">{([["fences", "Safety fences"], ["operators", "Operators"], ["cabinets", "Control cabinets"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={options[key]} onChange={(e) => set(key === "operators" ? { operators: e.target.checked, staff: e.target.checked ? Math.max(1, options.staff) : 0 } : { [key]: e.target.checked })} className="accent-[var(--app-accent)]" />{t(label)}</label>)}</div>
        </div>
        <div className="space-y-4"><section><h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">{t("Layout preview")}</h3><div className="aspect-[400/270] overflow-hidden rounded border border-white/10"><FloorPlanView items={items} showLegend /></div><div className="mt-2 flex justify-between font-mono text-[10px] text-white/40"><span>{items.length} {t("components")}</span><span>{items.filter((i) => !!i.program).length} {t("robots")}</span></div></section>
          <section className="border-t border-white/10 pt-3"><h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/40">{t("Pallet pattern")}</h3><PalletPattern compact props={{ cols: options.cols, rows: options.rows, layers: options.layers, product: output }} onChange={(p) => set({ cols: Number(p.cols ?? options.cols), rows: Number(p.rows ?? options.rows), layers: Number(p.layers ?? options.layers) })} /></section>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3"><label className="flex items-center gap-2 text-[10px] text-white/45">{t("Seed")}<input aria-label={t("Seed")} type="number" value={options.seed} onChange={(e) => set({ seed: Math.max(0, Math.round(Number(e.target.value))) })} className="w-20 rounded border border-white/15 bg-[#202023] px-2 py-1.5 font-mono text-[12px] text-white" /></label><button type="button" onClick={() => set({ seed: Math.floor(Math.random() * 999) })} title={t("Random seed")} className="rounded border border-white/15 p-2 text-white/60 hover:bg-white/10"><Dices size={15} /></button></div>
          <p className="text-[10px] leading-relaxed text-white/35">{t("Recipes include live robot workflows, product transformations and pallet patterns.")}</p>{warnings.map((warning) => <p key={warning} className="text-[11px] leading-relaxed text-[#f2b14c]">{t(warning)}</p>)}{!validTool && <p className="text-[11px] text-[#f2b14c]">{t("Magnetic tools pick metal only. Other tools handle all products within payload limits.")}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#242427] px-5 py-3"><button type="button" onClick={() => { setOptions(DEFAULT_GEN); setPrompt(""); setInterpreted(""); }} className="text-[11px] text-white/45 hover:text-white">{t("Reset options")}</button><button type="button" disabled={!validTool || warnings.length > 0} onClick={build} className="flex items-center gap-2 rounded bg-[#287fbc] px-5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#379cdd] disabled:opacity-40"><Factory size={14} />{t("Build factory")}</button></div>
    </div>
  </div>;
}
