import { withWebDeadline } from './webRequests';
import { PolyError } from './polyhaven';

export type WebProvider = 'gobkit' | 'kenney';
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

const KENNEY_MIRROR = 'https://hidencod.github.io/tge-assets';

function providerUrl(value: unknown, hosts: string[]): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.includes(url.hostname) ? url.href : null; }
  catch { return null; }
}
function isCC0(value: unknown): boolean { return typeof value === 'string' && /^cc0(?:[-\s]?1\.0)?(?:\s*\(public domain\)(?:\s*[—–-]\s*free for any use, commercial or personal, no attribution required\.?)?)?$/i.test(value.trim()); }

interface GobkitModel { id: string; name?: string; url?: string; rigged?: boolean; license?: string }
interface GobkitPack { id?: string; name?: string; kind?: string; models?: GobkitModel[] }
interface GobkitCommunity { slug: string; title?: string; status?: string; license?: string; download_available?: boolean; creator?: string; model_url?: string; thumb_url?: string; page_url?: string; bytes?: number }
interface KenneyModel { id: string; name?: string; file?: string; thumb?: string; size?: number }
interface KenneyPack { id?: string; name?: string; author?: string; license?: string; url?: string; models?: KenneyModel[] }

/** Curated and community models are individually downloadable CC0 GLBs. */
export function parseGobkit(free: {packs?: GobkitPack[]}, community: {items?: GobkitCommunity[]}): WebAsset[] {
  const out: WebAsset[] = [], seen = new Set<string>();
  for (const pack of Array.isArray(free.packs) ? free.packs : []) for (const model of Array.isArray(pack.models) ? pack.models : []) {
    const downloadUrl = providerUrl(model.url, ['gobkit.com', 'www.gobkit.com']);
    if (!downloadUrl || !model.id || (model.license && !isCC0(model.license)) || seen.has(downloadUrl)) continue;
    seen.add(downloadUrl);
    out.push({provider:'gobkit', id:`${pack.id ?? 'pack'}/${model.id}`, name:model.name || model.id, thumbnail:'', categories:[pack.name || 'Free models'], tags:[pack.kind || '', model.rigged ? 'rigged animated' : 'static'], url:'https://gobkit.com/freebies', downloadUrl});
  }
  for (const item of Array.isArray(community.items) ? community.items : []) {
    const downloadUrl = providerUrl(item.model_url, ['gobkit.com', 'www.gobkit.com']);
    if (!downloadUrl || !item.slug || item.download_available === false || (item.status && item.status !== 'published') || (item.license && !isCC0(item.license)) || seen.has(downloadUrl)) continue;
    seen.add(downloadUrl);
    out.push({provider:'gobkit', id:`community/${item.slug}`, name:item.title || item.slug, thumbnail:providerUrl(item.thumb_url, ['gobkit.com', 'www.gobkit.com']) ?? '', categories:['Community'], tags:[item.creator || ''], url:providerUrl(item.page_url, ['gobkit.com', 'www.gobkit.com']) ?? 'https://gobkit.com/community', downloadUrl, bytes:item.bytes});
  }
  return out;
}

/**
 * Kenney's CC0 models are distributed as self-contained GLBs by the Tiny Game
 * Engine mirror. Accept only its known pack paths and explicitly CC0 Kenney
 * packs, rather than trusting arbitrary URLs or future mixed-license entries.
 */
export function parseKenney(data: {packs?: KenneyPack[]}): WebAsset[] {
  const out: WebAsset[] = [], seen = new Set<string>();
  for (const pack of Array.isArray(data.packs) ? data.packs : []) {
    if (!isCC0(pack.license) || pack.author?.trim().toLowerCase() !== 'kenney') continue;
    const packUrl = providerUrl(pack.url, ['kenney.nl', 'www.kenney.nl']) ?? 'https://kenney.nl/assets';
    for (const model of Array.isArray(pack.models) ? pack.models : []) {
      if (!model.id || typeof model.file !== 'string' || !/^packs\/[\w-]+\/[\w.-]+\.glb$/i.test(model.file)) continue;
      const downloadUrl = `${KENNEY_MIRROR}/${model.file}`;
      if (seen.has(downloadUrl)) continue;
      seen.add(downloadUrl);
      const thumbnail = typeof model.thumb === 'string' && /^packs\/[\w-]+\/thumbs\/[\w.-]+\.webp$/i.test(model.thumb) ? `${KENNEY_MIRROR}/${model.thumb}` : '';
      out.push({provider:'kenney', id:model.id, name:model.name || model.id, thumbnail, categories:[pack.name || 'Kenney'], tags:['Kenney', pack.id || ''], url:packUrl, downloadUrl, bytes:model.size});
    }
  }
  return out;
}

/** Match all search words across name, categories and tags. */
export function filterWebAssets(assets: WebAsset[], query: string): WebAsset[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return assets;
  return assets.filter(asset => { const value = `${asset.name} ${asset.id} ${asset.categories.join(' ')} ${asset.tags.join(' ')}`.toLowerCase(); return words.every(word => value.includes(word)); });
}

async function json<T>(url: string, provider: string, signal?: AbortSignal): Promise<T> {
  return withWebDeadline(async inner=>{
    let response:Response;
    try {response=await fetch(url,{signal:inner,headers:{Accept:'application/json'},credentials:'omit'});}
    catch(error) {if((error as Error)?.name==='AbortError')throw error;throw new PolyError(`${provider} could not be reached from this browser. Check the connection or provider CORS policy.`);}
    if(response.status===429)throw new PolyError(`${provider} is rate limiting requests. Wait a moment and retry.`);
    if(!response.ok)throw new PolyError(`${provider} returned ${response.status}. Retry later.`);
    return await response.json() as T;
  },signal);
}

export async function gobkitModels(signal?: AbortSignal, onPartial?: (message:string)=>void): Promise<WebAsset[]> {
  const [free, community] = await Promise.allSettled([
    json<{packs?: GobkitPack[]}>('https://gobkit.com/api/free', 'Gobkit', signal),
    json<{items?: GobkitCommunity[]}>('https://gobkit.com/api/community', 'Gobkit', signal),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (free.status === 'rejected' && community.status === 'rejected') throw free.reason;
  if (free.status === 'rejected' || community.status === 'rejected') onPartial?.('Part of the Gobkit catalogue could not be loaded. Retry to load the missing models.');
  return parseGobkit(free.status === 'fulfilled' ? free.value : {}, community.status === 'fulfilled' ? community.value : {});
}

export async function kenneyModels(signal?: AbortSignal): Promise<WebAsset[]> {
  return parseKenney(await json<{packs?: KenneyPack[]}>(`${KENNEY_MIRROR}/catalog.json`, 'Kenney mirror', signal));
}
