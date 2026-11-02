import * as THREE from "three";
import type { WebGPURenderer } from "three/webgpu";
import { gunzipSync, unzipSync } from "fflate";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { VRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";
import { AMFLoader } from "three/examples/jsm/loaders/AMFLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import occtFactory from "occt-import-js";
import { readPackedAsset } from "./embeddedAsset";
import { buildImportedCollision } from "./modelCollision";
import dracoJs from "three/examples/jsm/libs/draco/draco_wasm_wrapper.js?raw";
import dracoWasm from "three/examples/jsm/libs/draco/draco_decoder.wasm?url&inline";
import basisJs from "three/examples/jsm/libs/basis/basis_transcoder.js?raw";
import basisWasm from "three/examples/jsm/libs/basis/basis_transcoder.wasm?url&inline";
import type { ImportedMaterial, ImportedModelData, ModelAsset, ModelResource, ModelUnits, TextureSlot } from "../types";

export const MODEL_EXTENSIONS = ["glb", "gltf", "fbx", "obj", "stl", "ply", "dae", "3mf", "3ds", "usdz", "usd", "usda", "usdc", "wrl", "vrml", "vtk", "amf", "step", "stp", "iges", "igs", "brep", "brp"] as const;
export const FORMAT_LABEL = "GLB / glTF, FBX, OBJ + MTL, STL, PLY, DAE, 3MF, 3DS, USDZ / USD, VRML, VTK, AMF, STEP / IGES / BREP";
export const MAX_MODEL_BYTES = 80 * 1024 * 1024;
export const MAX_RESOURCES = 1000;
export const TEXTURE_SLOTS: TextureSlot[] = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "bumpMap", "displacementMap"];
const CAD = new Set(["step", "stp", "iges", "igs", "brep", "brp"]);
const mime: Record<string, string> = { png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", gif:"image/gif", bmp:"image/bmp", avif:"image/avif", svg:"image/svg+xml", ktx2:"image/ktx2", bin:"application/octet-stream", tga:"application/octet-stream", dds:"application/octet-stream" };
// KTX2Loader.detectSupport accepts both WebGLRenderer and WebGPURenderer (r187).
let renderer: THREE.WebGLRenderer | WebGPURenderer | null = null;
export function setModelRenderer(value: THREE.WebGLRenderer | WebGPURenderer | null) { renderer = value; }
export function extension(path: string) { return path.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? ""; }
export function isModelPath(path: string) { return (MODEL_EXTENSIONS as readonly string[]).includes(extension(path)); }
const entryDir = (path: string) => path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
const basename = (path: string) => path.split("/").pop() ?? path;

function safePath(path: string): string {
  const chunks = path.replace(/\\/g, "/").split("/");
  const result: string[] = [];
  for (const part of chunks) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!result.length) throw new Error(`Unsafe file path: ${path}`); result.pop(); }
    else if (part.includes("\0")) throw new Error("Invalid file path.");
    else result.push(part);
  }
  return result.join("/");
}

/** Reject ZIP bombs and ZIP64/encrypted archives before allocating decompressed data. */
export function validateZip(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("This archive is invalid or incomplete.");
  const entries = dv.getUint16(end + 10, true), offset = dv.getUint32(end + 16, true);
  if (entries === 0xffff || offset === 0xffffffff || entries > MAX_RESOURCES) throw new Error("Archive has too many files or uses unsupported ZIP64.");
  let pos = offset, total = 0;
  for (let i = 0; i < entries; i++) {
    if (pos + 46 > bytes.length || dv.getUint32(pos, true) !== 0x02014b50) throw new Error("Archive directory is invalid.");
    const flags = dv.getUint16(pos + 8, true), unpacked = dv.getUint32(pos + 24, true);
    if (flags & 1) throw new Error("Encrypted archives are not supported.");
    total += unpacked;
    if (unpacked === 0xffffffff || total > MAX_MODEL_BYTES) throw new Error("Archive expands beyond the 80 MB safety limit.");
    pos += 46 + dv.getUint16(pos + 28, true) + dv.getUint16(pos + 30, true) + dv.getUint16(pos + 32, true);
  }
  if (pos > bytes.length) throw new Error("Archive directory is incomplete.");
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(blob);
  });
}
export function dataUrlBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma < 0 || !dataUrl.slice(0, comma).endsWith(";base64")) throw new Error("Invalid embedded resource.");
  const binary = atob(dataUrl.slice(comma + 1));
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}
function exactBuffer(bytes: Uint8Array): ArrayBuffer { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; }
function uid() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }

/** Read a model and companions or a ZIP; all data is kept locally, never uploaded. */
export async function collectModelFiles(files: File[]): Promise<ModelResource[]> {
  if (!files.length) throw new Error("Choose a model file first.");
  if (files.length > MAX_RESOURCES || files.reduce((n, f) => n + f.size, 0) > MAX_MODEL_BYTES) throw new Error("Selected files exceed the 80 MB / 1,000 file limit.");
  const resources: ModelResource[] = [], used = new Set<string>();
  let bytesTotal = 0;
  async function add(pathInput: string, bytes: Uint8Array) {
    const path = safePath(pathInput);
    if (!path || path.startsWith("__MACOSX/") || basename(path).startsWith("._")) return;
    if (used.has(path.toLowerCase())) throw new Error(`Duplicate path in selected files: ${path}`);
    used.add(path.toLowerCase());
    bytesTotal += bytes.byteLength;
    if (bytesTotal > MAX_MODEL_BYTES || resources.length >= MAX_RESOURCES) throw new Error("Files expand beyond the 80 MB / 1,000 file limit.");
    resources.push({path, dataUrl: await readBlobAsDataUrl(new Blob([exactBuffer(bytes)], {type: mime[extension(path)] || "application/octet-stream"}))});
  }
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (extension(file.name) === "zip") {
      validateZip(bytes);
      const entries = unzipSync(bytes);
      for (const [name, content] of Object.entries(entries)) if (!name.endsWith("/")) await add(name, content);
    } else await add(file.webkitRelativePath || file.name, bytes);
  }
  if (!resources.some((f) => isModelPath(f.path))) throw new Error("No supported model was found. Choose a model and its companion files, or a ZIP containing them.");
  return resources;
}
export function makeAsset(resources: ModelResource[], entry: string): ModelAsset { return { id: uid(), entry, files: resources }; }

function materialsOf(root: THREE.Object3D): THREE.Material[] {
  const found: THREE.Material[] = [], seen = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of mats) if (material && !seen.has(material)) { seen.add(material); found.push(material); }
  });
  return found;
}
export { materialsOf };

type MaterialLike = THREE.Material & {color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number; roughness?: number; metalness?: number; normalScale?: THREE.Vector2; aoMapIntensity?: number; bumpScale?: number; displacementScale?: number; shininess?: number; [key: string]: unknown};
export function inspectMaterials(root: THREE.Object3D): ImportedMaterial[] {
  return materialsOf(root).map((raw, index) => {
    const m = raw as MaterialLike;
    const present = TEXTURE_SLOTS.filter((slot) => !!m[slot]);
    return {
      name: raw.name || `Material ${index + 1}`,
      color: `#${(m.color || new THREE.Color("#cccccc")).getHexString()}`,
      roughness: Number.isFinite(m.roughness) ? m.roughness! : (Number.isFinite(m.shininess) ? Math.min(1, Math.max(.05, Math.sqrt(2 / (m.shininess! + 2)))) : .75),
      metalness: Number.isFinite(m.metalness) ? m.metalness! : 0,
      opacity: raw.opacity, emissive: `#${(m.emissive || new THREE.Color("#000000")).getHexString()}`,
      emissiveIntensity: m.emissiveIntensity ?? 1, doubleSided: raw.side === THREE.DoubleSide,
      mapStrength: 1, normalStrength: m.normalScale?.x ?? 1, roughnessStrength: 1, metalnessStrength: 1,
      aoStrength: m.aoMapIntensity ?? 1, emissiveMapStrength: 1, alphaStrength: 1,
      bumpStrength: m.bumpScale ?? 1, displacementStrength: m.displacementScale ?? 0,
      present, textures: {},
    };
  });
}

interface OcctMesh { name: string; color?: number[]; brep_faces?: Array<{first: number; last: number; color?: number[]}>; attributes: {position: {array: number[]}; normal?: {array: number[]}}; index: {array: number[]} }
interface OcctNode { name: string; meshes: number[]; children: OcctNode[] }
interface OcctResult { success: boolean; root: OcctNode; meshes: OcctMesh[] }
let occtPromise: Promise<{ReadStepFile: (bytes: Uint8Array, params: object) => OcctResult; ReadIgesFile: (bytes: Uint8Array, params: object) => OcctResult; ReadBrepFile: (bytes: Uint8Array, params: object) => OcctResult}> | null = null;
async function parseCad(bytes: Uint8Array, ext: string): Promise<THREE.Group> {
  if (!occtPromise) {
    const packed = await readPackedAsset("larp-packed-occt", "/src/assets/occt-import-js.wasm.gz");
    const wasmBinary = packed[0] === 0x1f && packed[1] === 0x8b ? gunzipSync(packed) : packed;
    occtPromise = occtFactory({wasmBinary}).catch((error: unknown) => { occtPromise = null; throw error; });
  }
  const occt = await occtPromise!;
  const params = {linearUnit: "millimeter", linearDeflectionType: "bounding_box_ratio", linearDeflection: 0.001, angularDeflection: 0.5};
  const result = CAD.has(ext) && ["step", "stp"].includes(ext) ? occt.ReadStepFile(bytes, params) : ["iges", "igs"].includes(ext) ? occt.ReadIgesFile(bytes, params) : occt.ReadBrepFile(bytes, params);
  if (!result?.success || !result.meshes?.length) throw new Error("The CAD file could not be tessellated or contains no visible solids.");
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  const materialFor = (color?: number[]) => {
    const key = color?.slice(0, 3).join(",") || "default";
    if (!materialCache.has(key)) {
      const c = color?.length === 3 ? new THREE.Color().setRGB(color[0], color[1], color[2], THREE.SRGBColorSpace) : new THREE.Color("#aeb8c0");
      const mat = new THREE.MeshStandardMaterial({color: c, roughness: .65, metalness: .15}); mat.name = color ? `CAD ${key}` : "CAD material"; materialCache.set(key, mat);
    }
    return materialCache.get(key)!;
  };
  const meshes = result.meshes.map((m) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal?.array) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    geometry.setIndex(m.index.array);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const mats: THREE.Material[] = [], ids = new Map<THREE.Material, number>();
    const matIndex = (color?: number[]) => { const mat = materialFor(color || m.color); if (!ids.has(mat)) { ids.set(mat, mats.length); mats.push(mat); } return ids.get(mat)!; };
    if (m.brep_faces?.length) for (const face of m.brep_faces) geometry.addGroup(face.first * 3, (face.last - face.first + 1) * 3, matIndex(face.color));
    else geometry.addGroup(0, m.index.array.length, matIndex());
    const mesh = new THREE.Mesh(geometry, mats.length === 1 ? mats[0] : mats); mesh.name = m.name || "CAD mesh"; return mesh;
  });
  function nodeOf(node: OcctNode): THREE.Group {
    const group = new THREE.Group(); group.name = node.name || "CAD assembly";
    for (const index of node.meshes || []) if (meshes[index]) group.add(meshes[index].clone());
    for (const child of node.children || []) group.add(nodeOf(child));
    return group;
  }
  const group = result.root ? nodeOf(result.root) : new THREE.Group().add(...meshes);
  return group;
}

/** ThreeMFLoader reads the unit attribute but does not apply it. Preserve the
 * build model's declared units and treat the 3MF build plate as Z-up. */
function threeMfUnits(bytes: Uint8Array): {units:ModelUnits; scale:number; warning?:string} {
  const parts=unzipSync(bytes,{filter:(entry)=>/\.model$/i.test(entry.name) || /(^|\/)\_rels\/\.rels$/i.test(entry.name)});
  const decode=(data:Uint8Array) => new TextDecoder().decode(data);
  const relName=Object.keys(parts).find((name)=>/(^|\/)\_rels\/\.rels$/i.test(name));
  const relDoc=relName ? new DOMParser().parseFromString(decode(parts[relName]),"application/xml") : null;
  const rel=relDoc ? Array.from(relDoc.getElementsByTagNameNS("*","Relationship")).find((node)=>/\.model$/i.test(node.getAttribute("Target") || "")) : undefined;
  const target=(rel?.getAttribute("Target") || "").replace(/^\//,"");
  const part=parts[target] || parts[Object.keys(parts).find((name)=>/\.model$/i.test(name)) || ""];
  const doc=part ? new DOMParser().parseFromString(decode(part),"application/xml") : null;
  const model=doc?.getElementsByTagNameNS("*","model")[0];
  const unit=(model?.getAttribute("unit") || "millimeter").toLowerCase();
  const mapped:Record<string,ModelUnits>={millimeter:"mm",centimeter:"cm",meter:"m",inch:"in",foot:"ft",micron:"mm"};
  return {units:mapped[unit] || "mm",scale:unit === "micron" ? .001 : 1,...(!mapped[unit] ? {warning:`Unknown 3MF unit ${unit}; using millimeters. Check units in Properties.`} : {})};
}

/** Parse with a local-only URL resolver. A missing companion never triggers an outside request. */
export interface LoadedModelAsset { root: THREE.Object3D; warnings: string[]; clips: THREE.AnimationClip[] }
export async function loadModelAsset(asset: ModelAsset, options: {allowAnimationOnly?: boolean} = {}): Promise<LoadedModelAsset> {
  const primary = asset.files.find((f) => f.path === asset.entry);
  if (!primary) throw new Error("The model file is missing from this project.");
  const ext = extension(primary.path);
  if (!isModelPath(primary.path)) throw new Error(`Unsupported model format: .${ext}`);
  const bytes = dataUrlBytes(primary.dataUrl);
  if (["3mf", "usdz"].includes(ext)) validateZip(bytes);
  const manager = new THREE.LoadingManager();
  const objectUrls: string[] = [];
  const urlCache = new Map<string, string>();
  const warnings: string[] = [];
  let started = false, finish: () => void = () => {};
  const completed = new Promise<void>((resolve) => { finish = resolve; });
  manager.onStart = () => { started = true; };
  manager.onLoad = () => finish();
  manager.onError = (url) => warnings.push(`Could not load resource: ${url}`);
  const jsURL = (content: string) => { const url = URL.createObjectURL(new Blob([content], {type:"text/javascript"})); objectUrls.push(url); return url; };
  let draco: DRACOLoader | null = null, ktx: KTX2Loader | null = null;
  let dracoJSUrl: string | null = null, basisJSUrl: string | null = null;
  const resourceFor = (path: string) => {
    const cleanUrl = decodeURIComponent(path.split(/[?#]/)[0]).replace(/\\/g, "/");
    const clean = cleanUrl.replace(/^\.\//, "");
    let resource = asset.files.find((f) => f.path.toLowerCase() === clean.toLowerCase());
    if (!resource) resource = asset.files.find((f) => f.path.toLowerCase() === `${entryDir(asset.entry)}${clean}`.toLowerCase());
    if (!resource) {
      const matches = asset.files.filter((f) => basename(f.path).toLowerCase() === basename(clean).toLowerCase());
      if (matches.length === 1) resource = matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous companion file: ${path}. Keep the original folder structure in a ZIP.`);
    }
    return resource;
  };
  manager.setURLModifier((url) => {
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    if (url.startsWith("larp-internal/basis/")) {
      if (url.endsWith("basis_transcoder.js")) return basisJSUrl ||= jsURL(basisJs);
      if (url.endsWith("basis_transcoder.wasm")) return basisWasm;
    }
    const file = resourceFor(url);
    if (!file) throw new Error(`Missing companion file: ${url}. Select it with the model or include it in a ZIP. External URLs are blocked.`);
    if (!urlCache.has(file.path)) { const url = URL.createObjectURL(new Blob([exactBuffer(dataUrlBytes(file.dataUrl))], {type: mime[extension(file.path)] || "application/octet-stream"})); objectUrls.push(url); urlCache.set(file.path, url); }
    return urlCache.get(file.path)!;
  });
  manager.addHandler(/\.tga(?:[?#].*)?$/i, new TGALoader(manager));
  manager.addHandler(/\.dds(?:[?#].*)?$/i, new DDSLoader(manager));
  const str = () => new TextDecoder().decode(bytes);
  let root: THREE.Object3D;
  let clips: THREE.AnimationClip[] = [];
  try {
    if (CAD.has(ext)) root = await parseCad(bytes, ext);
    else switch (ext) {
      case "glb": case "gltf": {
        const loader = new GLTFLoader(manager);
        dracoJSUrl = jsURL(dracoJs);
        draco = new DRACOLoader(manager).setDecoderPath({js: dracoJSUrl, wasm: dracoWasm}).setWorkerLimit(2);
        loader.setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
        if (renderer) { ktx = new KTX2Loader(manager).setTranscoderPath("larp-internal/basis/").detectSupport(renderer).setWorkerLimit(2); loader.setKTX2Loader(ktx); }
        const gltf = await loader.parseAsync(exactBuffer(bytes), entryDir(asset.entry));
        root = gltf.scene; clips = gltf.animations;
        if (gltf.animations.length && !options.allowAnimationOnly) warnings.push("Animations were imported as a static pose; simulation behavior is not created automatically.");
        break;
      }
      case "fbx": {
        root = new FBXLoader(manager).parse(exactBuffer(bytes), entryDir(asset.entry));
        clips = (root as THREE.Group & {animations?: THREE.AnimationClip[]}).animations || [];
        if (clips.length && !options.allowAnimationOnly) warnings.push("FBX animation is shown as a static pose when imported as a model. Select it as a worker to animate it.");
        break;
      }
      case "obj": {
        const text = str(), obj = new OBJLoader(manager);
        const names = [...text.matchAll(/^\s*mtllib\s+(.+)$/gim)].map((m) => m[1].trim());
        const candidates = asset.files.filter((f) => extension(f.path) === "mtl");
        const mtl = names.map((n) => resourceFor(n)).find(Boolean) || (candidates.length === 1 ? candidates[0] : undefined);
        if (names.length && !mtl) warnings.push(`Material library ${names.join(", ")} was not selected; the model will use default materials.`);
        if (mtl) { const creator = new MTLLoader(manager).parse(new TextDecoder().decode(dataUrlBytes(mtl.dataUrl)), entryDir(mtl.path)); creator.preload(); obj.setMaterials(creator); }
        root = obj.parse(text); break;
      }
      case "stl": case "ply": case "vtk": {
        // VTKLoader inspects a fixed 250-byte header; short valid ASCII files need padding.
        const vtkBytes = ext === "vtk" && bytes.length < 250 ? (() => { const padded = new Uint8Array(250).fill(32); padded.set(bytes); return padded; })() : bytes;
        const geometry = ext === "stl" ? new STLLoader(manager).parse(exactBuffer(bytes)) : ext === "ply" ? new PLYLoader(manager).parse(exactBuffer(bytes)) : new VTKLoader(manager).parse(exactBuffer(vtkBytes), entryDir(asset.entry));
        const normals = geometry.getAttribute("normal");
        let nonzero = false;
        if (normals) for (let i = 0; i < Math.min(normals.count, 100); i++) if (Math.abs(normals.getX(i)) + Math.abs(normals.getY(i)) + Math.abs(normals.getZ(i)) > 1e-6) { nonzero = true; break; }
        if (!nonzero) geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({color: "#c3cbd0", metalness: .15, roughness: .68, vertexColors: !!geometry.getAttribute("color")}); material.name = "Default material";
        root = new THREE.Mesh(geometry, material); break;
      }
      case "dae": { const collada = new ColladaLoader(manager).parse(str(), entryDir(asset.entry)); if (!collada) throw new Error("Invalid COLLADA file."); root = collada.scene; clips = collada.scene.animations || []; break; }
      case "3mf": {
        const unit=threeMfUnits(bytes);
        root = new ThreeMFLoader(manager).parse(exactBuffer(bytes));
        root.scale.multiplyScalar(unit.scale); root.userData.larpUnits=unit.units;
        if (unit.warning) warnings.push(unit.warning);
        break;
      }
      case "3ds": root = new TDSLoader(manager).parse(exactBuffer(bytes), entryDir(asset.entry)); break;
      case "usdz": case "usd": case "usda": case "usdc": root = await new Promise((resolve, reject) => new USDLoader(manager).parse(ext === "usda" ? str() : exactBuffer(bytes), entryDir(asset.entry), resolve, reject)); break;
      case "wrl": case "vrml": root = new VRMLLoader(manager).parse(str(), entryDir(asset.entry)); break;
      case "amf": root = new AMFLoader(manager).parse(exactBuffer(bytes)); break;
      default: throw new Error(`Unsupported model format: .${ext}`);
    }
    if (started) await Promise.race([completed, new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Timed out loading model resources.")), 30000))]);
    let meshes = 0;
    root.traverse((node) => { if (node instanceof THREE.Mesh && node.geometry?.getAttribute("position")?.count) { meshes++; node.castShadow = true; node.receiveShadow = true; } });
    if (!meshes && !options.allowAnimationOnly) throw new Error("No renderable triangle meshes were found in this file. Point clouds, curves, empty and unsupported geometry cannot be imported as models.");
    if (options.allowAnimationOnly && !clips.length) throw new Error("No animation clips were found. Export an FBX or GLB containing animation.");
    return {root, warnings, clips};
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  } finally {
    draco?.dispose(); ktx?.dispose(); objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

export function describeImportedModel(asset: ModelAsset, root: THREE.Object3D, clips: THREE.AnimationClip[] = []): ImportedModelData {
  let meshCount = 0, triangleCount = 0, rigged = false;
  root.traverse((node) => { if (node instanceof THREE.SkinnedMesh) rigged = true; if (node instanceof THREE.Mesh && node.geometry?.getAttribute("position")) { meshCount++; triangleCount += Math.floor((node.geometry.index?.count ?? node.geometry.getAttribute("position").count) / 3); } });
  const ext = extension(asset.entry), cad = CAD.has(ext);
  // glTF, COLLADA and USD loaders already convert declared units to meters.
  // FBX GlobalSettings stores the number of centimeters per source unit.
  const fbxScale=Number(root.userData.unitScaleFactor);
  const fbxUnits: [number,ModelUnits][]=[[100,"m"],[1,"cm"],[.1,"mm"],[2.54,"in"],[30.48,"ft"]];
  const fbxUnit=Number.isFinite(fbxScale) ? fbxUnits.find(([factor]) => Math.abs(factor-fbxScale) < 1e-4)?.[1] : undefined;
  const units:ModelUnits = ext === "3mf" ? (root.userData.larpUnits as ModelUnits || "mm")
    : cad || ["stl","amf"].includes(ext) ? "mm"
    : ["glb","gltf","dae","usd","usda","usdc","usdz","wrl","vrml"].includes(ext) ? "m"
    : ext === "fbx" ? fbxUnit || "auto" : "auto";
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root), rawSize = bounds.getSize(new THREE.Vector3());
  const sourceSize: [number, number, number] | undefined = !bounds.isEmpty() && [rawSize.x, rawSize.y, rawSize.z].every(Number.isFinite)
    ? [rawSize.x, rawSize.y, rawSize.z] : undefined;
  return {asset, axis: cad || ["3mf","amf"].includes(ext) ? "z" : "y", units, materials: inspectMaterials(root), meshCount, triangleCount, sourceSize, collision:buildImportedCollision(root), rigged, animationNames: clips.map((clip) => clip.name)};
}

// Parsed geometry is shared by instances; each instance creates its own materials.
// Keep the newest imports for fast duplicate/undo without reparsing large CAD files.
type CachedModel = {asset: ModelAsset; promise: Promise<LoadedModelAsset>};
const parsedCache = new Map<string, CachedModel>();
function sameAsset(a: ModelAsset, b: ModelAsset) {
  return a === b || (a.entry === b.entry && a.files.length === b.files.length && a.files.every((f,i) => f.path === b.files[i].path && f.dataUrl === b.files[i].dataUrl));
}
export function primeModelCache(asset: ModelAsset, root: THREE.Object3D, warnings: string[], clips: THREE.AnimationClip[] = []) {
  parsedCache.set(asset.id, {asset, promise: Promise.resolve({root, warnings, clips})});
  while (parsedCache.size > 12) parsedCache.delete(parsedCache.keys().next().value!);
}
export function getCachedModel(asset: ModelAsset) {
  let cached = parsedCache.get(asset.id);
  if (!cached || !sameAsset(cached.asset, asset)) {
    const promise = loadModelAsset(asset).catch((error) => { if (parsedCache.get(asset.id)?.promise === promise) parsedCache.delete(asset.id); throw error; });
    cached = {asset, promise}; parsedCache.set(asset.id, cached);
    while (parsedCache.size > 12) parsedCache.delete(parsedCache.keys().next().value!);
  }
  return cached.promise;
}

const animationCache = new Map<string, CachedModel>();
export function getCachedAnimation(asset: ModelAsset) {
  let cached = animationCache.get(asset.id);
  if (!cached || !sameAsset(cached.asset, asset)) {
    const promise = loadModelAsset(asset, {allowAnimationOnly: true}).catch((error) => { if (animationCache.get(asset.id)?.promise === promise) animationCache.delete(asset.id); throw error; });
    cached = {asset, promise}; animationCache.set(asset.id, cached);
    while (animationCache.size > 24) animationCache.delete(animationCache.keys().next().value!);
  }
  return cached.promise;
}
