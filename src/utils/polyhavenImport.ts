import type { ImportedModelData, ModelResource } from '../types';
import { describeImportedModel, loadModelAsset, makeAsset, MAX_MODEL_BYTES, MAX_RESOURCES } from './modelImport';
import { PolyError, getPolyJson, type FilesResponse, type PolyAsset, type PolyResolution } from './polyhaven';

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

async function download(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) fail(`Download failed (${response.status}) for ${url.split('/').pop()}.`);
  return response.arrayBuffer();
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
  const gltfSets = files.gltf ?? {};
  const glbSets = files.glb ?? {};
  // Prefer glTF (external textures) because it keeps the texture resolution controllable.
  const sets = Object.keys(gltfSets).length ? gltfSets : glbSets;
  if (!Object.keys(sets).length) fail('This asset has no glTF download. Try another model.');
  const available = Object.keys(sets);
  const chosen = available.includes(resolution) ? resolution : available.includes('1k') ? '1k' : available[0];
  const entry = sets[chosen];
  const entryUrl = entry?.url;
  if (!entryUrl) throw new PolyError('Poly Haven did not return a download link for this model.');

  const companions = Object.entries(entry.include ?? {}).filter(([, value]) => !!value?.url);
  const total = (entry.size ?? 0) + companions.reduce((sum, [, value]) => sum + (value.size ?? 0), 0);
  if (total > MAX_MODEL_BYTES) {
    fail(`This model is ${Math.round(total / 1024 / 1024)} MB at ${chosen}, over the 80 MB import limit. Choose a lower texture resolution.`);
  }
  if (companions.length + 1 > MAX_RESOURCES) fail('This model contains too many files to import.');

  const entryName = decodeURIComponent(entryUrl.split('/').pop() || `${asset.id}.gltf`);
  const resources: ModelResource[] = [];

  onProgress?.(`Downloading model (${chosen})…`);
  const entryBytes = await download(entryUrl, signal);
  resources.push({ path: entryName, dataUrl: await toDataUrl(entryBytes, entryName) });

  let done = 1;
  for (const [path, value] of companions) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    onProgress?.(`Downloading textures ${done}/${companions.length}…`);
    const bytes = await download(value.url as string, signal);
    const clean = path.replace(/^\.\//, '');
    resources.push({ path: clean, dataUrl: await toDataUrl(bytes, clean) });
    done += 1;
  }

  onProgress?.('Preparing model…');
  const modelAsset = makeAsset(resources, entryName);
  const { root, warnings, clips } = await loadModelAsset(modelAsset);
  const model = describeImportedModel(modelAsset, root, clips);
  const size = resources.reduce((sum, resource) => sum + Math.round(resource.dataUrl.length * 0.75), 0);
  return { model, warnings, name: asset.name, bytes: size };
}
