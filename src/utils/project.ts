import type { ImportedCollision, ImportedMaterial, ImportedModelData, ModelAsset, ModelUnits, RobotProgram, SceneItem, TextureOverride, TextureSlot, WorkerMotionRole, WorkerSettings } from "../types";
import { COMPONENTS, getDef } from "../data/library";
import { signalFunction, validSignalPort } from "./signalChannels";
import { cleanPtpProgram } from "./ptp";

export interface ProjectFile {
  version: "5.1";
  projectName: string;
  layoutName: string;
  activeLayoutId: string | null;
  items: SceneItem[];
  /** Saved imported-workpiece definitions; these are not scene objects. */
  workpieces?: SceneItem[];
}
const HEADER = "LARP COMPONENTS 5.1\n";
export const MAX_PROJECT_CHARS = 180_000_000;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (value: unknown, fallback: number, min: number, max: number) => finite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const slots: TextureSlot[] = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "bumpMap", "displacementMap"];
const units: ModelUnits[] = ["auto", "m", "mm", "cm", "in", "ft"];
const color = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

/** Store each model's original source files once even if it has many scene instances. */
function projectForDisk(project: Omit<ProjectFile, "version">) {
  const assets = new Map<string, ModelAsset>();
  const storeAsset = (asset: ModelAsset) => {
    const existing = assets.get(asset.id);
    if (existing && existing !== asset && (existing.entry !== asset.entry || existing.files.length !== asset.files.length || existing.files.some((file, i) => file.path !== asset.files[i].path || file.dataUrl !== asset.files[i].dataUrl))) throw new Error("Conflicting imported asset identifiers");
    assets.set(asset.id, asset);
    return asset.id;
  };
  const modelForDisk = (model: ImportedModelData) => { const {asset, ...settings} = model; return {...settings, assetId: storeAsset(asset)}; };
  const storeItem = (item: SceneItem) => {
    if (!item.imported && !item.worker) return item;
    const worker = item.worker ? {...item.worker,
      model: item.worker.model ? modelForDisk(item.worker.model) : undefined,
      motions: Object.fromEntries(Object.entries(item.worker.motions || {}).map(([role, motion]) => {
        if (!motion) return [role, undefined];
        const {asset, ...settings} = motion; return [role, {...settings, assetId:storeAsset(asset)}];
      }))
    } : undefined;
    return {...item, imported: item.imported ? modelForDisk(item.imported) : undefined, worker};
  };
  const items = project.items.map(storeItem);
  const workpieces = project.workpieces?.map(storeItem);
  return { ...project, items, ...(workpieces?.length ? {workpieces} : {workpieces: undefined}), ...(assets.size ? {assets: [...assets.values()]} : {}), version: "5.1" };
}
export function serializeProject(project: Omit<ProjectFile, "version">) {
  return HEADER + JSON.stringify(projectForDisk(project), null, 2);
}
/** Count the exact exported character length without copying large base64 strings. */
function projectSize(project: Omit<ProjectFile, "version">) {
  let payloadLength = 0;
  const shell = JSON.stringify(projectForDisk(project), (key, value: unknown) => {
    if (key === "dataUrl" && typeof value === "string" && value.startsWith("data:") && value.includes(";base64,")) { payloadLength += value.length; return ""; }
    return value;
  }, 2);
  return {chars: HEADER.length + shell.length + payloadLength, bytes: HEADER.length + new TextEncoder().encode(shell).byteLength + payloadLength};
}
export function estimateProjectChars(project: Omit<ProjectFile, "version">) { return projectSize(project).chars; }
export function estimateProjectBytes(project: Omit<ProjectFile, "version">) { return projectSize(project).bytes; }

function safeDataUrl(value: unknown, imageOnly = false): value is string {
  if (typeof value !== "string" || value.length > 115_000_000) return false;
  const comma = value.indexOf(",");
  if (comma < 0) return false;
  const prefix = value.slice(0, comma);
  const mimeValid = imageOnly ? /^data:image\/(png|jpeg|webp|gif|bmp|avif);base64$/i.test(prefix) : /^data:[a-z0-9.+\-/]*;base64$/i.test(prefix);
  return mimeValid && /^[A-Za-z0-9+/]*={0,2}$/.test(value.slice(comma + 1));
}
function cleanAsset(input: unknown): ModelAsset {
  const a = input as ModelAsset;
  if (!a || typeof a.id !== "string" || !a.id || a.id.length > 128 || typeof a.entry !== "string" || !Array.isArray(a.files) || a.files.length === 0 || a.files.length > 1000) throw new Error("Invalid embedded model asset");
  const paths = new Set<string>();
  const files = a.files.map((file) => {
    if (!file || typeof file.path !== "string" || !file.path || file.path.length > 1024 || /\0|\\|(^|\/)\.\.($|\/)|^\//.test(file.path) || !safeDataUrl(file.dataUrl)) throw new Error("Invalid embedded model resource");
    if (paths.has(file.path.toLowerCase())) throw new Error("Duplicate embedded model resource");
    paths.add(file.path.toLowerCase());
    return {path: file.path, dataUrl: file.dataUrl};
  });
  if (!files.some((f) => f.path === a.entry)) throw new Error("Embedded model entry is missing");
  const info = a.source;
  let source: ModelAsset["source"];
  if (info && typeof info.provider === "string" && typeof info.title === "string" && typeof info.url === "string" && typeof info.license === "string") {
    try { if (new URL(info.url).protocol === "https:") source = {provider:info.provider.slice(0,120), title:info.title.slice(0,240), url:info.url.slice(0,2048), license:info.license.slice(0,240)}; } catch { /* ignore unsafe provenance URLs */ }
  }
  return {id: a.id, entry: a.entry, files, ...(source ? {source} : {})};
}
function cleanMaterial(input: ImportedMaterial, index: number): ImportedMaterial {
  if (!input || typeof input !== "object") throw new Error("Invalid imported material");
  const textures: Partial<Record<TextureSlot, TextureOverride | null>> = {};
  for (const slot of slots) {
    const texture = input.textures?.[slot];
    if (texture === null) textures[slot] = null;
    else if (texture !== undefined) {
      if (!texture || typeof texture.name !== "string" || !safeDataUrl(texture.dataUrl, true)) throw new Error("Invalid replacement texture");
      textures[slot] = {name: texture.name.slice(0, 255), dataUrl: texture.dataUrl};
    }
  }
  return {
    name: typeof input.name === "string" ? input.name.slice(0, 120) : `Material ${index + 1}`,
    color: color(input.color, "#cccccc"), roughness: clamp(input.roughness, .75, 0, 1), metalness: clamp(input.metalness, 0, 0, 1),
    opacity: clamp(input.opacity, 1, 0, 1), emissive: color(input.emissive, "#000000"), emissiveIntensity: clamp(input.emissiveIntensity, 1, 0, 5), doubleSided: input.doubleSided === true,
    worldProjection: input.worldProjection === true, worldProjectionScale: clamp(input.worldProjectionScale, 1, .01, 100),
    mapStrength: clamp(input.mapStrength, 1, 0, 1), normalStrength: clamp(input.normalStrength, 1, 0, 4), roughnessStrength: clamp(input.roughnessStrength, 1, 0, 1), metalnessStrength: clamp(input.metalnessStrength, 1, 0, 1),
    aoStrength: clamp(input.aoStrength, 1, 0, 2), emissiveMapStrength: clamp(input.emissiveMapStrength, 1, 0, 1), alphaStrength: clamp(input.alphaStrength, 1, 0, 1), bumpStrength: clamp(input.bumpStrength, 1, -2, 2), displacementStrength: clamp(input.displacementStrength, 0, -2, 2),
    present: Array.isArray(input.present) ? input.present.filter((s): s is TextureSlot => slots.includes(s)) : [],
    ...(typeof input.preview === 'string' && input.preview.length <= 30_000 && safeDataUrl(input.preview,true) ? {preview:input.preview} : {}), textures,
  };
}

function cleanCollision(value: unknown): ImportedCollision | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as ImportedCollision;
  const vec = (v: unknown): v is [number,number,number] => Array.isArray(v) && v.length === 3 && v.every((n) => finite(n) && Math.abs(n) <= 1_000_000_000);
  if (!vec(data.min) || !vec(data.max) || data.min.some((v,i) => v >= data.max[i]) || !Array.isArray(data.boxes) || !data.boxes.length || data.boxes.length > 128) return undefined;
  if (!data.boxes.every((b) => b && vec(b.center) && vec(b.size) && b.size.every((v,i) =>
    v > 0 && b.center[i]-v/2 >= data.min[i]-1e-6 && b.center[i]+v/2 <= data.max[i]+1e-6))) return undefined;
  return {min:data.min, max:data.max, boxes:data.boxes.map((b) => ({center:b.center, size:b.size}))};
}

type StoredModel = Partial<ImportedModelData> & {assetId?: string};
function cleanModel(model: StoredModel | undefined, assets: Map<string, ModelAsset>): ImportedModelData {
  const asset = model?.assetId ? assets.get(model.assetId) : model?.asset ? cleanAsset(model.asset) : undefined;
  if (!model || !asset || !Array.isArray(model.materials) || model.materials.length > 2000) throw new Error("Imported model is missing its asset or material data");
  return {asset, axis: model.axis === "z" || model.axis === "x" ? model.axis : "y", units: model.units && units.includes(model.units) ? model.units : "auto", materials: model.materials.map(cleanMaterial), meshCount: clamp(model.meshCount, 0, 0, 1_000_000), hiddenMeshes: Array.isArray(model.hiddenMeshes) ? [...new Set(model.hiddenMeshes.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < (model.meshCount ?? 0)))] : undefined, triangleCount: clamp(model.triangleCount, 0, 0, 1_000_000_000), sourceSize: Array.isArray(model.sourceSize) && model.sourceSize.length === 3 && model.sourceSize.every((n) => finite(n) && n >= 0 && n <= 1_000_000) ? model.sourceSize as [number, number, number] : undefined, collision: cleanCollision(model.collision), rigged: model.rigged === true, animationNames: Array.isArray(model.animationNames) ? model.animationNames.slice(0,500).map((name) => String(name).slice(0,120)) : []};
}
function cleanWorker(value: unknown, assets: Map<string, ModelAsset>): WorkerSettings {
  const worker = value as WorkerSettings & {model?: StoredModel};
  if (!worker || typeof worker !== "object") throw new Error("Invalid worker settings");
  const appearance = worker.appearance === "classic" || worker.appearance === "custom" ? worker.appearance : "default";
  const model = worker.model ? cleanModel(worker.model, assets) : undefined;
  if (appearance === "custom" && !model) throw new Error("Custom worker character is missing");
  const motions: WorkerSettings["motions"] = {};
  for (const role of ["idle", "walk", "work"] as WorkerMotionRole[]) {
    const motion = worker.motions?.[role] as (NonNullable<WorkerSettings["motions"][WorkerMotionRole]> & {assetId?: string}) | undefined;
    if (!motion) continue;
    const asset = motion.assetId ? assets.get(motion.assetId) : motion.asset ? cleanAsset(motion.asset) : undefined;
    if (!asset) throw new Error(`Worker ${role} animation asset is missing`);
    motions[role] = {asset, clipIndex: Math.floor(clamp(motion.clipIndex, 0, 0, 499)), clipNames: Array.isArray(motion.clipNames) ? motion.clipNames.slice(0,500).map((name) => String(name).slice(0,120)) : []};
  }
  const forward = ["+z", "-z", "+x", "-x"].includes(worker.forward) ? worker.forward : "+z";
  return {appearance, model, motions, height:clamp(worker.height, 1.78, .5, 3), groundFeet:worker.groundFeet !== false, forward};
}

export function parseProject(text: string): ProjectFile {
  if (text.length > MAX_PROJECT_CHARS) throw new Error("Project exceeds the 180 MB text limit");
  const raw = text.replace(/^\uFEFF/, "").trim();
  const data = JSON.parse(raw.startsWith("LARP COMPONENTS") ? raw.slice(raw.indexOf("\n") + 1) : raw);
  if (!data || !Array.isArray(data.items)) throw new Error("Invalid project");
  const assets = new Map<string, ModelAsset>();
  if (data.assets !== undefined) {
    if (!Array.isArray(data.assets)) throw new Error("Invalid model asset list");
    for (const candidate of data.assets) { const asset = cleanAsset(candidate); if (assets.has(asset.id)) throw new Error("Duplicate model asset identifier"); assets.set(asset.id, asset); }
  }
  const parseItems = (rawItems: unknown[], catalog = false): SceneItem[] => {
    const ids = new Set<string>();
    return rawItems.map((candidate) => {
      const item = candidate as SceneItem & {imported?: ImportedModelData & {assetId?: string}};
      if (!item || !COMPONENTS.some((c) => c.kind === item.kind) || (catalog && item.kind !== "imported-model") || typeof item.id !== "string" || !item.id || item.id.length > 1024 || ids.has(item.id) || !Array.isArray(item.position) || item.position.length !== 3 || !item.position.every(finite)) throw new Error("Invalid component");
      ids.add(item.id);
      const props = Object.fromEntries(Object.entries(item.props ?? {}).filter(([key, value]) => !["__proto__", "constructor", "prototype"].includes(key) && (["string", "boolean"].includes(typeof value) || finite(value))));
      let points = item.points?.map((p) => {
        if (!Array.isArray(p) || p.length !== 2 || !p.every(finite)) throw new Error("Invalid path point");
        return [Math.max(-200, Math.min(200, p[0])), Math.max(-200, Math.min(200, p[1]))] as [number, number];
      });
      if (!points && ["fence", "conveyor", "roller"].includes(item.kind)) {
        const half = item.kind === "fence" ? 1.5 : Math.max(1, Math.min(20, Number(props.length) || 5)) / 2;
        points = [[-half, 0], [half, 0]];
      }
      if (points && (points.length < 2 || points.length > 100)) throw new Error("Invalid path");
      let pointHeights: number[] | undefined;
      if (item.pointHeights !== undefined) {
        if (!points || !Array.isArray(item.pointHeights) || item.pointHeights.length !== points.length || !item.pointHeights.every(finite)) throw new Error("Invalid path heights");
        pointHeights = item.pointHeights.map((height) => Math.max(-200, Math.min(200, height)));
      }
      const cleanProgram = (p:RobotProgram):RobotProgram => {
        if (!p || !["palletize", "transfer", "tend", "paint", "assemble"].includes(p.mode) || typeof p.sourceId !== "string" || typeof p.targetId !== "string") throw new Error("Invalid program");
        if (p.targetIds !== undefined && (!Array.isArray(p.targetIds) || p.targetIds.some(id => typeof id !== 'string' || !id || id.length > 1024))) throw new Error('Invalid pallet targets');
        return { mode:p.mode, sourceId:p.sourceId, ...(p.sourceKind === "pallet" ? {sourceKind:"pallet" as const} : {}), targetId:p.targetId, ...(p.targetIds?.length ? {targetIds:[...new Set(p.targetIds)]} : {}), machineId:typeof p.machineId === "string" ? p.machineId : undefined, inspectSensorId:typeof p.inspectSensorId === "string" && p.inspectSensorId.length <= 1024 ? p.inspectSensorId : undefined, repeat:p.repeat !== false, delay:Math.max(0,Math.min(60,Number(p.delay)||0)), clearance:Math.max(.05,Math.min(.6,Number(p.clearance)||.3)), pickupBack:finite(p.pickupBack) ? Math.max(0,Math.min(200,p.pickupBack)) : undefined, paintColor:/^#[0-9a-f]{6}$/i.test(p.paintColor || "") ? p.paintColor : "#d6534c" };
      };
      const program = item.program ? cleanProgram(item.program) : undefined;
      const ptp = item.ptp ? cleanPtpProgram(item.ptp) : undefined;
      let programs:Record<string,RobotProgram> | undefined;
      if (item.programs !== undefined) {
        if (!item.programs || typeof item.programs !== 'object' || Array.isArray(item.programs)) throw new Error('Invalid robot input programs');
        programs = {};
        for (const [key,value] of Object.entries(item.programs)) {
          if (!validSignalPort(Number(key)) || String(Number(key)) !== key) throw new Error('Invalid robot program input');
          programs[key] = cleanProgram(value);
        }
      }
      let imported: ImportedModelData | undefined;
      if (item.kind === "imported-model") {
        imported = cleanModel(item.imported, assets);
      }
      const worker = item.kind === "operator" && item.worker ? cleanWorker(item.worker, assets) : undefined;
      if (item.signalTargets !== undefined && (!Array.isArray(item.signalTargets) || item.signalTargets.some((id) => typeof id !== "string" || !id || id.length > 1024))) throw new Error("Invalid signal destinations");
      const signalTargets = item.signalTargets?.length ? [...new Set(item.signalTargets)] : undefined;
      if (item.signalChannels !== undefined && !Array.isArray(item.signalChannels)) throw new Error("Invalid signal channels");
      const channelPorts = new Set<number>();
      const signalChannels = item.signalChannels?.map(channel => {
        if (!channel || !validSignalPort(channel.port) || channelPorts.has(channel.port) || typeof channel.mode !== "string") throw new Error("Invalid signal channel");
        channelPorts.add(channel.port);
        const mode = signalFunction(item.kind,channel.mode)?.value;
        if (!mode || (channel.color !== undefined && !/^#[0-9a-f]{6}$/i.test(channel.color))) throw new Error("Invalid signal channel settings");
        if (channel.material !== undefined && !/^#[0-9a-f]{6}$/i.test(channel.material)) throw new Error("Invalid material color");
        if (channel.materialRef !== undefined && (typeof channel.materialRef !== 'string' || channel.materialRef.length > 2048)) throw new Error("Invalid material reference");
        return {port:channel.port,mode,...(channel.color ? {color:channel.color} : {}),...(channel.material ? {material:channel.material.toLowerCase()} : {}),...(channel.materialRef ? {materialRef:channel.materialRef} : {})};
      });
      if (item.signalRoutes !== undefined && !Array.isArray(item.signalRoutes)) throw new Error("Invalid signal routes");
      const signalRoutes = item.signalRoutes?.map(route => {
        if (!route || !validSignalPort(route.output) || !validSignalPort(route.input) || typeof route.targetId !== "string" || !route.targetId || route.targetId.length > 1024 || route.targetId === item.id) throw new Error("Invalid signal route");
        return {output:route.output,targetId:route.targetId,input:route.input};
      });
      return { id: item.id, kind: item.kind, name: String(item.name || getDef(item.kind).name).slice(0, 120), position: item.position.map((v) => Math.max(-200, Math.min(200, v))) as SceneItem["position"], rotation: finite(item.rotation) ? item.rotation : 0, rotationX: finite(item.rotationX) ? item.rotationX : undefined, rotationZ: finite(item.rotationZ) ? item.rotationZ : undefined, scale: Math.max(item.kind === "imported-model" ? .001 : .2, Math.min(item.kind === "imported-model" ? 1000 : 3, Number(item.scale) || 1)), color: color(item.color, getDef(item.kind).accent), locked: item.locked === true, visible: item.visible !== false, props: { ...getDef(item.kind).defaults, ...props }, signalTargets, signalChannels, signalRoutes, points, pointHeights, script: typeof item.script === "string" ? item.script.slice(0, 100_000) : undefined, program, programs, ptp, imported, worker };
    });
  };
  const items = parseItems(data.items);
  if (data.workpieces !== undefined && (!Array.isArray(data.workpieces))) throw new Error("Invalid workpiece catalog");
  const workpieces = data.workpieces ? parseItems(data.workpieces, true).map((item) => ({...item, visible:false})) : [];
  return { version: "5.1", projectName: String(data.projectName || "Untitled factory").slice(0, 120), layoutName: String(data.layoutName || data.projectName || "Imported factory").slice(0, 120), activeLayoutId: typeof data.activeLayoutId === "string" ? data.activeLayoutId : null, items, workpieces };
}
