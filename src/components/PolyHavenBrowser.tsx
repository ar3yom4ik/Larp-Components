import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Globe2, Loader2, Search, X } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { cn } from "../utils/cn";
import {
  POLY_RESOLUTIONS,
  filterPolyAssets,
  polyHavenModels,
  type PolyAsset,
  type PolyResolution,
} from "../utils/polyhaven";
import { importPolyHavenModel } from "../utils/polyhavenImport";
import type { ImportedModelData } from "../types";

/**
 * Web catalogue tab: browse Poly Haven's CC0 model library and import straight into the
 * scene. The panel is deliberately small — search, resolution, thumbnails, one click to
 * download — because the models are added to the same import pipeline as a local file.
 */
export function PolyHavenBrowser({
  onImported,
  onInfo,
}: {
  onImported: (model: ImportedModelData, warnings: string[]) => void;
  onInfo: (message: string) => void;
}) {
  useLanguage();
  const [assets, setAssets] = useState<PolyAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(120);
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<PolyResolution>("1k");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    void polyHavenModels(controller.signal)
      .then((models) => { if (!controller.signal.aborted) setAssets(models); })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError") return;
        setError((cause as Error)?.message ?? "Could not load the Poly Haven catalogue.");
      });
    return () => controller.abort();
  }, [attempt]);

  const matches = useMemo(() => filterPolyAssets(assets ?? [], query), [assets, query]);
  const visible = matches.slice(0, limit);

  const importAsset = async (asset: PolyAsset) => {
    if (busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(asset.id);
    setProgress(t("Reading file list…"));
    try {
      const result = await importPolyHavenModel(asset, resolution, {
        signal: controller.signal,
        onProgress: (message) => setProgress(message),
      });
      onImported(result.model, result.warnings);
      onInfo?.(`${asset.name} imported (${resolution}, ${Math.max(1, Math.round(result.bytes / 1024 / 1024))} MB)`);
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      setError((cause as Error)?.message ?? "The model could not be imported.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pt-3">
      <div className="mb-2 rounded-md border border-[var(--app-accent)]/15 bg-gradient-to-br from-[var(--app-accent)]/[0.08] to-transparent p-2.5">
        <div className="flex items-center gap-1.5">
          <Globe2 size={11} className="text-[var(--app-accent)]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8fc9f5]">{t("Poly Haven · web catalogue")}</span>
        </div>
        <p className="mt-1.5 text-[9.5px] leading-relaxed text-white/40">
          {t("Thousands of CC0 furniture, machines, crates and plants. Downloaded models are stored inside the project file.")}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <span className="font-mono text-[8px] uppercase tracking-wide text-white/30">{t("Textures")}</span>
          {POLY_RESOLUTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setResolution(value)}
              className={cn(
                "rounded border px-1.5 py-[2px] font-mono text-[8.5px] transition",
                resolution === value
                  ? "border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-white"
                  : "border-white/10 text-white/40 hover:text-white/70",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="group mb-2 flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#1e1e1e] px-2 py-1.5 focus-within:border-[var(--app-accent)]/40">
        <Search size={12} className="shrink-0 text-white/25" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setLimit(120); }}
          placeholder={t("Search polyhaven.com...")}
          className="w-full bg-transparent text-[10.5px] text-white/75 outline-none placeholder:text-white/25"
        />
        {query && <button type="button" onClick={() => setQuery("")} className="text-white/30 hover:text-white/70"><X size={11} /></button>}
      </div>

      {error && (
        <div className="mb-2 flex items-start gap-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[9.5px] text-amber-100/90">
          <span className="min-w-0 flex-1">{error} {!assets && <button type="button" onClick={() => { setError(null); setAttempt((n) => n + 1); }} className="underline">{t("Retry")}</button>}</span>
          <button type="button" onClick={() => setError(null)} className="text-amber-100/60 hover:text-white"><X size={10} /></button>
        </div>
      )}

      {busy && (
        <div className="mb-2 flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[9.5px] text-white/60">
          <Loader2 size={11} className="animate-spin" />
          <span className="min-w-0 flex-1 truncate">{progress || t("Downloading…")}</span>
          <button type="button" onClick={() => abort.current?.abort()} className="text-white/40 hover:text-white">{t("Cancel")}</button>
        </div>
      )}

      {!assets && !error && (
        <div className="flex items-center justify-center gap-2 py-8 text-[10px] text-white/40">
          <Loader2 size={12} className="animate-spin" /> {t("Loading catalogue…")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5 pb-3 sm:grid-cols-2">
        {visible.map((asset) => (
          <button
            key={asset.id}
            type="button"
            disabled={!!busy}
            onClick={() => void importAsset(asset)}
            title={`${asset.name} · ${asset.categories.join(", ")}`}
            className="group flex items-center gap-2 rounded border border-white/[0.07] bg-[#262629] p-1.5 text-left transition hover:border-[var(--app-accent)]/40 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded bg-[#1b1b1d]">
              {asset.thumbnail && (
                <img src={asset.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                {busy === asset.id ? <Loader2 size={12} className="animate-spin text-white" /> : <Download size={12} className="text-white" />}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-medium text-[#e6e6e6]">{asset.name}</span>
              <span className="block truncate font-mono text-[7.5px] uppercase tracking-wide text-white/30">
                {asset.categories[0] ?? "model"} · {asset.maxResolution}
              </span>
            </span>
          </button>
        ))}
      </div>

      {visible.length < matches.length && <button type="button" onClick={() => setLimit((n) => n + 120)} className="mb-3 w-full rounded border border-white/15 py-2 text-xs text-white/70">{t("Show more")} ({visible.length} / {matches.length})</button>}

      {assets && visible.length === 0 && (
        <p className="px-2 py-6 text-center text-[10.5px] text-white/40">{t("No Poly Haven model matches that search.")}</p>
      )}

      <div className="border-t border-white/[0.06] py-2 text-center font-mono text-[7.5px] uppercase tracking-wide text-white/25">
        <a href="https://polyhaven.com" target="_blank" rel="noreferrer" className="hover:text-white/60">
          {t("Powered by Poly Haven")}
        </a>
        {" · CC0 "}
        <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer" className="hover:text-white/60">{t("licence")}</a>
      </div>
    </div>
  );
}
