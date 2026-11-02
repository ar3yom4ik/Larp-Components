import { useRef, useState } from "react";
import { FileUp, RotateCcw } from "lucide-react";
import type { SceneItem, WorkerMotionRole, WorkerSettings } from "../types";
import { collectModelFiles, getCachedAnimation, isModelPath, makeAsset } from "../utils/modelImport";
import { boneMap, defaultWorker, findRoleClip } from "../utils/workerAnimation";
import { getCachedModel } from "../utils/modelImport";
import { DEFAULT_WORKER_SETTINGS } from "./RiggedHuman";
import { ModelMaterialEditor } from "./ModelMaterialEditor";
import { t } from "../i18n";

const field = "w-full rounded border border-white/15 bg-[#1e1e1e] px-2 py-1.5 text-[11px] text-white/85 outline-none focus:border-[var(--app-accent)]";
export function WorkerEditor({item, items, onUpdate, onBeginEdit, onImportCharacter}: {item:SceneItem;items:SceneItem[];onUpdate:(id:string,changes:Partial<SceneItem>,record?:boolean)=>boolean | void;onBeginEdit:()=>void;onImportCharacter:(id:string)=>void}) {
  const latest=useRef(item);latest.current=item;
  const [error,setError]=useState("");const [busy,setBusy]=useState<WorkerMotionRole|null>(null);
  const settings=item.worker || DEFAULT_WORKER_SETTINGS;
  const imported=items.filter((i) => i.kind === "imported-model" && i.imported?.rigged);
  const match=imported.find((i) => i.imported?.asset.id === settings.model?.asset.id);
  const selected=settings.appearance === "custom" ? match?.id || "current" : settings.appearance;
  const patch=(change:Partial<WorkerSettings>,record=true) => {
    const current=latest.current.worker || DEFAULT_WORKER_SETTINGS;
    return onUpdate(item.id,{worker:{...current,...change}},record);
  };
  async function uploadMotion(role:WorkerMotionRole,files:File[]) {
    if (!files.length) return;
    setBusy(role);setError("");
    try {
      const resources=await collectModelFiles(files);
      const entry=resources.find((r) => isModelPath(r.path) && /\.(fbx|glb|gltf|dae)$/i.test(r.path));
      if (!entry) throw new Error("Choose an animated FBX, GLB, glTF or DAE file.");
      const asset=makeAsset(resources,entry.path), source=await getCachedAnimation(asset);
      const current=latest.current.worker || DEFAULT_WORKER_SETTINGS;
      const target=current.appearance === "custom" && current.model ? await getCachedModel(current.model.asset) : await defaultWorker();
      const sourceBones=boneMap(source.root), targetBones=boneMap(target.root);
      const common=[...sourceBones.keys()].filter((name) => targetBones.has(name));
      if (!common.includes("hips") || common.length < 8) throw new Error(`Animation rig does not match this worker (${common.length} common bones). Use a Mixamo-compatible humanoid FBX/GLB.`);
      const preferred=findRoleClip(source.clips,role), clipIndex=Math.max(0,preferred ? source.clips.indexOf(preferred) : 0);
      if (patch({motions:{...current.motions,[role]:{asset,clipIndex,clipNames:source.clips.map((clip) => clip.name || "Animation")}}}) === false) throw new Error(t("Project would exceed the 180 MB limit. Remove assets or start a new project."));
    } catch (cause) {setError(cause instanceof Error ? cause.message : String(cause));}
    finally {setBusy(null);}
  }
  return <>
    <section className="border-b border-white/[0.08] px-3 py-3" aria-label={t("Animated worker settings")}>
      <h4 className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#a8a8ad]">{t("Animated worker")}</h4>
      <label className="block text-[10px] text-white/55">{t("Character appearance")}
        <select aria-label={t("Character appearance")} value={selected} disabled={item.locked} onChange={(e) => {
          const id=e.target.value;
          if (id === "default" || id === "classic") patch({appearance:id,model:undefined});
          else if (id !== "current") {const source=imported.find((i)=>i.id===id);if(source?.imported)patch({appearance:"custom",model:source.imported});}
        }} className={`${field} mt-1`}>
          <option value="default">{t("Built-in rigged worker")}</option><option value="classic">{t("Classic mannequin")}</option>
          {settings.appearance === "custom" && !match && <option value="current">{settings.model?.asset.entry || t("Custom character")}</option>}
          {imported.map((i)=><option key={i.id} value={i.id}>{i.name} ({i.imported?.asset.entry})</option>)}
        </select>
      </label>
      <button type="button" disabled={item.locked} onClick={()=>onImportCharacter(item.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-[var(--app-accent)]/35 bg-[var(--app-accent)]/10 px-2 py-2 text-[10px] text-[var(--app-accent-bright)] hover:bg-[var(--app-accent)]/20 disabled:opacity-40"><FileUp size={13}/>{t("Import rigged character")}</button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-[10px] text-white/55">{t("Height (m)")}<input type="number" aria-label={t("Worker height")} min="0.5" max="3" step="0.05" value={settings.height} disabled={item.locked || settings.appearance === "classic"} onFocus={onBeginEdit} onChange={(e)=>patch({height:Math.max(.5,Math.min(3,Number(e.target.value)||1.78))},false)} className={`${field} mt-1`}/></label>
        <label className="block text-[10px] text-white/55">{t("Model forward")}<select aria-label={t("Model forward")} value={settings.forward} disabled={item.locked || settings.appearance === "classic"} onChange={(e)=>patch({forward:e.target.value as WorkerSettings["forward"]})} className={`${field} mt-1`}><option value="+z">+Z</option><option value="-z">−Z</option><option value="+x">+X</option><option value="-x">−X</option></select></label>
      </div>
      {settings.appearance !== "classic" && <label className="mt-2 flex items-center gap-2 text-[10px] text-white/65"><input type="checkbox" aria-label={t("Keep feet near floor")} disabled={item.locked} checked={settings.groundFeet !== false} onChange={(event)=>patch({groundFeet:event.target.checked})}/>{t("Keep feet near floor")}</label>}
      <p className="mt-2 text-[10px] leading-relaxed text-white/40">{t("The built-in worker has a Mixamo-compatible humanoid rig. Choose an imported skinned character, or import one directly. Appearance is copied into this worker.")}</p>
      {settings.appearance !== "classic" && <>
        <h5 className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-wider text-white/55">{t("Animation clips")}</h5>
        <p className="mb-2 text-[10px] leading-relaxed text-white/40">{t("Idle, walk and work crossfade automatically. Optional: import Mixamo FBX clips (Without Skin; use In Place for walking). Matching humanoid bones are required.")}</p>
        {(["idle","walk","work"] as WorkerMotionRole[]).map((role)=> {
          const motion=settings.motions?.[role];
          return <div key={role} className="mb-2 rounded border border-white/10 bg-black/15 p-2"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-[10px] font-medium capitalize text-white/80">{t(role)}</div><div className="truncate text-[9px] text-white/40" title={motion?.asset.entry}>{busy === role ? t("Loading…") : motion ? motion.asset.entry : t("Automatic")}</div></div><div className="flex items-center gap-1"><label className="cursor-pointer rounded p-1 text-[var(--app-accent-bright)] hover:bg-white/10" title={t("Import animation")}><FileUp size={13}/><input aria-label={`${t("Import animation")}: ${t(role)}`} type="file" multiple accept=".fbx,.glb,.gltf,.dae,.zip,.bin,.png,.jpg,.jpeg,.webp" disabled={!!busy || item.locked} className="sr-only" onChange={(e)=>{void uploadMotion(role,Array.from(e.target.files || []));e.target.value="";}}/></label><button type="button" aria-label={`${t("Reset animation")}: ${t(role)}`} disabled={!motion || item.locked} onClick={()=>{const motions={...settings.motions};delete motions[role];patch({motions});}} className="rounded p-1 text-white/55 hover:bg-white/10 disabled:opacity-25"><RotateCcw size={12}/></button></div></div>
            {motion && motion.clipNames.length > 1 && <select aria-label={`${t("Clip")}: ${t(role)}`} value={motion.clipIndex} onChange={(e)=>patch({motions:{...settings.motions,[role]:{...motion,clipIndex:Number(e.target.value)}}})} className={`${field} mt-2`}>{motion.clipNames.map((name,i)=><option key={i} value={i}>{name}</option>)}</select>}
          </div>;
        })}
      </>}
      {error && <div role="alert" className="mt-2 rounded border border-red-400/30 bg-red-500/10 p-2 text-[10px] text-red-200">{error}</div>}
    </section>
    {settings.appearance === "custom" && settings.model && <ModelMaterialEditor item={{...item,imported:settings.model}} onBeginEdit={onBeginEdit} onUpdate={(_id,changes,record)=> changes.imported ? patch({model:changes.imported},record) : undefined}/>}
  </>;
}
