import { Bot, Boxes, Braces, Factory, FolderOpen, Move3D, MousePointer2, Redo2, Rotate3D, SlidersHorizontal, Undo2, Wrench } from "lucide-react";
import type { ToolMode } from "../types";
import { getLanguage, setLanguage, t } from "../i18n";
import { useAppearance, SKINS } from "../theme";
import { cn } from "../utils/cn";
import { BrandMark } from "./PartIcon";
import { SettingsWindow, type SettingsWindowProps } from "./SettingsWindow";

export type TouchPanel = "library" | "inspector" | "program" | "project" | "tools" | null;
export function MobileChrome({ project, tool, setTool, undo, redo, canUndo, canRedo, onProject, onFactory }: { project: string; tool: ToolMode; setTool: (tool: ToolMode) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; onProject: () => void; onFactory: () => void }) {
  const { skin } = useAppearance();
  return <header className="shrink-0 border-b border-white/10 bg-[#242428]">
    <div className="flex h-[56px] items-center gap-2.5 px-3"><BrandMark className="h-8 w-8" /><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold tracking-tight text-white">{SKINS[skin].appName.replace(" 5.1", "")} <span className="font-mono text-[10px] font-normal text-[var(--app-accent-bright)]">5.1</span></div><div className="max-w-[200px] truncate text-[10px] text-white/40">{t(project)}</div></div><button type="button" onClick={() => setLanguage(getLanguage() === "en" ? "ru" : "en")} title={t("Language")} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 font-mono text-[11px] text-white/70">{getLanguage().toUpperCase()}</button><button type="button" onClick={onFactory} aria-label={t("AI Factory")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f2b14c]/10 text-[#f2b14c]"><Factory size={18} /></button><button type="button" onClick={onProject} aria-label={t("Project")} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/70"><FolderOpen size={19} /></button></div>
    <div className="no-scrollbar h-[46px] overflow-x-auto border-t border-white/5 px-3 pb-1"><div className="flex h-full w-max min-w-full items-center gap-1">
      {([ ["select", "Select", MousePointer2], ["move", "Move", Move3D], ["rotate", "Rotate", Rotate3D] ] as const).map(([id, name, Icon]) => <button key={id} type="button" aria-label={t(name)} onClick={() => setTool(id)} className={cn("flex h-9 min-w-16 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] transition", tool === id ? "bg-[#286f9f] text-white" : "text-white/45")}><Icon size={15} />{t(name)}</button>)}
      <div className="ml-auto flex items-center border-l border-white/10 pl-2"><button type="button" onClick={undo} disabled={!canUndo} aria-label={t("Undo")} className="flex h-10 w-10 items-center justify-center text-white/60 disabled:opacity-20"><Undo2 size={16} /></button><button type="button" onClick={redo} disabled={!canRedo} aria-label={t("Redo")} className="flex h-10 w-10 items-center justify-center text-white/60 disabled:opacity-20"><Redo2 size={16} /></button></div>
    </div></div>
  </header>;
}

export function MobileNav({ panel, setPanel, onFactory }: { panel: TouchPanel; setPanel: (panel: TouchPanel) => void; onFactory: () => void }) {
  return <nav aria-label={t("Touch workspace")} className="touch-nav flex shrink-0 items-center border-t border-white/10 bg-[#242428] px-1 pt-1">{([ [null, "Scene", Bot], ["library", "Catalog", Boxes], ["program", "Program", Braces], ["inspector", "Properties", SlidersHorizontal], ["tools", "Tools", Wrench] ] as const).map(([id, label, Icon]) => <button key={label} type="button" onClick={() => setPanel(id === panel ? null : id)} className={cn("flex min-h-[53px] flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[9px] transition", panel === id ? "text-[var(--app-accent-bright)]" : "text-white/45")}><Icon size={19} />{t(label)}</button>)}<button type="button" onClick={onFactory} className="flex min-h-[53px] flex-1 flex-col items-center justify-center gap-1 text-[9px] text-[#f2b14c]"><Factory size={19} />{t("Factory")}</button></nav>;
}

export function ProjectSettings(props: SettingsWindowProps) {
  return <SettingsWindow {...props} />;
}
