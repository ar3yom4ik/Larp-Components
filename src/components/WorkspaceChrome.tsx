import { useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Boxes,
  Braces,
  Check,
  Copy,
  ClipboardPaste,
  Download,
  Factory,
  FilePlus2,
  FolderOpen,
  HelpCircle,
  Keyboard,
  Palette,
  Minus,
  Move3D,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Rotate3D,
  Save,
  Search,
  Share2,
  Shield,
  Sparkles,
  Spline,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  Wand2,
  Warehouse,
  BookOpen,
  Bot,
  Cog,
  Package,
  Settings2,
  LayoutGrid,
  Columns3,
  PanelBottom,
  Users,
} from "lucide-react";
import { BrandMark } from "./PartIcon";
import { cn } from "../utils/cn";
import type { ComponentKind, SceneItem, ToolMode } from "../types";
import { getLanguage, setLanguage, t } from "../i18n";
import { useAppearance, SKINS } from "../theme";
import { openSettings } from "../settingsWindow";
import { isRobotKind } from "../utils/kinds";
import { resetLayout, setPanel, useLayout } from "../layout";
import { PanelToggles } from "./PanelShell";

export interface ChromeProps {
  onSettings: () => void;
  onMultiplayer: () => void;
  onCopy: () => void;
  onPaste: () => void;
  exportedName: string | null;
  projectName: string;
  onRenameProject: (name: string) => void;
  tool: ToolMode;
  setTool: (tool: ToolMode) => void;
  snap: boolean;
  onToggleSnap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selected: SceneItem | null;
  selectedPoint: number | null;
  onDuplicate: () => void;
  onDelete: () => void;
  running: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onAddKind: (kind: ComponentKind) => void;
  onAutoArrange: () => void;
  onOpenGenerator: () => void;
  onNewProject: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportArchive: () => void;
  onImport: (file: File) => void;
  onImportModel: () => void;
  onShare: () => void;
  onSearch: () => void;
  onToast: (message: string, tone?: "success" | "info") => void;
  onAddPoint: () => void;
  onRemovePoint: () => void;
  onReversePath: () => void;
  onEditProgram: () => void;
  onTemplate: (template: "palletize" | "tend") => void;
  onShowApi: () => void;
  onShowLayouts: () => void;
}

type TabId = "home" | "process" | "modeling" | "program" | "drawing" | "help" | "connectivity";

function RibbonButton({
  icon,
  label,
  onClick,
  active,
  disabled,
  title,
  accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={cn(
        "group flex h-[62px] min-w-[58px] flex-col items-center justify-center gap-1 rounded-[3px] border px-1.5 text-[11px] leading-none transition disabled:cursor-not-allowed disabled:opacity-35",
        active
          ? "border-[var(--app-accent)] bg-[var(--app-accent-deep)]/75 text-white"
          : "border-transparent text-[#dcdcdc] hover:border-white/20 hover:bg-white/[0.07]",
      )}
    >
      <span className={cn("flex h-7 items-center justify-center", accent)}>{icon}</span>
      <span className="max-w-[104px] whitespace-nowrap text-center">{t(label)}</span>
    </button>
  );
}

function SmallButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={cn(
        "flex h-[19px] items-center gap-1.5 rounded-[3px] px-1.5 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-35",
        active ? "bg-[var(--app-accent-deep)]/75 text-white" : "text-[#dcdcdc] hover:bg-white/[0.08]",
      )}
    >
      <span className="flex w-4 justify-center">{icon}</span>
      <span className="whitespace-nowrap">{t(label)}</span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col border-r border-white/[0.09] px-1.5 last:border-r-0">
      <div className="flex flex-1 items-center gap-0.5 pt-1">{children}</div>
      <div className="pb-0.5 pt-0.5 text-center text-[10.5px] text-[#bdbdbd]">{t(label)}</div>
    </div>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col justify-center">{children}</div>;
}

/**
 * Window commands: show or hide each dock panel, detach it, and reset the whole
 * arrangement. The same panel states drive the resize/detach handles on the panels.
 */
function LayoutGroup() {
  const layout = useLayout();
  const entries: { id: "catalog" | "inspector" | "dock"; label: string; icon: ReactNode }[] = [
    { id: "catalog", label: "Catalog", icon: <Columns3 size={22} className="text-[var(--app-accent-bright)]" /> },
    { id: "inspector", label: "Properties", icon: <Settings2 size={22} className="text-[#96b7d1]" /> },
    { id: "dock", label: "Output", icon: <PanelBottom size={22} className="text-[var(--teal)]" /> },
  ];
  return (
    <>
      <Stack>
        {entries.map((entry) => (
          <SmallButton
            key={entry.id}
            icon={entry.icon}
            label={t(layout[entry.id].open ? `Hide ${entry.label}` : `Show ${entry.label}`)}
            onClick={() => setPanel(entry.id, { open: !layout[entry.id].open })}
          />
        ))}
      </Stack>
      <Stack>
        <SmallButton icon={<LayoutGrid size={13} />} label={t("Reset layout")} onClick={resetLayout} title={t("Restore the default panel arrangement")} />
        <div className="px-1 py-0.5"><PanelToggles /></div>
      </Stack>
    </>
  );
}

export function AppChrome(props: ChromeProps) {
  const { skin, accent } = useAppearance();
  const accentColor = accent ?? SKINS[skin].accent;
  const [tab, setTab] = useState<TabId>("home");
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.projectName);
  const importInput = useRef<HTMLInputElement>(null);
  const isConveyor = props.selected?.kind === "conveyor" || props.selected?.kind === "roller" || props.selected?.kind === "fence" || (props.selected?.kind === "wall" && !!props.selected.points);
  const isRobot = props.selected ? isRobotKind(props.selected.kind) : false;

  const finishRename = () => {
    const next = draft.trim();
    if (next) props.onRenameProject(next);
    else setDraft(props.projectName);
    setEditing(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "home", label: "HOME" }, { id: "process", label: "PROCESS" }, { id: "modeling", label: "MODELING" },
    { id: "program", label: "PROGRAM" }, { id: "drawing", label: "DRAWING" }, { id: "help", label: "HELP" }, { id: "connectivity", label: "CONNECTIVITY" },
  ];

  const add = (kind: ComponentKind, label: string, icon: ReactNode, accent?: string) => (
    <RibbonButton key={kind} icon={icon} label={t(label)} accent={accent} onClick={() => props.onAddKind(kind)} />
  );

  return (
    <header className="app-ribbon relative z-40 shrink-0 select-none bg-[#2b2b2d] text-[#e6e6e6]">
      {/* Title bar */}
      <div className="app-titlebar flex h-[30px] items-center bg-[#1c1c1e] px-2">
        <BrandMark className="h-[18px] w-[18px]" />
        <div className="flex-1 truncate text-center text-[13px] text-[#e8e8e8]">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={finishRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") finishRename();
                if (event.key === "Escape") {
                  setDraft(props.projectName);
                  setEditing(false);
                }
              }}
              className="w-[220px] rounded-sm border border-[var(--app-accent)] bg-[#2b2b2d] px-1.5 py-0 text-center text-[12px] text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(props.projectName);
                setEditing(true);
              }}
              className="group inline-flex items-center gap-1.5 hover:text-white"
              title={t("Rename project")}
            >
              {t(props.projectName)} - {SKINS[skin].appName} <Pencil size={10} className="text-white/0 transition group-hover:text-white/50" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 pr-1 text-[#bdbdbd]">
          <span className="hidden items-center gap-1 text-[10px] text-[#8f8f93] sm:flex">
            <Check size={10} className="text-[var(--green)]" /> {props.exportedName ? `${t("Saved")} · ${props.exportedName}` : t("Auto-saved")} </span>
          <span className="h-px w-3 bg-current" />
          <button type="button" onClick={() => openSettings("interface")} title={t("Colours and layout")} aria-label={t("Colours and layout")} className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"><span className="h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: accentColor }} /><Palette size={12} /></button>
          <span className="text-[13px] leading-none">✕</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="app-tabbar flex h-[27px] items-end bg-[#1c1c1e] pl-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((value) => !value)}
            className="app-file-tab h-[27px] bg-[var(--file-bg)] px-5 text-[12px] tracking-wide text-white transition hover:bg-[var(--file-hover)]"
          > {t("FILE")} </button>
          {menu && (
            <>
              <button type="button" aria-label={t("Close menu")} className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} />
              <div className="app-menu absolute left-0 top-full z-50 w-[250px] border border-white/10 bg-[#2b2b2d] py-1 shadow-[0_14px_36px_rgba(0,0,0,.55)]">
                {[
                  { icon: <FilePlus2 size={14} />, label: "New factory", hint: "Ctrl+N", fn: props.onNewProject },
                  { icon: <FolderOpen size={14} />, label: "Browse layouts", hint: "", fn: props.onShowLayouts },
                  { icon: <Save size={14} />, label: "Save project", hint: "Ctrl+S", fn: props.onSave },
                  { icon: <Download size={14} />, label: "Export copy (.txt)", hint: "", fn: props.onExport },
                  { icon: <Download size={14} />, label: "Export copy (.lcmx)", hint: "", fn: props.onExportArchive },
                  { icon: <Upload size={14} />, label: "Import project (.lcmx / .txt / .json)", hint: "", fn: () => importInput.current?.click() },
                  { icon: <Boxes size={14} />, label: "Import 3D model", hint: "", fn: props.onImportModel },
                ].map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    onClick={() => {
                      entry.fn();
                      setMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-[12px] text-[#dcdcdc] hover:bg-[var(--app-accent-deep)]"
                  >
                    <span className="text-white/60">{entry.icon}</span>
                    <span className="flex-1">{t(entry.label)}</span>
                    <span className="font-mono text-[9px] text-white/35">{entry.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              "h-[27px] border-x border-t px-4 text-[12px] tracking-wide transition",
              tab === entry.id ? "app-tab-active border-white/[0.14] bg-[#2b2b2d] text-white" : "border-transparent text-[#c8c8c8] hover:text-white",
            )}
          >
            {t(entry.label)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 pb-[2px] pr-2">
          <button
            type="button"
            onClick={props.onSearch}
            className="hidden items-center gap-2 rounded-sm border border-white/10 bg-[#2b2b2d] px-2 py-[3px] text-[10.5px] text-[#9a9a9e] transition hover:text-white lg:flex"
          >
            <Search size={11} /> {t("Search catalog")} <kbd className="rounded-sm border border-white/10 px-1 font-mono text-[8px]">{t("Ctrl K")}</kbd>
          </button>
          <button type="button" onClick={() => setLanguage(getLanguage() === "en" ? "ru" : "en")} title={t("Language")} className="ml-1 rounded-sm border border-white/10 px-1.5 py-1 font-mono text-[9px] text-[#b8d9f3]">{getLanguage().toUpperCase()}</button>
          <button type="button" onClick={props.onSettings} title={t("Settings")} className="rounded-sm p-1.5 text-white/50 hover:bg-white/10"><Settings2 size={13} /></button>
          <button type="button" onClick={props.onShare} className="rounded-sm p-1.5 text-[#bdbdbd] transition hover:bg-white/10 hover:text-white" title={t("Copy share link")}>
            <Share2 size={13} />
          </button>
          <button type="button" onClick={props.onSave} className="rounded-sm p-1.5 text-[#bdbdbd] transition hover:bg-white/10 hover:text-white" title={t("Save project to its exported file (Ctrl+S)")}>
            <Save size={13} />
          </button>
          <button
            type="button"
            onClick={() => props.onToast("Help: Ctrl+K search · V/M/R tools · Space play · Ctrl+Z undo", "info")}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--app-accent)] text-[11px] font-semibold text-white"
          >
            ?
          </button>
        </div>
      </div>

      {/* Ribbon */}
      <div className="app-ribbon app-ribbon-tools flex h-[88px] items-stretch overflow-x-auto border-y border-white/[0.14] bg-[#2b2b2d] px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab === "home" && (
          <>
            <Group label={t("Clipboard")}>
              <Stack>
                <SmallButton icon={<Copy size={13} />} label={t("Copy")} onClick={props.onCopy} disabled={!props.selected} />
                <SmallButton icon={<ClipboardPaste size={13} />} label={t("Paste")} onClick={props.onPaste} />
                <SmallButton icon={<Trash2 size={13} />} label={t("Delete")} onClick={props.onDelete} disabled={!props.selected} />
              </Stack>
              <Stack>
                <SmallButton icon={<Undo2 size={13} />} label={t("Undo")} onClick={props.onUndo} disabled={!props.canUndo} />
                <SmallButton icon={<Redo2 size={13} />} label={t("Redo")} onClick={props.onRedo} disabled={!props.canRedo} />
              </Stack>
            </Group>
            <Group label={t("Manipulation")}>
              <RibbonButton icon={<MousePointer2 size={22} className="text-[#f2c230]" />} label={t("Select")} active={props.tool === "select"} onClick={() => props.setTool("select")} title={t("Select (V)")} />
              <RibbonButton icon={<Move3D size={22} className="text-[var(--green)]" />} label={t("Move")} active={props.tool === "move"} onClick={() => props.setTool("move")} title={t("Move (M)")} />
              <RibbonButton icon={<Rotate3D size={22} className="text-[var(--app-accent)]" />} label={t("Rotate")} active={props.tool === "rotate"} onClick={() => props.setTool("rotate")} title={t("Rotate (R)")} />
            </Group>
            <Group label={t("Grid Snap")}>
              <Stack>
                <button type="button" onClick={props.onToggleSnap} className="flex h-[22px] items-center gap-2 px-1.5 text-[11px] text-[#dcdcdc] hover:bg-white/[0.07]">
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center border", props.snap ? "border-[var(--app-accent)] bg-[var(--app-accent-deep)]" : "border-white/40")}>
                    {props.snap && <Check size={10} className="text-white" />}
                  </span> {t("Snap 0.25 m")} </button>
                <SmallButton icon={<Wand2 size={13} />} label={t("Auto-arrange")} onClick={props.onAutoArrange} />
              </Stack>
            </Group>
            <Group label={t("Spline")}>
              <Stack>
                <SmallButton icon={<Plus size={13} />} label={t("Add point")} onClick={props.onAddPoint} disabled={!isConveyor} />
                <SmallButton icon={<Minus size={13} />} label={t("Remove point")} onClick={props.onRemovePoint} disabled={!isConveyor || props.selectedPoint === null} />
                <SmallButton icon={<ArrowLeftRight size={13} />} label={t("Reverse flow")} onClick={props.onReversePath} disabled={!isConveyor} />
              </Stack>
            </Group>
            <Group label={t("Simulation")}>
              <RibbonButton
                icon={props.running ? <Pause size={22} className="text-[var(--teal)]" fill="currentColor" /> : <Play size={22} className="text-[var(--green)]" fill="currentColor" />}
                label={t(props.running ? "Pause" : "Play")}
                onClick={props.onToggleRun}
                active={props.running}
                title={t("Play / pause (Space)")}
              />
              <RibbonButton icon={<RotateCcw size={22} className="text-[#dcdcdc]" />} label={t("Reset")} onClick={props.onReset} />
            </Group>
            <Group label={t("3D assets")}>
              <RibbonButton icon={<Boxes size={22} className="text-[var(--app-accent-bright)]" />} label={t("Import model")} onClick={props.onImportModel} title={t("Import 3D model")} />
            </Group>
            <Group label={t("Export")}>
              <Stack>
                <SmallButton icon={<Download size={13} />} label={t("Export copy")} onClick={props.onExport} />
                <SmallButton icon={<Upload size={13} />} label={t("Import project")} onClick={() => importInput.current?.click()} />
              </Stack>
            </Group>
            <Group label={t("Configuration")}>
              <RibbonButton icon={<Factory size={22} className="text-[#f2a33a]" />} label={t("AI Factory")} onClick={props.onOpenGenerator} title={t("Procedural factory generator")} />
              <RibbonButton icon={<Braces size={22} className="text-[#c99bff]" />} label={t("Program")} onClick={props.onEditProgram} disabled={!isRobot} title={t("Edit the selected robot's program")} />
            </Group>
            <Group label={t("Windows")}>
              <LayoutGroup />
            </Group>
          </>
        )}

        {tab === "modeling" && (
          <>
            <Group label={t("Robots")}>
              {add("robot", "Robot", <Bot size={22} />, "text-[var(--green)]")}
              {add("cobot", "Cobot", <Bot size={20} />, "text-[#a5d77b]")}
            </Group>
            <Group label={t("Conveyors")}>
              {add("conveyor", "Spline conveyor", <Spline size={22} />, "text-[var(--app-accent)]")}
              {add("roller", "Roller", <Spline size={22} />, "text-[#8fb5dc]")}
              {add("feeder", "Feeder", <Package size={22} />, "text-[#f2a33a]")}
            </Group>
            <Group label={t("Machines")}>
              {add("cnc", "CNC", <Cog size={22} />, "text-[#f2a33a]")}
              {add("press", "Press", <Cog size={22} />, "text-[#e58a62]")}
              {add("weld", "Weld cell", <Sparkles size={22} />, "text-[#e8c24d]")}
              {add("packaging", "Case packer", <Boxes size={22} />, "text-[#c98bd0]")}
            </Group>
            <Group label={t("Logistics")}>
              {add("crates", "Pallet", <Boxes size={22} />, "text-[#b88a55]")}
              {add("rack", "Racking", <Warehouse size={22} />, "text-[#e07b2a]")}
              {add("amr", "AMR", <Bot size={22} />, "text-[#35b5c4]")}
              {add("forklift", "Forklift", <Warehouse size={22} />, "text-[#f0a92e]")}
            </Group>
            <Group label={t("Safety & people")}>
              {add("fence", "Fence", <Shield size={22} />, "text-[#f2c230]")}
              {add("cabinet", "Cabinet", <Boxes size={22} />, "text-[#8da2c7]")}
              {add("operator", "Operator", <UserRound size={22} />, "text-[var(--teal)]")}
            </Group>
          </>
        )}

        {tab === "program" && (
          <>
            <Group label={t("Robot program")}>
              <RibbonButton icon={<Braces size={22} className="text-[#c99bff]" />} label={t("Edit program")} onClick={props.onEditProgram} disabled={!isRobot} />
              <RibbonButton icon={<Package size={22} className="text-[#b88a55]" />} label={t("Palletizer")} onClick={() => props.onTemplate("palletize")} disabled={!isRobot} title={t("Load the palletizing template")} />
              <RibbonButton icon={<Cog size={22} className="text-[#f2a33a]" />} label={t("Machine tending")} onClick={() => props.onTemplate("tend")} disabled={!isRobot} title={t("Load the machine tending template")} />
            </Group>
            <Group label={t("Simulation")}>
              <RibbonButton
                icon={props.running ? <Pause size={22} className="text-[var(--teal)]" fill="currentColor" /> : <Play size={22} className="text-[var(--green)]" fill="currentColor" />}
                label={t(props.running ? "Pause" : "Play")}
                onClick={props.onToggleRun}
                active={props.running}
              />
              <RibbonButton icon={<RotateCcw size={22} />} label={t("Reset")} onClick={props.onReset} />
            </Group>
            <Group label={t("Reference")}>
              <RibbonButton icon={<BookOpen size={22} className="text-[var(--app-accent)]" />} label={t("API reference")} onClick={props.onShowApi} />
            </Group>
          </>
        )}

        {tab === "process" && (
          <>
            <Group label={t("Production flow")}>
              {add("feeder", "Feeder", <Package size={22} />, "text-[#f2a33a]")}
              {add("conveyor", "Spline conveyor", <Spline size={22} />, "text-[var(--app-accent)]")}
              {add("crates", "Pallet", <Boxes size={22} />, "text-[#b88a55]")}
              {add("collector", "Receive box", <Boxes size={22} />, "text-[#d0a263]")}
            </Group>
            <Group label={t("Operations")}>
              {add("paint", "Paint station", <Wand2 size={22} />, "text-[#ebcb76]")}
              {add("assembly", "Assembly", <Braces size={22} />, "text-[#96b7d1]")}
              {add("cutter", "Laser cutter", <Spline size={22} />, "text-[#f5a555]")}
              {add("kiln", "Kiln", <Factory size={22} />, "text-[#dc8154]")}
            </Group>
            <Group label={t("Resources")}>
              {add("operator", "Operator", <UserRound size={22} />, "text-[var(--teal)]")}
              {add("mobile-robot", "Mobile robot", <Bot size={22} />, "text-[#4bc1b8]")}
              <RibbonButton icon={<Braces size={22} className="text-[#c99bff]" />} label={t("Program")} onClick={props.onEditProgram} disabled={!isRobot} />
            </Group>
            <Group label={t("Process engineering")}>
              <RibbonButton icon={<Factory size={22} className="text-[#f2a33a]" />} label={t("AI Factory")} onClick={props.onOpenGenerator} />
            </Group>
          </>
        )}
        {tab === "connectivity" && (
          <>
            <Group label={t("Automation")}>
              {add("button", "Push button", <MousePointer2 size={22} />, "text-[#de5c52]")}
              {add("laser", "Laser trigger", <Sparkles size={22} />, "text-[#f05c5c]")}
              {add("sensor", "Proximity sensor", <Shield size={22} />, "text-[#63c5f0]")}
              {add("plc", "PLC control", <Boxes size={22} />, "text-[#8fa9c2]")}
            </Group>
            <Group label={t("Multiplayer")}><RibbonButton icon={<Users size={22} className="text-[var(--app-accent)]" />} label={t("Multiplayer")} onClick={props.onMultiplayer} /></Group>
            <Group label={t("Robot I/O")}>
              <RibbonButton icon={<BookOpen size={22} className="text-[var(--app-accent)]" />} label={t("Signals & API")} onClick={props.onShowApi} />
            </Group>
            <Group label={t("Simulation")}>
              <RibbonButton icon={props.running ? <Pause size={22} className="text-[var(--teal)]" fill="currentColor" /> : <Play size={22} className="text-[var(--green)]" fill="currentColor" />} label={t(props.running ? "Pause" : "Play")} onClick={props.onToggleRun} active={props.running} />
            </Group>
          </>
        )}
        {tab === "drawing" && (
          <>
            <Group label={t("Layout drawing")}>
              <RibbonButton icon={<Sparkles size={22} className="text-[#f2c230]" />} label={t("Floor map")} onClick={props.onShowLayouts} />
              <RibbonButton icon={<Boxes size={22} className="text-[#8fa9c2]" />} label={t("Auto-arrange")} onClick={props.onAutoArrange} />
            </Group>
            <Group label={t("Export")}>
              <RibbonButton icon={<Download size={22} />} label={t("Export project")} onClick={props.onExport} />
            </Group>
          </>
        )}
        {tab === "help" && (
          <>
            <Group label={t("Help")}>
              <RibbonButton icon={<Keyboard size={22} />} label={t("Shortcuts")} onClick={() => openSettings("keybinds")} />
              <RibbonButton icon={<BookOpen size={22} className="text-[var(--app-accent)]" />} label={t("Robot API")} onClick={props.onShowApi} />
              <RibbonButton icon={<HelpCircle size={22} />} label={t("Help")} onClick={() => openSettings("help")} />
            </Group>
          </>
        )}
      </div>

      <input
        ref={importInput}
        type="file"
        accept=".txt,.json,.lcmx,text/plain,application/json,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) props.onImport(file);
          event.target.value = "";
        }}
      />
    </header>
  );
}
