import { filterPolyAssets } from './polyhaven';

export type WebProvider = 'gobkit' | '3dassets';
export interface WebAsset {
  provider: WebProvider;
  id: string;
  name: string;
  thumbnail: string;
  categories: string[];
  tags: string[];
  url: string;
  downloadUrl: string;
  bytes?: number;
}

// Only expected HTTPS provider hosts may be used for automatic downloads. The
// remote catalogs are data, not permission to fetch arbitrary local addresses.
function providerUrl(value: unknown, hosts: string[]): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.port && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

interface GobkitModel { id?: string; name?: string; url?: string; rigged?: boolean; license?: string }
interface GobkitPack { id?: string; name?: string; kind?: string; models?: GobkitModel[] }
interface GobkitCommunity { slug?: string; title?: string; model_url?: string; thumb_url?: string; page_url?: string; creator?: string; download_available?: boolean; status?: string; bytes?: number; license?: string }

export function parseGobkit(free: {packs?: GobkitPack[]}, community: {items?: GobkitCommunity[]}): WebAsset[] {
  const out: WebAsset[] = [], seen = new Set<string>();
  for (const pack of Array.isArray(free.packs) ? free.packs : []) for (const model of Array.isArray(pack.models) ? pack.models : []) {
    const downloadUrl = providerUrl(model.url, ['gobkit.com', 'www.gobkit.com']);
    if (!downloadUrl || !model.id || (model.license && !/cc0/i.test(model.license)) || seen.has(downloadUrl)) continue;
    seen.add(downloadUrl);
    out.push({provider:'gobkit', id:`${pack.id ?? 'pack'}/${model.id}`, name:model.name || model.id, thumbnail:'', categories:[pack.name || 'Free models'], tags:[pack.kind || '', model.rigged ? 'rigged animated' : 'static'], url:'https://gobkit.com/freebies', downloadUrl});
  }
  for (const item of Array.isArray(community.items) ? community.items : []) {
    const downloadUrl = providerUrl(item.model_url, ['gobkit.com', 'www.gobkit.com']);
    if (!downloadUrl || !item.slug || item.download_available === false || (item.status && item.status !== 'published') || (item.license && !/cc0/i.test(item.license)) || seen.has(downloadUrl)) continue;
    seen.add(downloadUrl);
    out.push({provider:'gobkit', id:`community/${item.slug}`, name:item.title || item.slug, thumbnail:providerUrl(item.thumb_url, ['gobkit.com', 'www.gobkit.com']) ?? '', categories:['Community'], tags:[item.creator || ''], url:providerUrl(item.page_url, ['gobkit.com', 'www.gobkit.com']) ?? 'https://gobkit.com/community', downloadUrl, bytes:item.bytes});
  }
  return out;
}

interface ThreeDAsset {
  slug?: string; title?: string; cdnUrl?: string; thumbnailUrl?: string; url?: string;
  category?: {title?: string}; tags?: {title?: string}[]; stats?: {fileSize?: number}; status?: string; license?: {slug?: string};
}
export function parseThreeDAssets(data: {data?: ThreeDAsset[]; total?: number; totalPages?: number; page?: number}) {
  const assets: WebAsset[] = [];
  for (const item of Array.isArray(data.data) ? data.data : []) {
    const downloadUrl = providerUrl(item.cdnUrl, ['cdn.3dassets.dev']);
    if (!item.slug || !downloadUrl || (item.status && item.status !== 'published') || (item.license?.slug && item.license.slug !== 'cc0-1.0')) continue;
    assets.push({provider:'3dassets', id:item.slug, name:item.title || item.slug, thumbnail:providerUrl(item.thumbnailUrl, ['cdn.3dassets.dev']) ?? '', categories:item.category?.title ? [item.category.title] : [], tags:(Array.isArray(item.tags) ? item.tags : []).map(tag => tag.title ?? '').filter(Boolean), url:providerUrl(item.url, ['3dassets.dev', 'www.3dassets.dev']) ?? `https://3dassets.dev/assets/${encodeURIComponent(item.slug)}`, downloadUrl, bytes:item.stats?.fileSize});
  }
  return {assets, page:Math.max(1, Number(data.page) || 1), total:Math.max(0, Number(data.total) || 0), totalPages:Math.max(1, Number(data.totalPages) || 1)};
}

export function filterWebAssets(assets: WebAsset[], query: string): WebAsset[] {
  // Same local matching and ranking as Poly Haven, with server results kept
  // separately so 3DAssets can search the full remote catalogue.
  const indexed = assets.map(asset => ({...asset, downloads:0, maxResolution:'GLB'}));
  return filterPolyAssets(indexed, query) as typeof indexed;
}

async function json<T>(url: string, provider: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(url, {signal, credentials:'omit'}); }
  catch (error) { if ((error as Error)?.name === 'AbortError') throw error; throw new Error(`${provider} could not be reached from this browser. Check the connection or provider CORS policy.`); }
  if (!response.ok) throw new Error(`${provider} returned ${response.status}. Try again later.`);
  return await response.json() as T;
}

export async function gobkitModels(signal?: AbortSignal): Promise<WebAsset[]> {
  const [free, community] = await Promise.allSettled([
    json<{packs?: GobkitPack[]}>('https://gobkit.com/api/free', 'Gobkit', signal),
    json<{items?: GobkitCommunity[]}>('https://gobkit.com/api/community', 'Gobkit', signal),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (free.status === 'rejected' && community.status === 'rejected') throw free.reason;
  return parseGobkit(free.status === 'fulfilled' ? free.value : {}, community.status === 'fulfilled' ? community.value : {});
}

export async function threeDAssetsModels(query: string, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({limit:'48', page:String(page)});
  if (query.trim()) params.set('q', query.trim());
  return parseThreeDAssets(await json(`https://3dassets.dev/api/v1/assets?${params}`, '3DAssets.dev', signal));
}
