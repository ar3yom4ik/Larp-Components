import { useEffect, useRef, useState, type ReactNode } from "react";
import { Database, Download, FolderOpen, HelpCircle, Gauge, Keyboard, Monitor, Palette, RotateCcw, Save, Sun, Upload } from "lucide-react";
import { useAppearance, applyPreset, isCustomGraphics, setAccent, setAppearance, setGfx, setScheme, resetScheme, SKINS, GI_MODES, TONE_MAPPINGS, ANTIALIAS_MODES, RESOLUTION_STEPS, VXGI_RESOLUTIONS, SCHEME_FIELDS, type AntialiasMode, type ColorScheme, type GiMode, type GraphicsSettings, type SkinId, type ToneMapping, type GraphicsQuality } from "../theme";
import { resetLayout, setPanel, useLayout } from "../layout";
import { getLanguage, setLanguage, t, useLanguage } from "../i18n";
import { KEY_ACTIONS, bindingFor, bindingFromEvent, isValidBinding, resetAllBindings, resetBinding, setBinding, setCapturing, useKeybindVersion } from "../keybinds";
import { applySettingsFile, buildSettingsFile } from "../utils/settingsIO";
import { probeWebGPU } from "../utils/gpu";
import { describeGi, useGraphicsStatus } from "../graphicsStatus";
import { APP_NAME, APP_VERSION, buildLine, buildStamp } from "../buildInfo";
import { setSettingsDim, setSettingsOffset, setSettingsSize, setSettingsSection, useSettingsWindow, type SettingsSection } from "../settingsWindow";
import { setCornellRoom, useCornellRoom } from "../cornellRoom";
import { cn } from "../utils/cn";
import type { InterfaceMode } from "../utils/device";

export interface SettingsWindowProps {
  project: string;
  rename: (name: string) => void;
  save: () => void;
  exportFile: () => void;
  exportArchive: () => void;
  importFile: (file: File) => void;
  newProject: () => void;
  mode: InterfaceMode;
  setMode: (mode: InterfaceMode) => void;
  onClose?: () => void;
  /** Mobile layouts show the window inline, without the modal header. */
  inline?: boolean;
}

const SECTIONS: { id: SettingsSection; label: string; icon: ReactNode }[] = [
  { id: "video", label: "Video", icon: <Monitor size={14} /> },
  { id: "quality", label: "Graphics quality", icon: <Gauge size={14} /> },
  { id: "lighting", label: "Lighting", icon: <Sun size={14} /> },
  { id: "interface", label: "Interface & colours", icon: <Palette size={14} /> },
  { id: "keybinds", label: "Keybinds", icon: <Keyboard size={14} /> },
  { id: "help", label: "Help", icon: <HelpCircle size={14} /> },
  { id: "data", label: "Settings backup", icon: <Database size={14} /> },
  { id: "project", label: "Project", icon: <FolderOpen size={14} /> },
];

const PRESETS: { id: GraphicsQuality; label: string; note: string }[] = [
  { id: "low", label: "Low", note: "Basic shadows, no contact shadows or fog, adaptive resolution. Best for slow machines." },
  { id: "standard", label: "Standard", note: "The default look: soft directional shadows, contact shadows and distance fog." },
  { id: "enhanced", label: "Enhanced", note: "Adds approximate bounce light and screen-space occlusion on top of Standard." },
  { id: "max", label: "Max", note: "Voxel global illumination (VXGI) on WebGPU, with TRAA. Falls back to the Enhanced approximation on WebGL." },
];

const SHADOW_STEPS: { label: string; value: Partial<GraphicsSettings> }[] = [
  { label: "Off", value: { shadows: false } },
  { label: "Low", value: { shadows: true, shadowSize: 1024, softShadows: false } },
  { label: "Medium", value: { shadows: true, shadowSize: 2048, softShadows: false } },
  { label: "High", value: { shadows: true, shadowSize: 2048, softShadows: true } },
  { label: "Epic", value: { shadows: true, shadowSize: 4096, softShadows: true } },
];
const GI_STEPS: { id: GiMode; label: string; note: string }[] = [
  { id: "off", label: "Off", note: "No indirect light. Ambient light is unshadowed." },
  { id: "ao", label: "Occlusion", note: "Screen-space ambient occlusion (GTAO) darkens corners and contact areas. Cheap, no bounce light." },
  { id: "approx", label: "Approximate", note: "Bounce lights plus screen-space occlusion. An approximation, not path tracing." },
  { id: "vxgi", label: "VXGI", note: "Real-time voxel cone-traced indirect light (three.js r187 VXGI). Needs WebGPU; otherwise falls back to Approximate." },
];
const ANTIALIAS_LABEL: Record<AntialiasMode, string> = { off: "Off", fxaa: "FXAA (fast)", msaa: "MSAA (smooth)" };
const VIEW_STEPS = [
  { label: "Near", value: 90 },
  { label: "Medium", value: 130 },
  { label: "Far", value: 170 },
  { label: "Epic", value: 260 },
];
const REFLECTION_STEPS = [
  { label: "Off", value: 0 },
  { label: "Low", value: 0.35 },
  { label: "Medium", value: 0.55 },
  { label: "High", value: 1 },
];
const TONE_LABEL: Record<ToneMapping, string> = { none: "None", linear: "Linear", reinhard: "Reinhard", cineon: "Cineon", aces: "ACES filmic", agx: "AgX", neutral: "Neutral" };
const ACCENT_SWATCHES = ["#2a8be0", "#f5a623", "#d83a45", "#2fb7c6", "#7ed321", "#9b59b6", "#f0f0f0", "#ff6b6b"];

function nearest(steps: number[], value: number) {
  let best = 0;
  steps.forEach((step, index) => { if (Math.abs(step - value) < Math.abs(steps[best] - value)) best = index; });
  return best;
}

function currentShadowStep(gfx: GraphicsSettings) {
  if (!gfx.shadows) return 0;
  if (gfx.shadowSize === 1024) return 1;
  if (gfx.shadowSize === 4096) return 4;
  return gfx.softShadows ? 3 : 2;
}

/** Fortnite-style parameter row: a label, a row of step bars and a value readout. */
function StepRow({ label, help, steps, value, onChange, onHelp, disabled }: { label: string; help: string; steps: string[]; value: number; onChange: (index: number) => void; onHelp: (text: string) => void; disabled?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 rounded px-3 py-2.5 transition hover:bg-white/[0.04]", disabled && "opacity-40")} onMouseEnter={() => onHelp(help)} onFocus={() => onHelp(help)} tabIndex={-1}>
      <span className="text-[12px] text-white/75">{t(label)}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label={`${t(label)} ${t("previous")}`} disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))} className="rounded px-1 text-white/50 hover:text-white disabled:opacity-30">‹</button>
          <span className="truncate text-[12px] font-medium text-white">{t(steps[value] ?? "")}</span>
          <button type="button" aria-label={`${t(label)} ${t("next")}`} disabled={disabled || value >= steps.length - 1} onClick={() => onChange(Math.min(steps.length - 1, value + 1))} className="rounded px-1 text-white/50 hover:text-white disabled:opacity-30">›</button>
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label={t(label)}>
          {steps.map((step, index) => (
            <button key={step} type="button" role="radio" aria-checked={index === value} aria-label={`${t(label)}: ${t(step)}`} disabled={disabled} onClick={() => onChange(index)} className={cn("h-1.5 flex-1 rounded-full transition", index <= value ? "bg-[var(--app-accent)]" : "bg-white/15", index === value && "shadow-[0_0_0_2px_rgba(255,255,255,.25)]")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleRowUi({ label, help, checked, onChange, onHelp }: { label: string; help: string; checked: boolean; onChange: (value: boolean) => void; onHelp: (text: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2.5 transition hover:bg-white/[0.04]" onMouseEnter={() => onHelp(help)} onFocus={() => onHelp(help)}>
      <span className="text-[12px] text-white/75">{t(label)}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[var(--app-accent)]" />
    </label>
  );
}

function SliderRow({ label, help, min, max, step, value, onChange, onHelp, format }: { label: string; help: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; onHelp: (text: string) => void; format?: (value: number) => string }) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 rounded px-3 py-2 hover:bg-white/[0.04]" onMouseEnter={() => onHelp(help)} onFocus={() => onHelp(help)}>
      <span className="text-[12px] text-white/75">{t(label)}</span>
      <span className="flex items-center gap-2">
        <input aria-label={t(label)} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="accent-range min-w-0 flex-1" />
        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-white/70">{format ? format(value) : value.toFixed(2)}</span>
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{t(title)}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

export function SettingsWindow(props: SettingsWindowProps) {
  useLanguage();
  const appearance = useAppearance();
  const gfx = appearance.gfx;
  const { section, dim } = useSettingsWindow();
  const status = useGraphicsStatus();
  const [help, setHelp] = useState<string>("Hover or focus a setting to see what it does.");
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const settingsInput = useRef<HTMLInputElement>(null);
  const cornell = useCornellRoom();
  const custom = isCustomGraphics(appearance);
  const giIndex = GI_MODES.indexOf(gfx.gi);
  const presetHelp = PRESETS.find((preset) => preset.id === appearance.graphics)?.note ?? "";

  useEffect(() => { void probeWebGPU().then(setWebgpu); }, []);

  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(null), 3200); };
  const sectionHelp = (text: string) => setHelp(text);
  const pick = (id: SettingsSection) => setSettingsSection(id);

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(buildSettingsFile(getLanguage()), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "larp-settings.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(t("Settings exported"));
  };

  const importSettings = async (file: File) => {
    try {
      const result = applySettingsFile(JSON.parse(await file.text()));
      if (result.ok) flash(`${t("Settings imported")} (${result.keybinds} ${t("keybinds")})`);
      else flash(t(result.error));
    } catch {
      flash(t("Could not read that file as JSON."));
    }
  };

  const renderSection = () => {
    switch (section) {
      case "video":
        return (
          <>
            <Section title="Display">
              <ToggleRowUi label="Show frame rate" help="Shows a live frames-per-second counter in the top-left corner of the 3D view. Useful when tuning graphics." checked={gfx.showFps} onChange={(value) => setGfx({ showFps: value })} onHelp={sectionHelp} />
              <StepRow label="3D resolution" help="Renders the 3D view at a fraction of the screen pixels. Values below 100% are faster and softer; values above 100% supersample. 50% is useful on slow GPUs or large scenes." steps={RESOLUTION_STEPS.map((step) => `${Math.round(step * 100)}%`)} value={Math.max(0, nearest(RESOLUTION_STEPS, gfx.pixelRatio))} onChange={(index) => setGfx({ pixelRatio: RESOLUTION_STEPS[index] })} onHelp={sectionHelp} />
              <StepRow label="Antialiasing" help="Smooths jagged edges. MSAA is the sharpest for thin geometry, FXAA is cheaper and works at any resolution, Off is fastest." steps={ANTIALIAS_MODES.map((mode) => ANTIALIAS_LABEL[mode])} value={Math.max(0, ANTIALIAS_MODES.indexOf(gfx.antialias))} onChange={(index) => setGfx({ antialias: ANTIALIAS_MODES[index] })} onHelp={sectionHelp} />
              <ToggleRowUi label="Adaptive resolution" help="Lowers the resolution automatically while the frame rate drops, then restores it." checked={gfx.adaptive} onChange={(value) => setGfx({ adaptive: value })} onHelp={sectionHelp} />
              <ToggleRowUi label="Floor grid" help="Shows the reference grid on the factory floor." checked={gfx.grid} onChange={(value) => setGfx({ grid: value })} onHelp={sectionHelp} />
              <ToggleRowUi label="Distance fog" help="Fades distant geometry into the background colour." checked={gfx.fog} onChange={(value) => setGfx({ fog: value })} onHelp={sectionHelp} />
            </Section>
            <Section title="Renderer">
              <div className="space-y-1 px-3 py-2 text-[12px] text-white/60" onMouseEnter={() => sectionHelp("WebGPU is required for VXGI global illumination. It is detected once per browser session.")}>
                <div>{t("WebGPU adapter")}: <span className="font-mono text-white/85">{webgpu === null ? t("checking") : webgpu ? t("available") : t("not available")}</span></div>
                <div>{t("Active graphics preset")}: <span className="font-mono text-white/85">{t(PRESETS.find((preset) => preset.id === appearance.graphics)?.label ?? "")}{custom ? ` (${t("Custom")})` : ""}</span></div>
              </div>
            </Section>
            {/* Live diagnostics: what the renderer is actually doing, so a setting that
                silently fell back (WebGPU missing, shader failure) is visible here. */}
            <Section title="Active rendering">
              <div className="space-y-1 px-3 py-2 text-[12px] text-white/60" data-graphics-status onMouseEnter={() => sectionHelp("What the renderer is doing right now. These values are measured, not copied from the settings, so a fallback becomes visible.")}>
                <div>{t("Renderer")}: <span className="font-mono text-white/85">{status.renderer === "webgpu" ? "WebGPU" : status.renderer === "webgl" ? "WebGL" : status.renderer === "failed" ? t("failed") : t("starting")}{status.rendererDetail ? ` (${status.rendererDetail})` : ""}</span></div>
                <div>{t("Global illumination")}: <span className={cn("font-mono", gfx.gi === "vxgi" && status.gi !== "vxgi" ? "text-[#f5c26b]" : "text-white/85")}>{t(describeGi(status, gfx.gi))}</span></div>
                <div>{t("Shadow map")}: <span className="font-mono text-white/85">{status.shadowSize ? `${status.shadowSize}² · ${status.shadowExtent * 2} m · ${status.shadowTexelCm} cm/texel` : t("no sun shadows")}</span></div>
                <div>{t("Frame time")}: <span className="font-mono text-white/85">{status.frameMs > 0 ? `${status.frameMs} ms (${Math.round(1000 / Math.max(1, status.frameMs))} FPS)` : t("idle")}</span></div>
                <div>{t("3D pixel ratio")}: <span className="font-mono text-white/85">{status.pixelRatio.toFixed(2)}×</span></div>
              </div>
            </Section>
          </>
        );
      case "quality":
        return (
          <>
            <Section title="Preset">
              <div className="grid grid-cols-4 gap-1.5 px-1 pb-1">
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onMouseEnter={() => sectionHelp(preset.note)} onFocus={() => sectionHelp(preset.note)} onClick={() => applyPreset(preset.id)} className={cn("rounded border px-2 py-2 text-[12px] transition", appearance.graphics === preset.id && !custom ? "border-[var(--app-accent)] bg-[var(--app-accent)]/20 text-white" : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white")}>
                    {t(preset.label)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-white/45">
                <span>{custom ? t("Custom: some parameters differ from the preset.") : t(presetHelp)}</span>
                {custom && <button type="button" onClick={() => applyPreset(appearance.graphics)} className="flex items-center gap-1 rounded px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"><RotateCcw size={11} />{t("Reset to preset")}</button>}
              </div>
            </Section>
            <Section title="Shadows">
              <StepRow label="Shadow quality" help="Directional shadow map resolution and softness. Off removes shadows entirely." steps={SHADOW_STEPS.map((step) => step.label)} value={currentShadowStep(gfx)} onChange={(index) => setGfx(SHADOW_STEPS[index].value)} onHelp={sectionHelp} />
              <SliderRow label="Shadow softness" help="Blur radius of the shadow map filter in texels. 1 is a crisp edge and 16 is very soft." min={1} max={16} step={1} value={gfx.shadowRadius} onChange={(value) => setGfx({ shadowRadius: value })} onHelp={sectionHelp} format={(value) => `${Math.round(value)}\u00a0px`} />
              <SliderRow label="Shadow area" help="Half-size, in metres, of the square that receives sharp sun shadows. Smaller values give crisper shadows but the area outside them loses its shadow." min={8} max={200} step={2} value={gfx.shadowExtent} onChange={(value) => setGfx({ shadowExtent: value })} onHelp={sectionHelp} format={(value) => `${Math.round(value)}\u00a0m`} />
              <ToggleRowUi label="Shadows follow the camera" help="Keeps the sharp shadow area centred on what you are looking at. Turn off to keep the shadows fixed around the origin." checked={gfx.sunFollowView} onChange={(value) => setGfx({ sunFollowView: value })} onHelp={sectionHelp} />
              <ToggleRowUi label="Contact shadows" help="Soft dark contact patches under equipment on the floor. Turned off in VXGI mode, where real indirect light handles contact darkening." checked={gfx.contactShadows} onChange={(value) => setGfx({ contactShadows: value })} onHelp={sectionHelp} />
            </Section>
            <Section title="Lighting and reflections">
              <StepRow label="Global illumination" help={GI_STEPS[giIndex]?.note ?? ""} steps={GI_STEPS.map((step) => step.label)} value={Math.max(0, giIndex)} onChange={(index) => setGfx({ gi: GI_STEPS[index].id })} onHelp={sectionHelp} />
              <StepRow label="Reflections" help="Strength of environment reflections on glossy surfaces." steps={REFLECTION_STEPS.map((step) => step.label)} value={nearest(REFLECTION_STEPS.map((step) => step.value), gfx.env)} onChange={(index) => setGfx({ env: REFLECTION_STEPS[index].value })} onHelp={sectionHelp} />
              {gfx.gi === "vxgi" && <>
                <StepRow label="Voxel resolution" help="Resolution of the voxel volume used by VXGI. Higher keeps small details in the indirect light but costs more GPU time." steps={VXGI_RESOLUTIONS.map((size) => `${size}\u00b3`)} value={Math.max(0, VXGI_RESOLUTIONS.indexOf(gfx.vxgiResolution))} onChange={(index) => setGfx({ vxgiResolution: VXGI_RESOLUTIONS[index] })} onHelp={sectionHelp} />
                <SliderRow label="Voxel refresh" help="Seconds between full voxel rebuilds while the simulation runs. Longer is cheaper; geometry changes rebuild immediately." min={0.25} max={30} step={0.25} value={gfx.vxgiRefresh} onChange={(value) => setGfx({ vxgiRefresh: value })} onHelp={sectionHelp} format={(value) => `${value.toFixed(2)}\u00a0s`} />
              </>}
              <StepRow label="View distance" help="Distance at which fog hides geometry. Only applies while distance fog is enabled." steps={VIEW_STEPS.map((step) => step.label)} value={nearest(VIEW_STEPS.map((step) => step.value), gfx.fogFar)} onChange={(index) => setGfx({ fogFar: VIEW_STEPS[index].value })} onHelp={sectionHelp} />
            </Section>
            <Section title="Post processing">
              <label className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 rounded px-3 py-2 hover:bg-white/[0.04]" onMouseEnter={() => sectionHelp("Maps high dynamic range lighting to the screen. ACES, AgX and Neutral keep colours closer to the reference; Linear and None do no tone compression.")}>
                <span className="text-[12px] text-white/75">{t("Tone mapping")}</span>
                <select aria-label={t("Tone mapping")} value={gfx.toneMapping} onChange={(event) => setGfx({ toneMapping: event.target.value as ToneMapping })} className="rounded border border-white/10 bg-[#1e1e20] px-2 py-1.5 text-[12px] text-white/85">
                  {TONE_MAPPINGS.map((name) => <option key={name} value={name}>{TONE_LABEL[name]}</option>)}
                </select>
              </label>
              {(gfx.gi === "ao" || gfx.gi === "approx") && <>
                <SliderRow label="Occlusion strength" help="How dark screen-space occlusion makes creases and corners." min={0} max={3} step={0.1} value={gfx.aoIntensity} onChange={(value) => setGfx({ aoIntensity: value })} onHelp={sectionHelp} />
                <SliderRow label="Occlusion radius" help="Screen-space search radius for occlusion, in metres." min={0.1} max={2} step={0.05} value={gfx.aoRadius} onChange={(value) => setGfx({ aoRadius: value })} onHelp={sectionHelp} />
              </>}
            </Section>
            {gfx.gi === "vxgi" && webgpu === false && <p className="px-3 text-[11px] text-[#f5c26b]">{t("VXGI needs WebGPU. This browser does not offer it, so the approximation is used instead.")}</p>}
          </>
        );
      case "lighting":
        return (
          <>
            <Section title="Light levels">
              <SliderRow label="Exposure" help="Overall brightness after tone mapping." min={0.4} max={1.8} step={0.05} value={gfx.exposure} onChange={(value) => setGfx({ exposure: value })} onHelp={sectionHelp} />
              <SliderRow label="Ambient light" help="Uniform sky light that fills shadowed areas." min={0} max={2} step={0.05} value={gfx.ambient} onChange={(value) => setGfx({ ambient: value })} onHelp={sectionHelp} />
              <SliderRow label="Sun intensity" help="Strength of the directional sun light." min={0} max={5} step={0.1} value={gfx.sun} onChange={(value) => setGfx({ sun: value })} onHelp={sectionHelp} />
              <SliderRow label="Fill light" help="Secondary soft light from the opposite side of the sun." min={0} max={2} step={0.05} value={gfx.fill} onChange={(value) => setGfx({ fill: value })} onHelp={sectionHelp} />
              <SliderRow label="Environment reflections" help="Environment map contribution to reflections." min={0} max={2} step={0.05} value={gfx.env} onChange={(value) => setGfx({ env: value })} onHelp={sectionHelp} />
              {gfx.gi === "approx" && <SliderRow label="Indirect bounce light" help="Bounce-light stand-ins used by the Approximate mode. Disabled in VXGI mode to avoid counting indirect light twice." min={0} max={2} step={0.05} value={gfx.bounce} onChange={(value) => setGfx({ bounce: value })} onHelp={sectionHelp} />}
            </Section>
            <Section title="Sun and shadows">
              <SliderRow label="Sun direction" help="Azimuth of the sun in degrees." min={0} max={360} step={5} value={gfx.sunAzimuth} onChange={(value) => setGfx({ sunAzimuth: value })} onHelp={sectionHelp} format={(v) => `${Math.round(v)}°`} />
              <SliderRow label="Sun elevation" help="Height of the sun above the horizon in degrees." min={10} max={85} step={5} value={gfx.sunElevation} onChange={(value) => setGfx({ sunElevation: value })} onHelp={sectionHelp} format={(v) => `${Math.round(v)}°`} />
              <SliderRow label="Shadow strength" help="How dark the shadows are." min={0} max={1} step={0.05} value={gfx.shadowStrength} onChange={(value) => setGfx({ shadowStrength: value })} onHelp={sectionHelp} />
              <SliderRow label="Contact shadow strength" help="Opacity of contact shadows." min={0} max={1} step={0.05} value={gfx.contactOpacity} onChange={(value) => setGfx({ contactOpacity: value })} onHelp={sectionHelp} />
              <SliderRow label="Product brightness" help="Lifts product colours so they stay readable in dark scenes." min={0} max={1} step={0.05} value={gfx.productBoost} onChange={(value) => setGfx({ productBoost: value })} onHelp={sectionHelp} />
            </Section>
          </>
        );
      case "interface":
        return (
          <>
            <Section title="Colours">
              <div className="space-y-2 px-3 py-2" onMouseEnter={() => sectionHelp(appearance.skin === "custom" ? "The Custom skin uses the full palette below. Pick any colour for each surface; the 3D viewport colour, ribbon, panels and accent all update immediately." : "The accent colour is used for selection, buttons, the play control and highlights. Pick the Custom skin for a full colour scheme.")}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`${t("Accent")} ${color}`}
                      onClick={() => (appearance.skin === "custom" ? setScheme({ accent: color }) : setAccent(color))}
                      className={cn("h-6 w-6 rounded-full border", (appearance.skin === "custom" ? appearance.scheme.accent : appearance.accent) === color ? "ring-2 ring-white/70" : "border-white/20")}
                      style={{ background: color }}
                    />
                  ))}
                  <label className="flex items-center gap-1.5 text-[11px] text-white/60">
                    {t("Accent")}
                    <input
                      type="color"
                      aria-label={t("Custom accent colour")}
                      value={appearance.skin === "custom" ? appearance.scheme.accent : appearance.accent ?? SKINS[appearance.skin].accent}
                      onChange={(event) => (appearance.skin === "custom" ? setScheme({ accent: event.target.value }) : setAccent(event.target.value))}
                      className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
                    />
                  </label>
                  {appearance.skin !== "custom" && <button type="button" onClick={() => setAccent(undefined)} className="rounded px-2 py-1 text-[11px] text-white/55 hover:bg-white/10 hover:text-white">{t("Use skin colour")}</button>}
                </div>
              </div>
              {appearance.skin === "custom" && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2" data-custom-scheme>
                  {SCHEME_FIELDS.filter((field) => field.key !== "accent").map((field) => (
                    <label key={field.key} className="flex items-center justify-between gap-2 text-[11px] text-white/70">
                      <span className="truncate">{t(field.label)}</span>
                      <input
                        type="color"
                        aria-label={t(field.label)}
                        value={appearance.scheme[field.key]}
                        onChange={(event) => setScheme({ [field.key]: event.target.value } as Partial<ColorScheme>)}
                        className="h-6 w-9 shrink-0 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
                      />
                    </label>
                  ))}
                  <button type="button" onClick={() => resetScheme()} className="col-span-2 mt-1 flex items-center justify-center gap-1.5 rounded border border-white/15 py-1.5 text-[11px] text-white/65 hover:bg-white/10">
                    <RotateCcw size={11} /> {t("Reset colours")}
                  </button>
                </div>
              )}
            </Section>
            <Section title="Layout style">
              <div className="grid grid-cols-2 gap-1.5 px-1 sm:grid-cols-4">
                {(Object.keys(SKINS) as SkinId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-skin-preview={id}
                    onMouseEnter={() => sectionHelp(id === "custom" ? "A skin with a fully customizable colour scheme: every surface, the accent and the selection colour are yours to set." : SKINS[id].note)}
                    onClick={() => setAppearance({ skin: id })}
                    className={cn("skin-card rounded border p-2 text-left text-[11px] text-white/70", appearance.skin === id && "active")}
                  >
                    <span className="block font-medium text-white/85">{t(SKINS[id].name)}</span>
                    <span className="block text-[10px] text-white/40">{id === "custom" ? t("Fully customizable colours") : t(SKINS[id].note)}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Language and mode">
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {([["en", "English"], ["ru", "Русский"]] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setLanguage(id)} className={cn("rounded border px-3 py-1.5 text-[12px]", getLanguage() === id ? "border-[var(--app-accent)] bg-[var(--app-accent)]/20 text-white" : "border-white/10 text-white/60 hover:bg-white/5")}>{label}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {([["auto", "Automatic"], ["desktop", "Desktop"], ["touch", "Touch"]] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => props.setMode(id)} className={cn("rounded border px-3 py-1.5 text-[12px]", props.mode === id ? "border-[var(--app-accent)] bg-[var(--app-accent)]/20 text-white" : "border-white/10 text-white/60 hover:bg-white/5")}>{t(label)}</button>
                ))}
              </div>
            </Section>
            <Section title="Panels">
              <div className="space-y-1.5 px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PanelRow id="catalog" label="Catalog" />
                  <PanelRow id="inspector" label="Properties" />
                  <PanelRow id="dock" label="Output dock" />
                </div>
                <button type="button" onClick={() => { resetLayout(); flash(t("Layout reset")); }} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded border border-white/15 py-2 text-[12px] text-white/70 hover:bg-white/10">
                  <RotateCcw size={12} /> {t("Reset layout")}
                </button>
                <p className="text-[10.5px] leading-relaxed text-white/40">{t("Drag a panel's inner edge to resize it. The button in each panel header detaches it into a movable window; the same button docks it again.")}</p>
              </div>
            </Section>
            <Section title="Settings window">
              <ToggleRowUi label="Dim background" help="Dims the factory behind the settings window. Turn it off to watch the scene while you change lighting, shadows and colour." checked={dim} onChange={setSettingsDim} onHelp={sectionHelp} />
              <div className="px-3 py-2">
                <button type="button" onClick={() => { setSettingsOffset(null); flash(t("Settings window re-centred")); }} className="flex w-full items-center justify-center gap-1.5 rounded border border-white/15 py-2 text-[12px] text-white/70 hover:bg-white/10">
                  <RotateCcw size={12} /> {t("Re-centre window")}
                </button>
                <button type="button" onClick={() => { setSettingsSize(null); setSettingsOffset(null); flash(t("Window size reset")); }} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-white/15 py-2 text-[12px] text-white/70 hover:bg-white/10">
                  <RotateCcw size={12} /> {t("Reset window size")}
                </button>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/40">{t("Drag the title bar to move the window and the bottom corner to resize it. Double-click the title bar to re-centre. Size, position and dimming are remembered.")}</p>
              </div>
            </Section>
            {import.meta.env.DEV && <Section title="Developer">
              <ToggleRowUi label="Cornell benchmark room (DEV)" help="Replaces the factory with a Cornell box for GI debugging. Development builds only." checked={cornell} onChange={(value) => { setCornellRoom(value); }} onHelp={sectionHelp} />
            </Section>}
          </>
        );
      case "keybinds":
        return <KeybindPage onHelp={sectionHelp} flash={flash} />;
      case "help":
        return (
          <div className="space-y-4 px-1 text-[12px] leading-relaxed text-white/70">
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-white">{t("Larp Components")}</h3>
              <p>{t("Build and simulate a factory cell. Place machines, robots, conveyors and people, then press play to run the simulation. Use Build factory to start from a description, or Import 3D model for your own equipment.")}</p>
            </div>
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-white">{t("Getting started")}</h3>
              <ol className="list-decimal space-y-1 pl-4">
                <li>{t("Drag a component from the catalogue into the 3D view.")}</li>
                <li>{t("Select it and use Move or Rotate to place it. Hold Shift to snap.")}</li>
                <li>{t("Robots and mobile robots are programmed in the Program tab with the Larp robot API.")}</li>
                <li>{t("Press Space to run the simulation. Use the speed control in the playback bar.")}</li>
              </ol>
            </div>
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-white">{t("Panels")}</h3>
              <p>{t("Drag a panel's inner edge to resize it, use the header button to detach it into a movable window, and the X to close it. Settings → Interface → Panels re-opens closed panels and resets the whole layout.")}</p>
            </div>
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-white">{t("Shortcuts")}</h3>
              <ul className="space-y-0.5 font-mono text-[11px]">
                {KEY_ACTIONS.slice(0, 8).map((action) => <li key={action.id}><span className="text-white/90">{bindingFor(action.id)}</span> — {t(action.label)}</li>)}
              </ul>
              <button type="button" onClick={() => pick("keybinds")} className="mt-2 text-[12px] text-[var(--app-accent-bright)] hover:underline">{t("All keybinds")} →</button>
            </div>
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-white">{t("Graphics notes")}</h3>
              <p>{t("Global illumination in the Max preset uses WebGPU voxel GI when the browser supports it. Otherwise it uses a WebGL approximation with bounce lights and screen-space occlusion. Neither mode is path tracing.")}</p>
            </div>
          </div>
        );
      case "data":
        return (
          <>
            <Section title="Settings backup">
              <p className="px-3 pb-2 text-[11px] leading-relaxed text-white/45">{t("Export your graphics, lighting, colours, keybinds and language to a JSON file, or import one. Project layouts are exported from the Project section.")}</p>
              <div className="grid grid-cols-2 gap-2 px-3">
                <button type="button" onMouseEnter={() => sectionHelp("Saves a larp-settings.json file you can import on another computer.")} onClick={exportSettings} className="flex items-center justify-center gap-2 rounded border border-white/15 py-2.5 text-[12px] text-white/80 hover:bg-white/10"><Download size={14} />{t("Export settings")}</button>
                <button type="button" onMouseEnter={() => sectionHelp("Replaces your current settings with those in a settings file. Invalid files are rejected without changes.")} onClick={() => settingsInput.current?.click()} className="flex items-center justify-center gap-2 rounded border border-white/15 py-2.5 text-[12px] text-white/80 hover:bg-white/10"><Upload size={14} />{t("Import settings")}</button>
              </div>
              <input ref={settingsInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importSettings(file); }} />
            </Section>
            <Section title="Reset">
              <div className="grid grid-cols-2 gap-2 px-3">
                <button type="button" onClick={() => { applyPreset("standard"); setAccent(undefined); flash(t("Graphics reset to Standard")); }} className="rounded border border-white/15 py-2 text-[12px] text-white/70 hover:bg-white/10">{t("Reset graphics")}</button>
                <button type="button" onClick={() => { resetAllBindings(); flash(t("Keybinds reset")); }} className="rounded border border-white/15 py-2 text-[12px] text-white/70 hover:bg-white/10">{t("Reset keybinds")}</button>
              </div>
            </Section>
          </>
        );
      case "project":
        return (
          <>
            <Section title="Project">
              <label className="block px-3 text-[11px] text-white/45">{t("Rename project")}<input value={props.project} onChange={(event) => props.rename(event.target.value)} className="mt-1.5 w-full rounded border border-white/15 bg-[#202024] px-3 py-2 text-[13px] text-white/85 outline-none focus:border-[var(--app-accent)]" /></label>
              <div className="my-3 grid grid-cols-2 gap-2 px-3">
                {[[t("Save project"), Save, props.save], [t("New factory"), FolderOpen, props.newProject], [t("Export copy (.txt)"), Download, props.exportFile], [t("Export copy (.lcmx)"), Download, props.exportArchive], [t("Import project"), Upload, () => importInput.current?.click()]].map(([label, Icon, fn]) => {
                  const I = Icon as typeof Save;
                  return <button key={String(label)} type="button" onClick={fn as () => void} className="flex min-h-10 items-center justify-center gap-2 rounded border border-white/15 px-2 text-[12px] text-white/75 hover:bg-white/10"><I size={14} />{String(label)}</button>;
                })}
              </div>
              <input ref={importInput} type="file" accept=".txt,.json,.lcmx,text/plain,application/json,application/zip" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) props.importFile(file); }} />
            </Section>
          </>
        );
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1", props.inline ? "flex-col" : "flex-row")}>
      <nav aria-label={t("Settings")} className={cn("flex shrink-0 gap-0.5 border-white/10 p-2", props.inline ? "overflow-x-auto border-b" : "w-[190px] flex-col border-r")}>
        {SECTIONS.map((item) => (
          <button key={item.id} type="button" onClick={() => pick(item.id)} className={cn("flex shrink-0 items-center gap-2 rounded px-2.5 py-2 text-left text-[12px] transition", section === item.id ? "bg-[var(--app-accent)]/20 text-white" : "text-white/55 hover:bg-white/5 hover:text-white")}>
            {item.icon}{t(item.label)}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">{renderSection()}</div>
        {!props.inline && <div className="min-h-[56px] shrink-0 border-t border-white/10 bg-black/20 px-4 py-2.5 text-[11px] leading-relaxed text-white/55" aria-live="polite">{help}</div>}
        {message && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded border border-white/15 bg-[#2b2b2d] px-3 py-1.5 text-[11px] text-white/85 shadow-xl">{message}</div>}
        {/* Build identity, kept deliberately small and quiet in the footer. */}
        <div
          data-build-stamp
          title={buildLine({ renderer: status.renderer, gi: status.gi })}
          className="shrink-0 border-t border-white/10 px-4 py-1.5 text-right font-mono text-[10px] leading-none text-white/30"
        >
          {APP_NAME} · v{APP_VERSION} · {buildStamp()}
        </div>
      </div>
    </div>
  );
}

/** One line of the Panels section: show/hide and detach for a dock panel. */
function PanelRow({ id, label }: { id: "catalog" | "inspector" | "dock"; label: string }) {
  const layout = useLayout();
  const panel = layout[id];
  return (
    <span className="flex items-center gap-1 rounded border border-white/12 px-1.5 py-1 text-[11px] text-white/70">
      <button type="button" onClick={() => setPanel(id, { open: !panel.open })} aria-pressed={panel.open} className={cn("rounded px-1 py-0.5", panel.open ? "bg-[var(--app-accent)]/20 text-white" : "text-white/45 hover:bg-white/10")}>{t(label)}</button>
      <button type="button" onClick={() => setPanel(id, { floating: !panel.floating, open: true })} title={t(panel.floating ? "Dock panel" : "Detach panel")} aria-label={`${t(panel.floating ? "Dock panel" : "Detach panel")} ${t(label)}`} className="rounded px-1 py-0.5 text-white/45 hover:bg-white/10 hover:text-white">{t(panel.floating ? "Docked" : "Float")}</button>
    </span>
  );
}

function KeybindPage({ onHelp, flash }: { onHelp: (text: string) => void; flash: (text: string) => void }) {
  useKeybindVersion();
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    if (!capturingId) return undefined;
    setCapturing(true);
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") { setCapturingId(null); setCapturing(false); return; }
      const binding = bindingFromEvent(event);
      if (!binding || !isValidBinding(binding)) return;
      const holder = KEY_ACTIONS.find((action) => action.id !== capturingId && bindingFor(action.id) === binding);
      setBinding(capturingId, binding);
      setConflict(holder ? `${binding} ${t("was moved from")} ${t(holder.label)}` : null);
      setCapturingId(null);
      setCapturing(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); setCapturing(false); };
  }, [capturingId]);

  const groups = Array.from(new Set(KEY_ACTIONS.map((action) => action.group)));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-white/45">{t("Click a key, then press the new key. Escape cancels.")}</p>
        <button type="button" onClick={() => { resetAllBindings(); setConflict(null); flash(t("Keybinds reset")); }} className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"><RotateCcw size={11} />{t("Reset all")}</button>
      </div>
      {conflict && <p className="text-[11px] text-[#f5c26b]">{conflict}</p>}
      {groups.map((group) => (
        <Section key={group} title={group}>
          {KEY_ACTIONS.filter((action) => action.group === group).map((action) => (
            <div key={action.id} className="flex items-center justify-between gap-3 rounded px-3 py-1.5 hover:bg-white/[0.04]" onMouseEnter={() => onHelp(`${t(action.label)}: ${bindingFor(action.id) || t("unbound")}`)}>
              <span className="text-[12px] text-white/75">{t(action.label)}</span>
              <span className="flex items-center gap-1.5">
                <button type="button" aria-label={`${t(action.label)} ${bindingFor(action.id)}`} onClick={() => { setConflict(null); setCapturingId(action.id); }} className={cn("min-w-[92px] rounded border px-2 py-1 font-mono text-[11px]", capturingId === action.id ? "border-[var(--app-accent)] bg-[var(--app-accent)]/20 text-white" : "border-white/15 text-white/85 hover:bg-white/10")}>
                  {capturingId === action.id ? t("Press a key…") : bindingFor(action.id) || t("Unbound")}
                </button>
                <button type="button" aria-label={`${t("Reset")} ${t(action.label)}`} onClick={() => resetBinding(action.id)} className="rounded p-1 text-white/35 hover:bg-white/10 hover:text-white"><RotateCcw size={11} /></button>
              </span>
            </div>
          ))}
        </Section>
      ))}
    </div>
  );
}
