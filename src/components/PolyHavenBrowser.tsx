import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Download, Globe2, Loader2, Search, X } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import { cn } from '../utils/cn';
import { POLY_RESOLUTIONS, filterPolyAssets, polyHavenModels, type PolyAsset, type PolyResolution } from '../utils/polyhaven';
import { importPolyHavenModel } from '../utils/polyhavenImport';
import { filterWebAssets, gobkitModels, threeDAssetsModels, type WebAsset } from '../utils/webCatalog';
import { importWebModel } from '../utils/webCatalogImport';
import type { ImportedModelData } from '../types';

type Source = 'poly' | '3dassets' | 'gobkit' | 'all';
type Card = {provider: 'poly'; asset: PolyAsset} | {provider:'3dassets' | 'gobkit'; asset:WebAsset};
const sourceNames = {poly:'Poly Haven', '3dassets':'3DAssets.dev', gobkit:'Gobkit', all:'All sources'} as const;

/** One searchable web catalog. Each provider downloads through the same model
 * import pipeline; all source bytes and licence information stay in the project. */
export function PolyHavenBrowser({ onImported, onInfo, onLoadingChange }: {
  onImported: (model: ImportedModelData, warnings: string[]) => boolean | void;
  onInfo: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  useLanguage();
  const [source, setSource] = useState<Source>('poly');
  const [poly, setPoly] = useState<PolyAsset[] | null>(null);
  const [gobkit, setGobkit] = useState<WebAsset[] | null>(null);
  const [threeD, setThreeD] = useState<WebAsset[]>([]);
  const [threeDPage, setThreeDPage] = useState(1);
  const [threeDTotalPages, setThreeDTotalPages] = useState(1);
  const [threeDLoading, setThreeDLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'poly' | 'gobkit' | '3dassets' | 'import', string>>>({});
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(120);
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<PolyResolution>('1k');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const importAbort = useRef<AbortController | null>(null);
  const active = (name: Exclude<Source, 'all'>) => source === name || source === 'all';

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

  // 3DAssets has a large paginated catalogue. Search remotely, debounce typing,
  // and cancel old searches so a slower response cannot replace newer results.
  useEffect(() => {
    if (!(source === '3dassets' || source === 'all')) return;
    const controller = new AbortController();
    setThreeDLoading(true); setErrors(current => ({...current, '3dassets':undefined}));
    const timer = window.setTimeout(() => {
      void threeDAssetsModels(query, threeDPage, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setThreeD(current => threeDPage === 1 ? result.assets : [...current, ...result.assets.filter(asset => !current.some(old => old.id === asset.id))]);
        setThreeDTotalPages(result.totalPages);
      }).catch((cause:unknown) => { if (!controller.signal.aborted) setErrors(current => ({...current, '3dassets':(cause as Error)?.message ?? 'Could not load 3DAssets.dev.'})); })
        .finally(() => { if (!controller.signal.aborted) setThreeDLoading(false); });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [source, query, threeDPage, attempt]);
  useEffect(() => () => { importAbort.current?.abort(); }, []);

  const matchesPoly = useMemo(() => filterPolyAssets(poly ?? [], query), [poly, query]);
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
  const changeQuery = (value:string) => { setQuery(value); setLimit(120); setThreeDPage(1); setThreeD([]); setThreeDTotalPages(1); };
  const retry = () => { setErrors({}); setThreeDPage(1); setThreeD([]); setAttempt(value => value + 1); };
  const cards = (provider: 'poly' | '3dassets' | 'gobkit', entries: (PolyAsset | WebAsset)[]) => <div className="grid grid-cols-1 gap-1.5 pb-2 sm:grid-cols-2">
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
  const errorPanel = (name: 'poly' | 'gobkit' | '3dassets' | 'import') => errors[name] ? <div role="alert" className="mb-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[9.5px] text-amber-100/90">{errors[name]} {name !== 'import' && <button type="button" onClick={retry} className="underline">{t('Retry')}</button>} <button type="button" aria-label={t('Dismiss')} onClick={() => setErrors(current => ({...current, [name]:undefined}))}><X size={10}/></button></div> : null;
  const heading = (name: Exclude<Source,'all'>) => <div className="mb-1 mt-2 flex items-center justify-between text-[10px] text-white/55"><b>{sourceNames[name]}</b><span>CC0</span></div>;

  return <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pt-3">
    <div className="mb-2 rounded-md border border-[var(--app-accent)]/15 bg-gradient-to-br from-[var(--app-accent)]/[0.08] to-transparent p-2.5">
      <div className="flex items-center gap-1.5"><Globe2 size={11} className="text-[var(--app-accent)]"/><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8fc9f5]">{t('Web model catalogue')}</span></div>
      <p className="mt-1.5 text-[9.5px] leading-relaxed text-white/40">{t('Search CC0 models and import them into the project. Downloads require an internet connection.')}</p>
      <div className="mt-2 flex flex-wrap gap-1" aria-label={t('Model sources')}>{(['poly','3dassets','gobkit','all'] as Source[]).map(name => <button key={name} type="button" aria-pressed={source===name} onClick={() => {setSource(name);setLimit(120);setThreeDPage(1);setThreeD([]);}} className={cn('rounded border px-1.5 py-1 text-[9px]',source===name?'border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-white':'border-white/10 text-white/45 hover:text-white')}>{t(sourceNames[name])}</button>)}</div>
      {active('poly') && <div className="mt-2 flex items-center gap-1"><span className="font-mono text-[8px] uppercase tracking-wide text-white/30">{t('Poly Haven textures')}</span>{POLY_RESOLUTIONS.map(value => <button key={value} type="button" onClick={() => setResolution(value)} className={cn('rounded border px-1.5 py-[2px] font-mono text-[8.5px]',resolution===value?'border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-white':'border-white/10 text-white/40 hover:text-white/70')}>{value}</button>)}</div>}
    </div>
    <details className="mb-2 rounded border border-white/10 bg-black/10 p-2 text-[10px] text-white/55">
      <summary className="cursor-pointer">{t('More sources (manual download)')}</summary>
      <p className="mt-2">{t("More free model sources — browse and download on the provider, then use Import 3D model. Check each model's licence and attribution.")}</p>
      <div className="mt-2 flex flex-wrap gap-1">{[['Sloyd','https://www.sloyd.ai/free-3d-models'],['Poly Pizza','https://poly.pizza/'],['Thingiverse','https://www.thingiverse.com/']].map(([name,url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded border border-white/15 px-2 py-1 text-[var(--app-accent-bright)] hover:bg-white/10">{name} ↗</a>)}</div>
      <p className="mt-1 text-white/35">{t('Direct provider APIs may require an account or API key; no credentials are stored here.')}</p>
    </details>
    <div className="group mb-2 flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#1e1e1e] px-2 py-1.5 focus-within:border-[var(--app-accent)]/40"><Search size={12} className="shrink-0 text-white/25"/><input value={query} onChange={event => changeQuery(event.target.value)} placeholder={t('Search web models...')} className="w-full bg-transparent text-[10.5px] text-white/75 outline-none placeholder:text-white/25"/>{query && <button type="button" aria-label={t('Clear search')} onClick={() => changeQuery('')} className="text-white/30 hover:text-white/70"><X size={11}/></button>}</div>
    {errorPanel('import')}
    {busy && <div role="status" className="mb-2 flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[9.5px] text-white/60"><Loader2 size={11} className="animate-spin"/><span className="min-w-0 flex-1 truncate">{progress || t('Downloading…')}</span><button type="button" onClick={() => importAbort.current?.abort()} className="text-white/40 hover:text-white">{t('Cancel')}</button></div>}
    {active('poly') && <section>{heading('poly')}{errorPanel('poly')}{!poly && !errors.poly && <p className="py-4 text-center text-[10px] text-white/40">{t('Loading catalogue…')}</p>}{cards('poly',matchesPoly.slice(0,limit))}{poly && !matchesPoly.length && <p className="py-3 text-center text-[10px] text-white/40">{t('No matching models.')}</p>}{matchesPoly.length > limit && <button type="button" onClick={() => setLimit(n=>n+120)} className="mb-2 w-full rounded border border-white/15 py-1 text-[10px] text-white/70">{t('Show more')} ({Math.min(limit,matchesPoly.length)} / {matchesPoly.length})</button>}</section>}
    {active('3dassets') && <section>{heading('3dassets')}{errorPanel('3dassets')}{cards('3dassets',threeD)}{threeDLoading && <p className="py-4 text-center text-[10px] text-white/40">{t('Loading catalogue…')}</p>}{!threeDLoading && !errors['3dassets'] && !threeD.length && <p className="py-3 text-center text-[10px] text-white/40">{t('No matching models.')}</p>}{threeDPage < threeDTotalPages && <button type="button" disabled={threeDLoading} onClick={() => setThreeDPage(n=>n+1)} className="mb-2 w-full rounded border border-white/15 py-1 text-[10px] text-white/70">{t('Show more')} · 3DAssets.dev</button>}</section>}
    {active('gobkit') && <section>{heading('gobkit')}{errorPanel('gobkit')}{!gobkit && !errors.gobkit && <p className="py-4 text-center text-[10px] text-white/40">{t('Loading catalogue…')}</p>}{cards('gobkit',matchesGobkit.slice(0,limit))}{gobkit && !matchesGobkit.length && <p className="py-3 text-center text-[10px] text-white/40">{t('No matching models.')}</p>}{matchesGobkit.length > limit && <button type="button" onClick={() => setLimit(n=>n+120)} className="mb-2 w-full rounded border border-white/15 py-1 text-[10px] text-white/70">{t('Show more')} ({Math.min(limit,matchesGobkit.length)} / {matchesGobkit.length})</button>}</section>}
    <div className="border-t border-white/[0.06] py-2 text-center text-[9px] text-white/35"><a href="https://polyhaven.com" target="_blank" rel="noreferrer" className="hover:text-white/70">Poly Haven</a> · <a href="https://3dassets.dev" target="_blank" rel="noreferrer" className="hover:text-white/70">3DAssets.dev</a> · <a href="https://gobkit.com/freebies" target="_blank" rel="noreferrer" className="hover:text-white/70">Gobkit</a> · CC0</div>
  </div>;
}
