import { abortable, downloadWebBytes, throwIfAborted, withWebDeadline } from './webRequests';
import type { ImportedModelData } from '../types';
import { describeImportedModel, loadModelAsset, makeAsset, MAX_MODEL_BYTES, primeModelCache, readBlobAsDataUrl } from './modelImport';
import type { WebAsset } from './webCatalog';

/** Fetch an individually selected CC0 GLB and embed its bytes in the project. */
export async function importWebModel(asset: WebAsset, options: {signal?:AbortSignal; onProgress?:(message:string)=>void} = {}): Promise<{model:ImportedModelData; warnings:string[]; bytes:number}> {
  const {signal, onProgress} = options;
  if (asset.bytes && asset.bytes > MAX_MODEL_BYTES) throw new Error('This model exceeds the 80 MB import limit.');
  onProgress?.('Downloading model…');
  let bytes:ArrayBuffer;
  try { bytes=await downloadWebBytes(asset.downloadUrl,{signal,limit:MAX_MODEL_BYTES}); }
  catch(error) {
    if ((error as Error)?.name === 'AbortError' || /limit|timed out|failed \(/i.test((error as Error)?.message ?? '')) throw error;
    throw new Error('The model download was blocked or could not be reached. Check the provider and browser CORS policy.');
  }
  throwIfAborted(signal);
  const total=bytes.byteLength;
  // Blob accepts ArrayBuffer-backed views; copy so shared/offset buffers are safe.
  const file = new Blob([bytes], {type:'model/gltf-binary'});
  const dataUrl = await withWebDeadline(inner=>abortable(readBlobAsDataUrl(file),inner),signal);
  const safeName = asset.name.replace(/[^a-z0-9._ -]/gi, '_').trim().slice(0, 120) || 'model';
  const entry = `${safeName}.glb`;
  const modelAsset = {...makeAsset([{path:entry, dataUrl}], entry), source:{provider:asset.provider === 'gobkit' ? 'Gobkit' : 'Kenney', title:asset.name, url:asset.url, license:'CC0 1.0'}};
  onProgress?.('Preparing model…');
  const {root, warnings, clips} = await withWebDeadline(inner=>abortable(loadModelAsset(modelAsset),inner),signal,60000);
  throwIfAborted(signal);
  const model = describeImportedModel(modelAsset, root, clips);
  if (model.materials.length > 2000) throw new Error('This model has over 2,000 materials.');
  primeModelCache(modelAsset, root, warnings, clips);
  return {model, warnings, bytes:total};
}
