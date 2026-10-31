
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
}

interface AssetsResponse {
  [id: string]: {
    name?: string;
    type?: number;
    thumbnail_url?: string;
    categories?: string[];
    category?: string;
    download_count?: number;
    max_resolution?: string;
  };
}

export interface PolyFileSet { url?: string; size?: number; include?: Record<string, { url?: string; size?: number }> }
export interface FilesResponse {
  gltf?: Record<string, PolyFileSet>;
  glb?: Record<string, PolyFileSet>;
}

/** Friendly message for network and rate-limit failures. */
export class PolyError extends Error {}
const fail = (message: string): never => { throw new PolyError(message); };

export async function getPolyJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return fail('Poly Haven could not be reached. Check the internet connection and try again.');
  }
  if (response.status === 429) fail('Poly Haven is rate limiting requests. Wait a moment and try again.');
  if (!response.ok) fail(`Poly Haven returned ${response.status}. Try again later.`);
  return (await response.json()) as T;
}

let catalogue: Promise<PolyAsset[]> | null = null;

/** The full model catalogue (about 500 entries) is fetched once per session. */
export function polyHavenModels(signal?: AbortSignal): Promise<PolyAsset[]> {
  if (!catalogue) {
    catalogue = getPolyJson<AssetsResponse>(`${API}/assets?type=models`, signal).then((data) =>
      Object.entries(data).map(([id, asset]) => ({
        id,
        name: asset.name || id,
        thumbnail: asset.thumbnail_url || '',
        categories: asset.categories?.length ? asset.categories : asset.category ? [asset.category] : [],
        downloads: asset.download_count ?? 0,
        maxResolution: asset.max_resolution || '1k',
      })),
    );
    // A failed catalogue should be retried on the next try, not cached forever.
    catalogue.catch(() => { catalogue = null; });
  }
  return catalogue;
}

/** Local ranking: the API search endpoint has a stricter rate limit and no CORS guarantees. */
export function filterPolyAssets(assets: PolyAsset[], query: string): PolyAsset[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return assets;
  const words = needle.split(/\s+/).filter(Boolean);
  return assets
    .map((asset) => {
      const haystack = `${asset.name} ${asset.categories.join(' ')}`.toLowerCase();
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
