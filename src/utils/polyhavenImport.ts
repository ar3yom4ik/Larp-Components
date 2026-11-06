import { abortable, downloadWebBytes, throwIfAborted, withWebDeadline } from './webRequests';
import type { ImportedModelData, ModelResource } from '../types';
import { describeImportedModel, loadModelAsset, makeAsset, MAX_MODEL_BYTES, MAX_RESOURCES, primeModelCache } from './modelImport';
import { PolyError, getPolyJson, selectPolyFile, type FilesResponse, type PolyAsset, type PolyResolution } from './polyhaven';

const fail = (message: string): never => { throw new PolyError(message); };

/**
 * Downloads one Poly Haven model through the normal import pipeline.
 *
 * Kept apart from `polyhaven.ts` so the catalogue logic can be tested without the 3D
 * loaders (they pull WebAssembly decoders that only exist in the browser bundle).
 *
 * Only glTF is used: it is the format the loader handles best, and models are offered at
 * 1k / 2k / 4k texture resolution. `files[].include` lists the .bin buffer and every
 * texture the .gltf references; they are downloaded as companions so the model is
 * self-contained inside the project file.
 */

function toDataUrl(bytes: ArrayBuffer, path: string): Promise<string> {
  const mime = /\.png$/i.test(path) ? 'image/png'
    : /\.(jpe?g)$/i.test(path) ? 'image/jpeg'
    : /\.ktx2$/i.test(path) ? 'image/ktx2'
    : /\.gltf$/i.test(path) ? 'model/gltf+json'
    : 'application/octet-stream';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${path}`));
    reader.readAsDataURL(new Blob([bytes], { type: mime }));
  });
}

export interface PolyImportResult {
  model: ImportedModelData;
  warnings: string[];
  name: string;
  bytes: number;
}

export async function importPolyHavenModel(
  asset: PolyAsset,
  resolution: PolyResolution,
  options: { signal?: AbortSignal; onProgress?: (message: string) => void } = {},
): Promise<PolyImportResult> {
  const { signal, onProgress } = options;
  onProgress?.('Reading file list…');
  const files = await getPolyJson<FilesResponse>(`https://api.polyhaven.com/files/${asset.id}`, signal);
  const selected = selectPolyFile(files, resolution);
  if (!selected) throw new PolyError('This asset has no glTF download. Try another model.');
  const { entry, resolution: chosen } = selected;
  const entryUrl = entry.url!;

  const companions = Object.entries(entry.include ?? {}).filter(([, value]) => !!value?.url);
  const total = (entry.size ?? 0) + companions.reduce((sum, [, value]) => sum + (value.size ?? 0), 0);
  if (total > MAX_MODEL_BYTES) {
    fail(`This model is ${Math.round(total / 1024 / 1024)} MB at ${chosen}, over the 80 MB import limit. Choose a lower texture resolution.`);
  }
  if (companions.length + 1 > MAX_RESOURCES) fail('This model contains too many files to import.');

  const entryName = decodeURIComponent(entryUrl.split('/').pop() || `${asset.id}.gltf`);
  const inputs = [{path:entryName,url:entryUrl},...companions.map(([path,value])=>({path:path.replace(/^\.\//,''),url:value.url as string}))];
  const resources:ModelResource[] = new Array(inputs.length);
  let next=0, done=0, size=0;
  // A few parallel downloads speed up texture-heavy assets without opening
  // hundreds of requests or exceeding the actual 80 MB combined budget.
  const downloadGroup=new AbortController();
  const abort=()=>downloadGroup.abort();signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  const worker=async()=>{
    while(next<inputs.length) {
      const index=next++, input=inputs[index];
      onProgress?.(index===0 ? `Downloading model (${chosen})…` : `Downloading textures ${done}/${companions.length}…`);
      const bytes=await downloadWebBytes(input.url,{signal:downloadGroup.signal,limit:MAX_MODEL_BYTES});
      size+=bytes.byteLength;
      if(size>MAX_MODEL_BYTES)fail('This model exceeds the 80 MB import limit. Choose a lower texture resolution.');
      resources[index]={path:input.path,dataUrl:await withWebDeadline(inner=>abortable(toDataUrl(bytes,input.path),inner),downloadGroup.signal)};
      done++;
    }
  };
  try {await Promise.all(Array.from({length:Math.min(3,inputs.length)},()=>worker()));}
  catch(error) {downloadGroup.abort();throw error;}
  finally {signal?.removeEventListener('abort',abort);}
  throwIfAborted(signal);
  onProgress?.('Preparing model…');
  const modelAsset = {...makeAsset(resources, entryName), source: {provider:"Poly Haven", title:asset.name, url:`https://polyhaven.com/a/${encodeURIComponent(asset.id)}`, license:"CC0 1.0"}};
  const { root, warnings, clips } = await withWebDeadline(inner=>abortable(loadModelAsset(modelAsset),inner),signal,60000);
  throwIfAborted(signal);
  const model = describeImportedModel(modelAsset, root, clips);
  if (model.materials.length > 2000) throw new Error('This model has over 2,000 materials.');
  // Reuse the already parsed model for the scene placement instead of showing
  // a second loading mesh while downloading/parsing it all over again.
  primeModelCache(modelAsset,root,warnings,clips);
  return { model, warnings, name: asset.name, bytes: size };
}
