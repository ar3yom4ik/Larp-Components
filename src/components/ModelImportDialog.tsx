import { useEffect, useRef, useState } from "react";
import { Box, FileUp, FolderOpen, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { ImportedModelData, ModelResource } from "../types";
import { collectModelFiles, describeImportedModel, FORMAT_LABEL, isModelPath, loadModelAsset, makeAsset, primeModelCache } from "../utils/modelImport";
import { t } from "../i18n";
import { WindowResizeHandle, type WindowSize, type WindowOffset } from "./WindowResizeHandle";

interface Props { open: boolean; initialFiles: File[] | null; requireRig?: boolean; onLoadingChange?: (loading:boolean)=>void; onClose: () => void; onImported: (model: ImportedModelData, warnings: string[]) => boolean | void }

export function ModelImportDialog({open, initialFiles, requireRig = false, onLoadingChange, onClose, onImported}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<{ size: WindowSize | null; offset: WindowOffset }>({ size: null, offset: { x: 0, y: 0 } });
  const [resources, setResources] = useState<ModelResource[]>([]);
  const [entry, setEntry] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  async function choose(files: File[]) {
    const request = ++sequence.current;
    setBusy(true); setError(""); setResources([]); setEntry(""); setSelectedNames(files.map((f) => f.name));
    try {
      const all = await collectModelFiles(files);
      if (request !== sequence.current) return;
      setResources(all); setEntry(all.find((f) => isModelPath(f.path))?.path || "");
    } catch (cause) { if (request === sequence.current) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (request === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    if (!open) { sequence.current++; setResources([]); setEntry(""); setSelectedNames([]); setBusy(false); setError(""); return; }
    if (initialFiles?.length) void choose(initialFiles);
    // initialFiles changes only when a new drag/drop opens the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiles]);
  async function importNow() {
    if (!entry || !resources.length) return;
    setBusy(true); setError(""); if (!requireRig) onLoadingChange?.(true);
    try {
      const asset = makeAsset(resources, entry);
      const {root, warnings, clips} = await loadModelAsset(asset);
      const model = describeImportedModel(asset, root, clips);
      if (requireRig && !model.rigged) throw new Error("This character has no skinned humanoid rig. Choose a Mixamo FBX/GLB downloaded With Skin.");
      if (model.materials.length > 2000) throw new Error("This model has over 2,000 materials. Simplify it before importing.");
      primeModelCache(asset, root, warnings, clips);
      if (onImported(model, warnings) === false) throw new Error(t("Project would exceed the 180 MB limit. Remove assets or start a new project."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); onLoadingChange?.(false); }
  }
  if (!open) return null;
  const candidates = resources.filter((r) => isModelPath(r.path));
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3" onPointerDown={(e) => {if (e.target === e.currentTarget && !busy) onClose();}}>
    <div ref={frame} role="dialog" aria-modal="true" aria-label={t("Import 3D model")} style={{ width: geometry.size?.width ?? 'min(580px, calc(100vw - 24px))', height: geometry.size?.height, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)', transform: `translate(${geometry.offset.x}px, ${geometry.offset.y}px)` }} className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-[#29292d] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 p-4"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded bg-[var(--app-accent)]/15 text-[var(--app-accent-bright)]"><Box size={20}/></span><div><h2 className="text-[16px] font-semibold text-white">{t("Import 3D model")}</h2><p className="mt-0.5 text-[11px] text-white/50">{t("Add local models and edit their materials in your factory.")}</p></div></div><button type="button" aria-label={t("Close")} disabled={busy} onClick={onClose} className="rounded p-1.5 text-white/50 hover:bg-white/10"><X size={17}/></button></div>
      <div className="thin-scroll min-h-0 overflow-y-auto p-4">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); void choose(Array.from(e.dataTransfer.files));}} className="flex min-h-[110px] w-full flex-col items-center justify-center rounded border border-dashed border-[var(--app-accent)]/50 bg-[var(--app-accent)]/[0.06] px-3 py-4 text-center hover:bg-[var(--app-accent)]/10 disabled:opacity-50"><FileUp size={23} className="mb-2 text-[var(--app-accent-bright)]"/><span className="text-[13px] font-medium text-white">{t("Choose model + companion files")}</span><span className="mt-1 text-[10px] text-white/45">{t("or drop files here · ZIP supported")}</span></button>
        <input ref={input} type="file" multiple aria-label={t("Choose model files")} accept=".glb,.gltf,.fbx,.obj,.mtl,.stl,.ply,.dae,.3mf,.3ds,.usdz,.usd,.usda,.usdc,.wrl,.vrml,.vtk,.amf,.step,.stp,.iges,.igs,.brep,.brp,.zip,.bin,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.tga,.dds,.ktx2" className="sr-only" onChange={(e) => {void choose(Array.from(e.target.files || [])); e.target.value="";}} />
        {selectedNames.length > 0 && <div className="mt-3 rounded border border-white/10 bg-black/15 px-3 py-2 text-[11px] text-white/65"><span className="text-white/45">{t("Selected")}: </span>{selectedNames.join(", ")}</div>}
        {candidates.length > 0 && <label className="mt-3 block text-[11px] text-white/65">{t("Model to import")}
          <select aria-label={t("Model to import")} value={entry} onChange={(e) => setEntry(e.target.value)} className="mt-1 w-full rounded border border-white/15 bg-[#1d1d20] px-2 py-2 text-[12px] text-white">{candidates.map((candidate) => <option key={candidate.path} value={candidate.path}>{candidate.path}</option>)}</select>
          {candidates.length > 1 && <span className="mt-1 block text-[10px] text-white/40">{t("Several models were found. Choose one; import again to add another.")}</span>}
        </label>}
        {busy && <p role="status" className="mt-3 flex items-center gap-2 text-[11px] text-[var(--app-accent-bright)]"><LoaderCircle size={14} className="animate-spin"/>{t("Reading and preparing model…")}</p>}
        {error && <div role="alert" className="mt-3 rounded border border-[#ff6b5e]/35 bg-[#ff6b5e]/10 p-3 text-[11px] leading-relaxed text-[#ffc0b8]">{error}</div>}
        <div className="mt-4 space-y-2 text-[10.5px] leading-relaxed text-white/50">
          <p><b className="text-white/70">{t("Supported")}:</b> {FORMAT_LABEL}.</p>
          <p><FolderOpen size={12} className="mr-1 inline"/>{t("For glTF, OBJ, FBX or DAE, select the model together with its textures, .bin and .mtl files. Use a ZIP to preserve folders.")}</p>
          <p><ShieldCheck size={12} className="mr-1 inline"/>{t("Files stay on this device. External model URLs are blocked. Up to 80 MB and 1,000 files per import.")}</p>
        </div>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 bg-black/10 p-3 pr-7"><button type="button" disabled={busy} onClick={onClose} className="rounded border border-white/15 px-4 py-2 text-[11px] text-white/70 hover:bg-white/10">{t("Cancel")}</button><button type="button" disabled={busy || !entry} onClick={() => void importNow()} className="rounded bg-[var(--app-accent)] px-5 py-2 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-35">{t("Import model")}</button></div>
      <WindowResizeHandle frame={frame} minWidth={320} minHeight={260} margin={12} onResize={(size, delta) => setGeometry({ size, offset: { x: geometry.offset.x + delta.width / 2, y: geometry.offset.y + delta.height / 2 } })} />
    </div>
  </div>;
}
