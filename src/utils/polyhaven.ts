import { abortable, withWebDeadline } from './webRequests';

/**
 * Poly Haven catalogue integration (https://polyhaven.com).
 *
 * The public API is free and needs no key. Every asset is CC0, so imported models can be
 * used in a project and exported with it. The app credits the source in the browser panel
 * ("Powered by Poly Haven") as their usage guidelines ask, and it does not imply
 * endorsement.
 *
 * This module only talks to the API and stays free of the 3D loaders: the download and
 * parse step lives in `polyhavenImport.ts`, which imports the model pipeline. Keeping the
 * two apart lets the catalogue logic be unit-tested without a WebGL context.
 */
const API = 'https://api.polyhaven.com';

export type PolyResolution = '1k' | '2k' | '4k';
export const POLY_RESOLUTIONS: PolyResolution[] = ['1k', '2k', '4k'];

export interface PolyAsset {
  id: string;
  name: string;
  thumbnail: string;
  categories: string[];
  downloads: number;
  maxResolution: string;
  tags?: string[];
}

interface AssetsResponse {
  [id: string]: {
    name?: string;
    type?: number;
    thumbnail_url?: string;
    categories?: string[];
    tags?: string[];
    category?: string;
    download_count?: number;
    max_resolution?: string | number[];
  };
}

export interface PolyFileSet { url?: string; size?: number; include?: Record<string, { url?: string; size?: number }> }
export interface FilesResponse {
  gltf?: Record<string, PolyFileSet | Record<string, PolyFileSet>>;
  glb?: Record<string, PolyFileSet | Record<string, PolyFileSet>>;
}

/** Friendly message for network and rate-limit failures. */
export class PolyError extends Error {}
const fail = (message: string): never => { throw new PolyError(message); };

export async function getPolyJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return withWebDeadline(async inner=>{
    let response:Response;
    try { response=await fetch(url,{signal:inner,headers:{Accept:'application/json'},credentials:'omit'}); }
    catch(error) {if((error as Error).name==='AbortError')throw error;return fail('Poly Haven could not be reached. Check the internet connection and try again.');}
    if(response.status===429)fail('Poly Haven is rate limiting requests. Wait a moment and try again.');
    if(!response.ok)fail(`Poly Haven returned ${response.status}. Try again later.`);
    return await response.json() as T;
  },signal);
}

/** The API returns dimensions such as [4096, 4096], not a display string. */
export function formatPolyResolution(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const pixels = Math.max(0, ...value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)));
    if (pixels > 0) return pixels >= 1024 && pixels % 1024 === 0 ? `${pixels / 1024}k` : `${pixels}px`;
  }
  return '1k';
}

let catalogue: Promise<PolyAsset[]> | null = null;

/** The full model catalogue (about 500 entries) is fetched once per session. */
export function polyHavenModels(signal?: AbortSignal): Promise<PolyAsset[]> {
  if (!catalogue) {
    catalogue = getPolyJson<AssetsResponse>(`${API}/assets?type=models`).then((data) =>
      Object.entries(data).map(([id, asset]) => ({
        id,
        name: asset.name || id,
        thumbnail: asset.thumbnail_url || `https://cdn.polyhaven.com/asset_img/thumbs/${encodeURIComponent(id)}.png?width=256&height=256`,
        categories: asset.categories?.length ? asset.categories : asset.category ? [asset.category] : [],
        tags: asset.tags ?? [],
        downloads: asset.download_count ?? 0,
        maxResolution: formatPolyResolution(asset.max_resolution),
      })),
    );
    // A failed catalogue should be retried on the next try, not cached forever.
    catalogue.catch(() => { catalogue = null; });
  }
  return abortable(catalogue,signal);
}

/** Local ranking: the API search endpoint has a stricter rate limit and no CORS guarantees. */
export function filterPolyAssets(assets: PolyAsset[], query: string): PolyAsset[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return assets;
  const words = needle.split(/\s+/).filter(Boolean);
  return assets
    .map((asset) => {
      const haystack = `${asset.id.replace(/_/g, ' ')} ${asset.name} ${asset.categories.join(' ')} ${(asset.tags ?? []).join(' ')}`.toLowerCase();
      if (!words.every((word) => haystack.includes(word))) return null;
      const exact = asset.name.toLowerCase() === needle ? 3 : asset.name.toLowerCase().startsWith(needle) ? 2 : 1;
      return { asset, score: exact };
    })
    .filter((entry): entry is { asset: PolyAsset; score: number } => !!entry)
    .sort((a, b) => b.score - a.score || b.asset.downloads - a.asset.downloads)
    .map((entry) => entry.asset);
}

export function isPolyError(error: unknown): error is Error {
  return error instanceof PolyError;
}

/** Poly Haven nests files by resolution and format (gltf/1k/gltf). */
export function selectPolyFile(files: FilesResponse, resolution: PolyResolution): { entry: PolyFileSet; resolution: string } | null {
  for (const format of ['gltf', 'glb'] as const) {
    const sets = files[format] ?? {};
    const available = Object.keys(sets);
    const chosen = available.includes(resolution) ? resolution : available.includes('1k') ? '1k' : available[0];
    if (!chosen) continue;
    const value = sets[chosen];
    const entry = ('url' in value ? value : (value as Record<string, PolyFileSet>)[format]) as PolyFileSet | undefined;
    if (entry?.url) return { entry, resolution: chosen };
  }
  return null;
}
