import { t, useLanguage } from "../i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Folder, Globe2, Layers, LayoutGrid, Maximize2, Minimize2, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { CATEGORIES, COMPONENTS } from "../data/library";
import { LAYOUTS } from "../data/layouts";
import type { Category, ComponentKind, LayoutPreset, SceneItem } from "../types";
import { ImportedThumbnail } from "./ImportedThumbnail";
import { PartIcon, partAccent } from "./PartIcon";
import { PolyHavenBrowser } from "./PolyHavenBrowser";
import type { ImportedModelData } from "../types";
import { cn } from "../utils/cn";

interface LibraryPanelProps {
  onAdd: (kind: ComponentKind) => void;
  catalog?: readonly SceneItem[];
  onAddCatalog?: (id:string) => void;
  onEditCatalog?: (id:string) => void;
  onLoadingChange?: (loading:boolean) => void;
  onImportModel: () => void;
  onLoadLayout: (layout: LayoutPreset) => void;
  activeLayoutId: string | null;
  onInfo: (message: string) => void;
  focusSignal: number;
  layoutsSignal?: number;
  /** Adds a model downloaded from the web catalogue through the normal import pipeline. */
  onImportedModel?: (model: ImportedModelData, warnings: string[]) => boolean | void;
}

type LibraryTab = "components" | "layouts" | "web";

export function LibraryPanel({ onAdd, catalog = [], onAddCatalog, onEditCatalog, onLoadingChange, onImportModel, onLoadLayout, activeLayoutId, focusSignal, layoutsSignal = 0, onInfo, onImportedModel }: LibraryPanelProps) {
  const language = useLanguage();
  const [tab, setTab] = useState<LibraryTab>("components");
  const [fullscreen, setFullscreen] = useState(false);
  const [category, setCategory] = useState<"All" | Category>("All");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (layoutsSignal > 0) setTab("layouts");
  }, [layoutsSignal]);

  useEffect(() => {
    if (focusSignal === 0) return;
    setTab("components");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [focusSignal]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return COMPONENTS.filter((component) => {
      if (component.kind === "imported-model") return false;
      const categoryMatch = category === "All" || component.category === category;
      const searchMatch =
        !query ||
        component.name.toLowerCase().includes(query) || t(component.name).toLowerCase().includes(query) ||
        component.category.toLowerCase().includes(query) ||
        component.description.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [category, search, language]);

  const imported = useMemo(() => {
    const seen = new Set<string>();
    return catalog.filter(item => {
      const id=item.imported?.asset.id;
      if(!id || seen.has(id)) return false;
      seen.add(id);
      return (category === "All" || category === "Storage") && (!search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase()));
    });
  },[catalog,category,search]);
  const robots = filtered.filter((item) => item.category === "Robots").length;
  const machines = filtered.filter((item) => item.category === "Machines").length;

  return (
    <aside className={cn("app-panel app-catalog flex min-h-0 min-w-0 flex-col border-r border-white/[0.12] bg-[#2d2d30]", fullscreen ? "fixed inset-2 z-[100] w-auto rounded-lg border shadow-2xl" : "w-full flex-1")}>
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
            <Layers size={11} />
          </span>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/50">{t("eCatalog")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded bg-white/[0.045] px-1.5 py-0.5 font-mono text-[8px] text-white/30">{COMPONENTS.length + imported.length}</span>
          <button type="button" aria-label={t(fullscreen ? "Exit fullscreen catalog" : "Fullscreen catalog")} title={t(fullscreen ? "Exit fullscreen catalog" : "Fullscreen catalog")} onClick={() => setFullscreen(!fullscreen)} className="rounded p-1.5 text-white/60 hover:bg-white/10">{fullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}</button>
        </div>
      </div>

      <div className="collections-tree shrink-0 border-b border-white/[0.06] px-2 py-2">
        <button type="button" onClick={() => setCategory("All")} className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-[10px] text-white/65 hover:bg-white/5"><ChevronDown size={11} />{t("Collections")}</button>
        <div className="mt-0.5 space-y-px pl-2">{[["All", "All Models"], ["Robots", "Robots"], ["Conveyors", "Conveyors"], ["Machines", "Machines"], ["Automation", "Automation"], ["Lighting", "Lighting"]].map(([id, label]) => <button key={id} type="button" onClick={() => { setTab("components"); setCategory(id as typeof category); }} className={cn("flex w-full items-center gap-1.5 rounded px-1 py-[3px] text-left text-[9.5px]", category === id ? "bg-[var(--app-accent)]/20 text-white" : "text-white/40 hover:text-white/75")}><Folder size={10} className={category === id ? "text-[var(--app-accent-bright)]" : "text-[#d4a742]/80"} />{t(label)}</button>)}</div>
      </div>
      <div className="grid shrink-0 grid-cols-3 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setTab("components")}
          className={cn(
            "relative flex items-center justify-center gap-1.5 py-2.5 text-[10.5px] font-medium transition",
            tab === "components" ? "text-[#f0f0f0]" : "text-white/35 hover:text-white/70",
          )}
        >
          <LayoutGrid size={11} /> {t("Components")} {tab === "components" && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-t bg-[var(--app-accent)]" />}
        </button>
        <button
          type="button"
          onClick={() => setTab("layouts")}
          className={cn(
            "relative flex items-center justify-center gap-1.5 py-2.5 text-[10.5px] font-medium transition",
            tab === "layouts" ? "text-[#f0f0f0]" : "text-white/35 hover:text-white/70",
          )}
        >
          <Sparkles size={11} /> {t("Layouts")} <span className="rounded bg-white/[0.06] px-1 text-[7.5px] text-white/35">{LAYOUTS.length}</span>
          {tab === "layouts" && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-t bg-[var(--app-accent)]" />}
        </button>
        <button
          type="button"
          onClick={() => setTab("web")}
          className={cn(
            "relative flex items-center justify-center gap-1.5 py-2.5 text-[10.5px] font-medium transition",
            tab === "web" ? "text-[#f0f0f0]" : "text-white/35 hover:text-white/70",
          )}
        >
          <Globe2 size={11} /> {t("Web")}
          {tab === "web" && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-t bg-[var(--app-accent)]" />}
        </button>
      </div>

      {tab === "web" ? (
        <PolyHavenBrowser onImported={(model, warnings) => onImportedModel?.(model, warnings)} onInfo={onInfo} onLoadingChange={onLoadingChange} />
      ) : tab === "components" ? (
        <>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <button type="button" onClick={onImportModel} className="mb-2 flex w-full items-center justify-center gap-2 rounded border border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 px-2 py-2 text-[11px] font-medium text-[var(--app-accent-bright)] hover:bg-[var(--app-accent)]/20"><Upload size={13}/>{t("Import 3D model")}</button>
            <div className="group flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#1e1e1e] px-2 py-1.5 transition focus-within:border-[var(--app-accent)]/40 focus-within:bg-[#1e1e1e]">
              <Search size={12} className="shrink-0 text-white/25 group-focus-within:text-[var(--app-accent)]/70" />
              <input
                ref={inputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search components...")}
                className="w-full bg-transparent text-[10.5px] text-white/75 outline-none placeholder:text-white/25"
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} className="text-white/30 hover:text-white/70">
                  <X size={11} />
                </button>
              ) : (
                <kbd className="rounded border border-white/[0.08] px-1 font-mono text-[8px] text-white/20">/</kbd>
              )}
            </div>
          </div>

          <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto px-3 pb-2.5">
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <button
                  key={t(item)}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-[3px] text-[8.5px] font-medium transition",
                    active
                      ? "border-[var(--app-accent)]/35 bg-[var(--app-accent)]/10 text-[#8fc9f5]"
                      : "border-white/[0.08] bg-transparent text-white/35 hover:border-white/20 hover:text-white/65",
                  )}
                >
                  {t(item)}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-between px-3 pb-1.5">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
              {filtered.length} {t("components")} </span>
            <span className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wide text-white/20">
              <span className="h-1 w-1 rounded-full bg-[var(--teal)]" /> {t("Drag into scene")} </span>
          </div>

          <div className={cn("thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2", fullscreen && "grid auto-rows-max grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-4")}>
            {imported.map(item => <div key={item.id} className="group relative mb-1 flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] p-2" draggable onDragStart={event => {event.dataTransfer.setData("application/x-factory-catalog",item.id);event.dataTransfer.effectAllowed="copy";}}>
              <button type="button" onClick={()=>onAddCatalog?.(item.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`${t("Add imported model")}: ${item.name}`}><ImportedThumbnail model={item.imported!} className={fullscreen?"h-20 w-20 shrink-0 object-contain":"h-12 w-12 shrink-0 object-contain"}/><span className="min-w-0"><span className="block truncate text-[11px] text-white/85">{item.name}</span><span className="block text-[9px] text-white/40">{item.imported!.meshCount} {t("meshes")} · {item.imported!.triangleCount.toLocaleString()} {t("triangles")}</span></span></button>
              <button type="button" onClick={()=>onEditCatalog?.(item.id)} aria-label={`${t("Edit catalog model")}: ${item.name}`} className="rounded px-2 py-1 text-[10px] text-white/55 hover:bg-white/10">{t("Edit")}</button>
            </div>)}
            {filtered.map((component) => {
              const accent = partAccent(component.kind);
              return (
                <button
                  key={component.kind}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-factory-component", component.kind);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(component.kind)}
                  className={cn("group relative mb-1 flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-white/[0.09] hover:bg-white/[0.045]", fullscreen && "min-h-[120px] border-white/10 bg-white/[0.03] p-3")}
                >
                  <span className={cn("relative flex h-[42px] w-[48px] shrink-0 items-center justify-center rounded border border-white/[0.07] bg-[#3a3a3d]",fullscreen && "h-20 w-20")}>
                    <PartIcon kind={component.kind} className={cn("h-[36px] w-[42px] transition duration-200 group-hover:scale-[1.06]",fullscreen && "h-16 w-16")} />
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] opacity-50"
                      style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                    />
                    <span className="absolute right-0 top-0 flex h-4 w-4 translate-x-1 -translate-y-1 items-center justify-center rounded-full bg-[var(--app-accent)] text-[#ffffff] opacity-0 shadow transition group-hover:opacity-100">
                      <Plus size={9} strokeWidth={3} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[10.5px] font-medium text-[#e6e6e6]">{t(component.name)}</span>
                      {component.badge && (
                        <span
                          className="rounded px-1 py-px font-mono text-[6.5px] uppercase tracking-wider"
                          style={{ color: accent, backgroundColor: `${accent}16` }}
                        >
                          {t(component.badge)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] text-white/28">
                      <span style={{ color: `${accent}aa` }}>{t(component.category)}</span>
                      <span className="text-white/15">/</span>
                      <span>{t(component.specs[0].value)} {t(component.specs[0].label)}</span>
                    </span>
                  </span>
                  <ChevronRight size={11} className="shrink-0 text-white/10 transition group-hover:text-white/40" />
                </button>
              );
            })}
            {filtered.length === 0 && imported.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <Search size={20} className="text-white/20" />
                <p className="text-[11px] text-white/45">{t("No components found")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                  className="rounded border border-white/10 px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-white/40 hover:text-white/70"
                > {t("Clear filters")} </button>
              </div>
            )}

          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-wider text-white/25">
              <span>{robots} {t("robots ·")} {machines} {t("machines")}</span>
              <span className="flex items-center gap-1 text-[var(--teal)]/70">
                <span className="h-1 w-1 rounded-full bg-[var(--teal)]" /> {t("Local catalog")} </span>
            </div>

          </div>
        </>
      ) : (
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pt-3">
          <div className="mb-3 rounded-md border border-[var(--app-accent)]/15 bg-gradient-to-br from-[var(--app-accent)]/[0.08] to-transparent p-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-[var(--app-accent)]" />
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8fc9f5]">{t("Ready-to-run layouts")}</span>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-white/40"> {t("Start from an engineered line, then adapt equipment, routes and takt times.")} </p>
          </div>
          {LAYOUTS.map((layout) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              active={activeLayoutId === layout.id}
              onLoad={() => onLoadLayout(layout)}
            />
          ))}
          <button
            type="button"
            onClick={() => onLoadLayout({ ...LAYOUTS[0], id: "blank", name: "Blank Factory", items: [] })}
            className="group mt-1 flex w-full items-center gap-3 rounded-md border border-dashed border-white/[0.12] px-3 py-3 text-left transition hover:border-[var(--app-accent)]/40 hover:bg-white/[0.03]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/40 transition group-hover:border-[var(--app-accent)]/30 group-hover:text-[var(--app-accent)]">
              <Plus size={15} />
            </span>
            <span>
              <span className="block text-[10.5px] font-medium text-white/65 transition group-hover:text-white">{t("Start from empty floor")}</span>
              <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-wide text-white/25">{t("Infinite floor · Grid on")}</span>
            </span>
          </button>
          <div className="h-4" />
        </div>
      )}
    </aside>
  );
}

function LayoutCard({
  layout,
  active,
  onLoad,
}: {
  layout: LayoutPreset;
  active: boolean;
  onLoad: () => void;
}) {
  const previewItems = layout.items.filter((item) => item.kind !== "fence" && item.kind !== "cabinet" && item.kind !== "operator");
  const xs = layout.items.map((item) => item.position[0]);
  const zs = layout.items.map((item) => item.position[2]);
  const minX = Math.min(...xs, -4) - 2;
  const maxX = Math.max(...xs, 4) + 2;
  const minZ = Math.min(...zs, -3) - 2;
  const maxZ = Math.max(...zs, 3) + 2;
  return (
    <button
      type="button"
      onClick={onLoad}
      title={t("Open layout")}
      className={cn(
        "group mb-2.5 w-full overflow-hidden rounded-md border bg-[#252526] text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]",
        active ? "border-[#f5a623]/45" : "border-white/[0.08] hover:border-white/25 hover:bg-[#2a2a2c]",
      )}
    >
      <div className="relative h-[104px] overflow-hidden bg-[#333335] group-hover:bg-[#3a3a3c]">
        {/* VC-style isometric floor */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: "translate(-50%,-50%) rotateX(55deg) rotateZ(45deg)" }}>
          <div className="relative" style={{ width: 190, height: 190, transform: "scale(0.82)" }}>
            <div className="absolute inset-0 rounded-[10px] bg-[#f5a623]/90" style={{ boxShadow: "0 0 40px rgba(245,166,35,.25)" }} />
            <div
              className="absolute inset-0 rounded-[10px]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(60,35,8,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(60,35,8,.35) 1px, transparent 1px)",
                backgroundSize: "23px 23px",
              }}
            />
            <div className="absolute inset-2 rounded-[8px] border border-[#7a4a12]/50" />
            {previewItems.map((item, index) => {
              const accent = item.color || partAccent(item.kind);
              const left = ((item.position[0] - minX) / (maxX - minX)) * 100;
              const top = ((item.position[2] - minZ) / (maxZ - minZ)) * 100;
              const size = item.kind === "rack" ? 9 : item.kind === "conveyor" ? 6 : item.kind === "operator" ? 4 : 7;
              return (
                <span
                key={`${item.id}-${index}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px] transition duration-300 group-hover:scale-110"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  backgroundColor: accent,
                  opacity: 0.9,
                  boxShadow: `0 0 8px ${accent}66`,
                }}
              />
              );
            })}
          </div>
        </div>
        <span className="absolute bottom-1.5 left-2 rounded bg-[#1c1c1e]/85 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-white/50">
          {layout.items.length} {t("assets")}
        </span>
        <span className="absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider" style={{ color: layout.accent, background: `${layout.accent}15` }}>
          {t(layout.eyebrow)}
        </span>
        <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e]/0 opacity-0 transition group-hover:bg-[#1c1c1e]/45 group-hover:opacity-100">
          <span className="rounded bg-[#f5a623] px-3 py-1 text-[9px] font-semibold text-[#241a05] shadow-lg">
          {t("Open layout")}
          </span>
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium text-[#ececec]">{t(layout.name)}</span>
          {active && <span className="shrink-0 font-mono text-[7px] uppercase tracking-wider text-[#f5a623]">{t("Active")}</span>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[8.5px] leading-relaxed text-white/28">{t(layout.description)}</p>
        <div className="mt-2 flex items-center gap-3 border-t border-white/[0.05] pt-1.5">
          {layout.stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1">
              <span className="font-mono text-[9px] font-medium text-white/60">{stat.value}</span>
              <span className="font-mono text-[7px] uppercase tracking-wide text-white/25">{t(stat.label)}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
