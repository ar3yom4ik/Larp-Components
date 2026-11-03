import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Download, Globe2, Loader2, Search, X } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import { cn } from '../utils/cn';
import { POLY_RESOLUTIONS, filterPolyAssets, polyHavenModels, type PolyAsset, type PolyResolution } from '../utils/polyhaven';
import { importPolyHavenModel } from '../utils/polyhavenImport';
import { filterWebAssets, gobkitModels, kenneyModels, type WebAsset } from '../utils/webCatalog';
import { importWebModel } from '../utils/webCatalogImport';
import type { ImportedModelData } from '../types';

type Provider = 'poly' | 'kenney' | 'gobkit';
type Source = Provider | 'all';
type Card = {provider: 'poly'; asset: PolyAsset} | {provider:'kenney' | 'gobkit'; asset:WebAsset};
const sourceNames = {poly:'Poly Haven', kenney:'Kenney (mirror)', gobkit:'Gobkit', all:'All sources'} as const;
const initialLimits = () => ({poly:24, kenney:24, gobkit:24});

/** One searchable web catalog. Imported source bytes and licence information
 * stay in the project, so previously imported models work offline. */
export function PolyHavenBrowser({ onImported, onInfo, onLoadingChange }: {
  onImported: (model: ImportedModelData, warnings: string[]) => boolean | void;
  onInfo: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  useLanguage();
  const [source, setSource] = useState<Source>('all');
  const [poly, setPoly] = useState<PolyAsset[] | null>(null);
  const [gobkit, setGobkit] = useState<WebAsset[] | null>(null);
  const [kenney, setKenney] = useState<WebAsset[] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Provider | 'import', string>>>({});
  const [query, setQuery] = useState('');
  const [limits, setLimits] = useState(initialLimits);
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<PolyResolution>('1k');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const importAbort = useRef<AbortController | null>(null);
  const active = (name: Provider) => source === name || source === 'all';

  useEffect(() => {
    if (!(source === 'poly' || source === 'all') || poly) return;
    const controller = new AbortController();
    setErrors(current => ({...current, poly:undefined}));
    void polyHavenModels(controller.signal).then(models => { if (!controller.signal.aborted) setPoly(models); }).catch((cause:unknown) => { if (!controller.signal.aborted) setErrors(current => ({...current, poly:(cause as Error)?.message ?? 'Could not load Poly Haven.'})); });
    return () => controller.abort();
  }, [source, poly, attempt]);

  useEffect(() => {
    if (!(source === 'gobkit' || source === 'all') || gobkit) return;
    const controller = new AbortController();
    setErrors(current => ({...current, gobkit:undefined}));
    void gobkitModels(controller.signal).then(models => { if (!controller.signal.aborted) setGobkit(models); }).catch((cause:unknown) => { if (!controller.signal.aborted) setErrors(current => ({...current, gobkit:(cause as Error)?.message ?? 'Could not load Gobkit.'})); });
    return () => controller.abort();
  }, [source, gobkit, attempt]);

  useEffect(() => {
    if (!(source === 'kenney' || source === 'all') || kenney) return;
    const controller = new AbortController();
    setErrors(current => ({...current, kenney:undefined}));
    void kenneyModels(controller.signal).then(models => { if (!controller.signal.aborted) setKenney(models); }).catch((cause:unknown) => { if (!controller.signal.aborted) setErrors(current => ({...current, kenney:(cause as Error)?.message ?? 'Could not load the Kenney mirror.'})); });
    return () => controller.abort();
  }, [source, kenney, attempt]);
  useEffect(() => () => { importAbort.current?.abort(); }, []);

  const matchesPoly = useMemo(() => filterPolyAssets(poly ?? [], query), [poly, query]);
  const matchesKenney = useMemo(() => filterWebAssets(kenney ?? [], query), [kenney, query]);
  const matchesGobkit = useMemo(() => filterWebAssets(gobkit ?? [], query), [gobkit, query]);
  const importAsset = async (card: Card) => {
    if (busy) return;
    const controller = new AbortController(); importAbort.current = controller;
    const key = `${card.provider}:${card.asset.id}`;
    setBusy(key); onLoadingChange?.(true); setErrors(current => ({...current, import:undefined}));
    try {
      const result = card.provider === 'poly'
        ? await importPolyHavenModel(card.asset, resolution, {signal:controller.signal, onProgress:setProgress})
        : await importWebModel(card.asset, {signal:controller.signal, onProgress:setProgress});
      if (controller.signal.aborted) return;
      if (onImported(result.model, result.warnings) === false) throw new Error(t('Project would exceed the 180 MB limit. Remove assets or start a new project.'));
      onInfo(`${card.asset.name} imported (${Math.max(1, Math.round(result.bytes / 1024 / 1024))} MB)`);
    } catch (cause) {
      if ((cause as Error)?.name !== 'AbortError') setErrors(current => ({...current, import:(cause as Error)?.message ?? 'The model could not be imported.'}));
    } finally {
      if (importAbort.current === controller) importAbort.current = null;
      setBusy(null); onLoadingChange?.(false); setProgress('');
    }
  };
  const changeQuery = (value:string) => { setQuery(value); setLimits(initialLimits()); };
  const retry = () => { setErrors({}); setAttempt(value => value + 1); };
  const cards = (provider: Provider, entries: (PolyAsset | WebAsset)[]) => <div className="grid grid-cols-1 gap-1.5 pb-2 sm:grid-cols-2">
    {entries.map(asset => {
      const key = `${provider}:${asset.id}`;
      const card:Card = provider === 'poly' ? {provider:'poly', asset:asset as PolyAsset} : {provider, asset:asset as WebAsset};
      return <button key={key} type="button" disabled={!!busy} onClick={() => void importAsset(card)} title={`${asset.name} · ${asset.categories.join(', ')}`} className="group flex items-center gap-2 rounded border border-white/[0.07] bg-[#262629] p-1.5 text-left transition hover:border-[var(--app-accent)]/40 hover:bg-white/[0.05] disabled:opacity-50">
        <span className="relative flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[#1b1b1d]">
          {asset.thumbnail ? <img src={asset.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Box size={18} className="text-white/35" />}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">{busy === key ? <Loader2 size={12} className="animate-spin text-white" /> : <Download size={12} className="text-white" />}</span>
        </span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-[#e6e6e6]">{asset.name}</span><span className="block truncate font-mono text-[7.5px] uppercase tracking-wide text-white/30">{asset.categories[0] ?? 'model'} · {provider === 'poly' ? (asset as PolyAsset).maxResolution : 'GLB'}</span></span>
      </button>;
    })}
  </div>;
  const errorPanel = (name: Provider | 'import') => errors[name] ? <div role="alert" className="mb-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[9.5px] text-amber-100/90">{errors[name]} {name !== 'import' ? <button type="button" onClick={retry} className="underline">{t('Retry')}</button> : <button type="button" aria-label={t('Dismiss')} onClick={() => setErrors(current => ({...current, import:undefined}))}><X size={10}/></button>}</div> : null;
  const heading = (name: Provider) => <div className="mb-1 mt-2 flex items-center justify-between text-[10px] text-white/55"><b>{t(sourceNames[name])}</b><span>CC0</span></div>;
  const section = (name: Provider, data: (PolyAsset | WebAsset)[] | null, matches: (PolyAsset | WebAsset)[]) => <section>
    {heading(name)}{errorPanel(name)}
    {!data && !errors[name] && <p className="py-4 text-center text-[10px] text-white/40">{t('Loading catalogue…')}</p>}
    {cards(name,matches.slice(0,limits[name]))}
    {data && !matches.length && <p className="py-3 text-center text-[10px] text-white/40">{t('No matching models.')}</p>}
    {matches.length > limits[name] && <button type="button" onClick={() => setLimits(current => ({...current, [name]:current[name]+24}))} className="mb-2 w-full rounded border border-white/15 py-1 text-[10px] text-white/70">{t('Show more')} · {t(sourceNames[name])} ({Math.min(limits[name],matches.length)} / {matches.length})</button>}
  </section>;

  return <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pt-3">
    <div className="mb-2 rounded-md border border-[var(--app-accent)]/15 bg-gradient-to-br from-[var(--app-accent)]/[0.08] to-transparent p-2.5">
      <div className="flex items-center gap-1.5"><Globe2 size={11} className="text-[var(--app-accent)]"/><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8fc9f5]">{t('Web model catalogue')}</span></div>
      <p className="mt-1.5 text-[9.5px] leading-relaxed text-white/40">{t('Search CC0 models and import them into the project. Downloads require an internet connection.')}</p>
      <div className="mt-2 flex flex-wrap gap-1" aria-label={t('Model sources')}>{(['all','poly','kenney','gobkit'] as Source[]).map(name => <button key={name} type="button" aria-pressed={source===name} onClick={() => {setSource(name);setLimits(initialLimits());}} className={cn('rounded border px-1.5 py-1 text-[9px]',source===name?'border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-white':'border-white/10 text-white/45 hover:text-white')}>{t(sourceNames[name])}</button>)}</div>
      {active('poly') && <div className="mt-2 flex items-center gap-1"><span className="font-mono text-[8px] uppercase tracking-wide text-white/30">{t('Poly Haven textures')}</span>{POLY_RESOLUTIONS.map(value => <button key={value} type="button" onClick={() => setResolution(value)} className={cn('rounded border px-1.5 py-[2px] font-mono text-[8.5px]',resolution===value?'border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-white':'border-white/10 text-white/40 hover:text-white/70')}>{value}</button>)}</div>}
    </div>
    <details className="mb-2 rounded border border-white/10 bg-black/10 p-2 text-[10px] text-white/55">
      <summary className="cursor-pointer">{t('More sources (manual download)')}</summary>
      <p className="mt-2">{t("More free model sources — browse and download on the provider, then use Import 3D model. Check each model's licence and attribution.")}</p>
      <div className="mt-2 flex flex-wrap gap-1">{[['Sloyd','https://www.sloyd.ai/free-3d-models'],['Poly Pizza','https://poly.pizza/'],['Thingiverse','https://www.thingiverse.com/'],['3DAssets.dev','https://3dassets.dev/']].map(([name,url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded border border-white/15 px-2 py-1 text-[var(--app-accent-bright)] hover:bg-white/10">{name} ↗</a>)}</div>
      <p className="mt-1 text-white/35">{t('Direct provider APIs may require an account or API key; no credentials are stored here.')}</p>
    </details>
    <div className="group mb-2 flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#1e1e1e] px-2 py-1.5 focus-within:border-[var(--app-accent)]/40"><Search size={12} className="shrink-0 text-white/25"/><input value={query} onChange={event => changeQuery(event.target.value)} placeholder={t('Search web models...')} className="w-full bg-transparent text-[10.5px] text-white/75 outline-none placeholder:text-white/25"/>{query && <button type="button" aria-label={t('Clear search')} onClick={() => changeQuery('')} className="text-white/30 hover:text-white/70"><X size={11}/></button>}</div>
    {errorPanel('import')}
    {busy && <div role="status" className="mb-2 flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[9.5px] text-white/60"><Loader2 size={11} className="animate-spin"/><span className="min-w-0 flex-1 truncate">{progress || t('Downloading…')}</span><button type="button" onClick={() => importAbort.current?.abort()} className="text-white/40 hover:text-white">{t('Cancel')}</button></div>}
    {active('poly') && section('poly',poly,matchesPoly)}
    {active('kenney') && section('kenney',kenney,matchesKenney)}
    {active('gobkit') && section('gobkit',gobkit,matchesGobkit)}
    <div className="border-t border-white/[0.06] py-2 text-center text-[9px] text-white/35"><a href="https://polyhaven.com" target="_blank" rel="noreferrer" className="hover:text-white/70">Powered by Poly Haven</a> · <a href="https://kenney.nl/assets" target="_blank" rel="noreferrer" className="hover:text-white/70">Kenney</a> (<a href="https://github.com/Hidencod/tge-assets" target="_blank" rel="noreferrer" className="hover:text-white/70">mirror</a>) · <a href="https://gobkit.com/freebies" target="_blank" rel="noreferrer" className="hover:text-white/70">Gobkit</a> · CC0</div>
  </div>;
}
