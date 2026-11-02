import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import type { ImportedMaterial, ImportedModelData, ModelUnits, SceneItem, TextureSlot } from "../types";
import { getCachedModel, inspectMaterials, modelMeshList, modelSubset, readBlobAsDataUrl } from "../utils/modelImport";
import { t } from "../i18n";

const field = "w-full rounded border border-white/15 bg-[#1e1e1e] px-2 py-1.5 text-[11px] text-white/85 outline-none focus:border-[var(--app-accent)]";
const maps: Array<{slot: TextureSlot; title: string; strength: keyof ImportedMaterial; min: number; max: number; step: number}> = [
  {slot:"map", title:"Base color map", strength:"mapStrength", min:0, max:1, step:.01},
  {slot:"normalMap", title:"Normal map", strength:"normalStrength", min:0, max:4, step:.05},
  {slot:"roughnessMap", title:"Roughness map", strength:"roughnessStrength", min:0, max:1, step:.01},
  {slot:"metalnessMap", title:"Metalness map", strength:"metalnessStrength", min:0, max:1, step:.01},
  {slot:"aoMap", title:"Ambient occlusion map", strength:"aoStrength", min:0, max:2, step:.05},
  {slot:"emissiveMap", title:"Emissive map", strength:"emissiveMapStrength", min:0, max:1, step:.01},
  {slot:"alphaMap", title:"Opacity map", strength:"alphaStrength", min:0, max:1, step:.01},
  {slot:"bumpMap", title:"Bump map", strength:"bumpStrength", min:-2, max:2, step:.01},
  {slot:"displacementMap", title:"Displacement map", strength:"displacementStrength", min:-2, max:2, step:.01},
];
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"]);

function Slider({label, value, min=0, max=1, step=.01, disabled, onBegin, onChange}: {label:string;value:number;min?:number;max?:number;step?:number;disabled?:boolean;onBegin:()=>void;onChange:(value:number)=>void}) {
  return <label className="block"><span className="mb-1 flex justify-between text-[10px] text-white/60"><span>{t(label)}</span><span className="font-mono text-white/80">{value.toFixed(2)}</span></span><input aria-label={t(label)} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onFocus={onBegin} onChange={(e) => onChange(Number(e.target.value))} className="h-1 w-full accent-[var(--app-accent)] disabled:opacity-30" /></label>;
}

export function ModelMaterialEditor({item, onUpdate, onBeginEdit}: {item: SceneItem; onUpdate:(id:string, change:Partial<SceneItem>, record?:boolean)=>boolean | void; onBeginEdit:()=>void}) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [meshes, setMeshes] = useState<{index:number;name:string}[]>([]);
  const [filtering, setFiltering] = useState(false);
  const latest = useRef(item); latest.current = item;
  useEffect(() => { setIndex(0); setError(""); }, [item.id]);
  useEffect(() => { let alive=true;setMeshes([]); if(item.imported) void getCachedModel(item.imported.asset).then(({root})=>{if(alive)setMeshes(modelMeshList(root));}).catch(()=>{}); return ()=>{alive=false}; },[item.imported?.asset]);
  if (!item.imported) return null;
  const model = item.imported;
  const selectedIndex = Math.min(index, Math.max(0, model.materials.length - 1));
  const material = model.materials[selectedIndex];
  const updateModel = (patch: Partial<ImportedModelData>, record = true) => onUpdate(item.id, {imported: {...model, ...patch}}, record);
  const toggleMesh = async (index:number) => {
    if(filtering) return;
    const hidden=new Set(model.hiddenMeshes ?? []); if(hidden.has(index))hidden.delete(index);else hidden.add(index);
    if(hidden.size >= meshes.length) {setError(t("Keep at least one submodel."));return;}
    setFiltering(true);setError("");
    try {const {root}=await getCachedModel(model.asset);const filtered=[...hidden].sort((a,b)=>a-b);const subset=modelSubset(root,filtered);const current=latest.current.imported;if(current)onUpdate(item.id,{imported:{...current,...subset,hiddenMeshes:filtered}},true);}
    catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setFiltering(false);}
  };
  const updateMaterial = (patch: Partial<ImportedMaterial>, record = true) => {
    const current = latest.current.imported;
    if (!current) return;
    const materials = current.materials.map((m,i) => i === selectedIndex ? {...m,...patch} : m);
    onUpdate(item.id, {imported:{...current, materials}}, record);
  };
  const setTexture = async (slot: TextureSlot, file?: File) => {
    if (!file) return;
    try {
      if (!imageTypes.has(file.type) && !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)) throw new Error("Choose a PNG, JPEG, WebP, GIF, BMP or AVIF image.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Each replacement texture must be 10 MB or smaller.");
      const ext = file.name.split(".").pop()?.toLowerCase();
      const inferred: Record<string,string> = {png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", gif:"image/gif", bmp:"image/bmp", avif:"image/avif"};
      const dataUrl = await readBlobAsDataUrl(file.type ? file : new Blob([file], {type: inferred[ext || ""] || "application/octet-stream"}));
      await new Promise<void>((resolve, reject) => {
        const image = new Image(); image.onload = () => image.width && image.height && image.width <= 8192 && image.height <= 8192 ? resolve() : reject(new Error("Texture dimensions must be at most 8192 × 8192."));
        image.onerror = () => reject(new Error("The selected image could not be decoded.")); image.src = dataUrl;
      });
      const current = latest.current.imported;
      if (!current || latest.current.id !== item.id || !current.materials[selectedIndex]) return;
      const target = current.materials[selectedIndex];
      const patch: Partial<ImportedMaterial> = {textures: {...target.textures, [slot]: {name:file.name, dataUrl}}};
      if (slot === "emissiveMap" && target.emissive === "#000000") patch.emissive = "#ffffff";
      const materials = current.materials.map((m,i) => i === selectedIndex ? {...m,...patch} : m);
      if (onUpdate(item.id, {imported:{...current, materials}}, true) === false) throw new Error(t("Project would exceed the 180 MB limit. Remove assets or start a new project."));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const restoreTexture = (slot: TextureSlot) => {
    const textures = {...material.textures}; delete textures[slot]; updateMaterial({textures});
  };
  const resetMaterial = async () => {
    try {
      const {root} = await getCachedModel(model.asset);
      const original = inspectMaterials(root)[selectedIndex];
      if (original) updateMaterial(original);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return <>
    <section className="border-b border-white/[0.08] px-3 py-3" aria-label={t("Imported model settings")}>
      <h4 className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#a8a8ad]">{t("Imported model")}</h4>
      <div className="mb-2 break-all text-[10px] text-white/60">{model.asset.entry}</div>
      <div className="mb-3 text-[10px] text-white/40">{model.meshCount} {t("meshes")} · {model.triangleCount.toLocaleString()} {t("triangles")} · {model.asset.files.length} {t("embedded files")}</div>
      {meshes.length > 1 && <details className="mb-3 rounded border border-white/10 bg-black/10 p-2"><summary className="cursor-pointer text-[11px] text-white/75">{t("Submodels")} · {meshes.length - (model.hiddenMeshes?.length ?? 0)} / {meshes.length}</summary><p className="my-1 text-[10px] text-white/40">{t("Remove unwanted meshes from all instances. Restore them at any time.")}</p><div className="thin-scroll max-h-40 overflow-y-auto">{meshes.map(mesh=><div key={mesh.index} className="flex items-center justify-between gap-2 border-t border-white/5 py-1 text-[10px]"><span className="truncate text-white/65">{mesh.name}</span><button type="button" disabled={filtering || item.locked} aria-label={`${t((model.hiddenMeshes ?? []).includes(mesh.index) ? "Restore submodel" : "Remove submodel")}: ${mesh.name}`} onClick={()=>void toggleMesh(mesh.index)} className="rounded px-2 py-1 text-[var(--app-accent-bright)] hover:bg-white/10 disabled:opacity-40">{t((model.hiddenMeshes ?? []).includes(mesh.index)?"Restore":"Remove")}</button></div>)}</div></details>}
      {error && <div role="alert" className="mb-2 text-[10px] text-red-200">{error}</div>}
      <label className="mb-2 block text-[10px] text-white/55">{t("Model units")}
        <select aria-label={t("Model units")} value={model.units} disabled={item.locked} onChange={(e) => updateModel({units:e.target.value as ModelUnits})} className={`${field} mt-1`}>
          <option value="auto">{t("Auto (large models → mm)")}</option><option value="m">{t("Meters")}</option><option value="mm">{t("Millimeters")}</option><option value="cm">{t("Centimeters")}</option><option value="in">{t("Inches")}</option><option value="ft">{t("Feet")}</option>
        </select>
      </label>
      <label className="block text-[10px] text-white/55">{t("Up axis")}
        <select aria-label={t("Up axis")} value={model.axis} disabled={item.locked} onChange={(e) => updateModel({axis:e.target.value as "y"|"z"})} className={`${field} mt-1`}><option value="y">Y-up</option><option value="z">Z-up</option></select>
      </label>
      <p className="mt-2 text-[10px] leading-relaxed text-white/40">{t("Imported models can be workpieces with mesh-derived compound colliders; they do not automatically become machines or detailed navigation obstacles.")}</p>
    </section>
    {material && <section className="border-b border-white/[0.08] px-3 py-3" aria-label={t("Materials and textures")}>
      <div className="mb-2 flex items-center justify-between gap-1"><h4 className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#a8a8ad]">{t("Materials & textures")}</h4><button type="button" onClick={() => void resetMaterial()} disabled={item.locked} className="flex items-center gap-1 text-[10px] text-[var(--app-accent-bright)]" title={t("Restore source material")}><RotateCcw size={11}/>{t("Reset")}</button></div>
      <label className="block text-[10px] text-white/55">{t("Material")}
        <select aria-label={t("Material")} value={selectedIndex} onChange={(e) => setIndex(Number(e.target.value))} className={`${field} mt-1`}>{model.materials.map((m,i) => <option key={i} value={i}>{i+1}. {m.name}</option>)}</select>
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] text-white/55">{t("Base color")}<input aria-label={t("Base color")} type="color" disabled={item.locked} value={material.color} onFocus={onBeginEdit} onChange={(e) => updateMaterial({color:e.target.value}, false)} className="mt-1 h-8 w-full cursor-pointer rounded border border-white/10 bg-[#1e1e1e]" /></label>
        <label className="text-[10px] text-white/55">{t("Emissive color")}<input aria-label={t("Emissive color")} type="color" disabled={item.locked} value={material.emissive} onFocus={onBeginEdit} onChange={(e) => updateMaterial({emissive:e.target.value}, false)} className="mt-1 h-8 w-full cursor-pointer rounded border border-white/10 bg-[#1e1e1e]" /></label>
      </div>
      <div className="mt-3 space-y-3">
        <Slider label="Roughness" value={material.roughness} disabled={item.locked} onBegin={onBeginEdit} onChange={(roughness) => updateMaterial({roughness},false)} />
        <Slider label="Metalness" value={material.metalness} disabled={item.locked} onBegin={onBeginEdit} onChange={(metalness) => updateMaterial({metalness},false)} />
        <Slider label="Opacity" value={material.opacity} disabled={item.locked} onBegin={onBeginEdit} onChange={(opacity) => updateMaterial({opacity},false)} />
        <Slider label="Emissive intensity" value={material.emissiveIntensity} min={0} max={5} step={.05} disabled={item.locked} onBegin={onBeginEdit} onChange={(emissiveIntensity) => updateMaterial({emissiveIntensity},false)} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-[10px] text-white/65"><input type="checkbox" checked={material.doubleSided} disabled={item.locked} onChange={(e) => updateMaterial({doubleSided:e.target.checked})}/>{t("Double-sided")}</label>
      <p className="mt-3 text-[10px] leading-relaxed text-white/40">{t("Select a texture to replace a source map. Roughness uses green, metalness uses blue, and AO uses red (standard glTF/PBR packing). Models need UV coordinates.")}</p>
      {error && <div role="alert" className="mt-2 rounded border border-red-400/30 bg-red-500/10 p-2 text-[10px] text-red-200">{error}</div>}
      <div className="mt-3 space-y-2">{maps.map(({slot,title,strength,min,max,step}) => {
        const override = material.textures[slot];
        const status = override === null ? t("Removed") : override ? override.name : material.present.includes(slot) ? t("Source") : t("None");
        return <div key={slot} className="rounded border border-white/10 bg-black/15 p-2">
          <div className="flex items-start justify-between gap-1"><div className="min-w-0"><div className="text-[10px] font-medium text-white/80">{t(title)}</div><div className="truncate text-[9px] text-white/40" title={status}>{status}</div></div>
            <div className="flex shrink-0 gap-1"><label title={t("Choose texture")} className="cursor-pointer rounded p-1 text-[var(--app-accent-bright)] hover:bg-white/10"><ImagePlus size={13}/><input aria-label={`${t("Choose texture")}: ${t(title)}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif" disabled={item.locked} className="sr-only" onChange={(e) => {void setTexture(slot,e.target.files?.[0]); e.target.value="";}} /></label>
              <button type="button" title={t("Restore source map")} aria-label={`${t("Restore source map")}: ${t(title)}`} disabled={item.locked || override === undefined} onClick={() => restoreTexture(slot)} className="rounded p-1 text-white/55 hover:bg-white/10 disabled:opacity-25"><RotateCcw size={12}/></button>
              <button type="button" title={t("Remove map")} aria-label={`${t("Remove map")}: ${t(title)}`} disabled={item.locked || (override === null || (override === undefined && !material.present.includes(slot)))} onClick={() => updateMaterial({textures:{...material.textures,[slot]:null}})} className="rounded p-1 text-white/55 hover:bg-white/10 disabled:opacity-25"><Trash2 size={12}/></button></div></div>
          <div className="mt-2"><Slider label={`${title} strength`} value={Number(material[strength])} min={min} max={max} step={step} disabled={item.locked} onBegin={onBeginEdit} onChange={(value) => updateMaterial({[strength]:value},false)} /></div>
        </div>;
      })}</div>
    </section>}
  </>;
}
