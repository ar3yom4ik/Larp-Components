import type { ImportedModelData } from '../types';
import { describeImportedModel, loadModelAsset, makeAsset, MAX_MODEL_BYTES, primeModelCache, readBlobAsDataUrl } from './modelImport';
import type { WebAsset } from './webCatalog';

/** Fetch an individually selected CC0 GLB and embed its bytes in the project. */
export async function importWebModel(asset: WebAsset, options: {signal?:AbortSignal; onProgress?:(message:string)=>void} = {}): Promise<{model:ImportedModelData; warnings:string[]; bytes:number}> {
  const {signal, onProgress} = options;
  if (asset.bytes && asset.bytes > MAX_MODEL_BYTES) throw new Error('This model exceeds the 80 MB import limit.');
  onProgress?.('Downloading model…');
  let response: Response;
  try { response = await fetch(asset.downloadUrl, {signal, credentials:'omit'}); }
  catch (error) { if ((error as Error)?.name === 'AbortError') throw error; throw new Error('The model download was blocked or could not be reached. Check the provider and browser CORS policy.'); }
  if (!response.ok) throw new Error(`Model download failed (${response.status}).`);
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_MODEL_BYTES) throw new Error('This model exceeds the 80 MB import limit.');
  const parts: Uint8Array[] = []; let total = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const {done, value} = await reader.read(); if (done) break;
        total += value.byteLength;
        if (total > MAX_MODEL_BYTES) { await reader.cancel(); throw new Error('This model exceeds the 80 MB import limit.'); }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
  } else {
    const value = new Uint8Array(await response.arrayBuffer()); total = value.byteLength;
    if (total > MAX_MODEL_BYTES) throw new Error('This model exceeds the 80 MB import limit.');
    parts.push(value);
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  // Blob accepts ArrayBuffer-backed views; copy so shared/offset buffers are safe.
  const file = new Blob(parts.map(part => new Uint8Array(part)), {type:'model/gltf-binary'});
  const dataUrl = await readBlobAsDataUrl(file);
  const safeName = asset.name.replace(/[^a-z0-9._ -]/gi, '_').trim().slice(0, 120) || 'model';
  const entry = `${safeName}.glb`;
  const modelAsset = {...makeAsset([{path:entry, dataUrl}], entry), source:{provider:asset.provider === 'gobkit' ? 'Gobkit' : 'Kenney', title:asset.name, url:asset.url, license:'CC0 1.0'}};
  onProgress?.('Preparing model…');
  const {root, warnings, clips} = await loadModelAsset(modelAsset);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const model = describeImportedModel(modelAsset, root, clips);
  if (model.materials.length > 2000) throw new Error('This model has over 2,000 materials.');
  primeModelCache(modelAsset, root, warnings, clips);
  return {model, warnings, bytes:total};
}
