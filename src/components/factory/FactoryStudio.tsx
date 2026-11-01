import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Factory, Plus, RotateCcw, Upload, Wand2 } from "lucide-react";
import { GraphCanvas } from "./GraphCanvas";
import { NodeInspector } from "./NodeInspector";
import { nodesByCategory, getNodeDef } from "../../gen/graph/registry";
import { connect, makeNode, removeNode, setParam, validateGraph } from "../../gen/graph/graph";
import { compileGraph } from "../../gen/graph/compile";
import { useFactoryGraph, setGraph as storeGraph, resetGraph, replaceGraph, undoGraph, redoGraph } from "../../gen/graphStore";
import { describeIntent, analyzePrompt } from "../../gen/prompt";
import { FloorPlanView } from "../FloorPlanView";
import { cn } from "../../utils/cn";
import { t } from "../../i18n";
import type { GenOptions } from "../../sim/generator";
import type { PlantResult } from "../../gen/graph/types";
import type { SceneItem } from "../../types";
import "../../gen/graph/nodes";

/**
 * The node-based factory generator.
 *
 * Layout: palette (left), canvas (centre), inspector + build output (right). Everything
 * the graph produces is previewed live — the same `FloorPlanView` the form dialog uses —
 * and "Build factory" hands the compiled scene to the app exactly like before.
 */
export function FactoryStudio({
  onBuild,
  onClose,
}: {
  onBuild: (items: SceneItem[], options: GenOptions) => void;
  onClose: () => void;
}) {
  const graph = useFactoryGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;

  const validation = useMemo(() => validateGraph(graph), [graph]);
  const compiled = useMemo(() => compileGraph(graph), [graph]);
  const plant: PlantResult | null = compiled.plant;
  const errors = compiled.diagnostics.filter((entry) => entry.severity === 'error');
  const warnings = compiled.diagnostics.filter((entry) => entry.severity === 'warning');

  const promptNode = graph.nodes.find((node) => node.type === 'input.prompt');
  const intent = useMemo(
    () => (promptNode ? analyzePrompt(String(promptNode.params.text ?? '')) : null),
    [promptNode],
  );

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };

  const handleConnect = useCallback((from: { node: string; port: string }, to: { node: string; port: string }) => {
    const result = connect(graph, from, to);
    if (!result.ok) { flash(result.error ?? t('Cannot connect those ports.')); return; }
    storeGraph(result.graph);
  }, [graph]);

  const addNode = (type: string) => {
    const def = getNodeDef(type);
    if (!def) return;
    const maxX = graph.nodes.length ? Math.max(...graph.nodes.map((node) => node.x)) : 0;
    const node = makeNode(type, maxX + 260, 40 + (graph.nodes.length % 6) * 90);
    storeGraph({ ...graph, nodes: [...graph.nodes, node] });
    setSelectedId(node.id);
    setPaletteOpen(false);
    flash(`${def.title} ${t('added')}`);
  };

  const exportGraph = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'factory-graph.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importGraph = async (file: File) => {
    try {
      replaceGraph(JSON.parse(await file.text()));
      flash(t('Graph imported'));
    } catch {
      flash(t('That file is not a factory graph.'));
    }
  };

  const build = () => {
    if (!plant || errors.length) { flash(t('Fix the graph errors first.')); return; }
    onBuild(plant.items, plant.options);
    onClose();
  };

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || (event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable=true]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (key === 'y' || event.shiftKey) redoGraph(); else undoGraph();
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, []);

  // Focus the build result once so the dialog does not lie about being ready.
  useEffect(() => { if (errors.length) setSelectedId(errors[0].nodeId ?? null); }, [errors.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#242427] px-3 py-2">
        <span className="flex items-center gap-1.5 rounded bg-[var(--app-accent)]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-accent-bright)]">
          <Wand2 size={11} /> {t('Factory parts')}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          {errors.length ? (
            <span className="flex items-center gap-1 text-red-300"><AlertTriangle size={10} /> {errors.length} {t('error(s)')}</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 size={10} /> {t('Valid graph')}</span>
          )}
          {warnings.length > 0 && <span className="text-amber-300/80">· {warnings.length} {t('warning(s)')}</span>}
          <span className="font-mono text-white/25">· {compiled.ms} ms · {graph.nodes.length} {t('nodes')}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setPaletteOpen((open) => !open)} className="flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-[10.5px] text-white/70 hover:bg-white/10"><Plus size={11} />{t('Add node')}</button>
          <button type="button" onClick={exportGraph} title={t('Export graph')} className="rounded border border-white/15 p-1.5 text-white/55 hover:bg-white/10"><Download size={11} /></button>
          <label title={t('Import graph')} className="cursor-pointer rounded border border-white/15 p-1.5 text-white/55 hover:bg-white/10">
            <Upload size={11} />
            <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importGraph(file); }} />
          </label>
          <button type="button" onClick={() => { resetGraph(); flash(t('Starter graph restored')); }} title={t('Reset to starter graph')} className="rounded border border-white/15 p-1.5 text-white/55 hover:bg-white/10"><RotateCcw size={11} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {paletteOpen && (
          <div className="thin-scroll w-[186px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#232326] p-2">
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search parts…')} aria-label={t('Search parts')} className="mb-2 w-full rounded border border-white/15 bg-[#19191b] px-2 py-1 text-xs text-white" />
            {nodesByCategory().filter((group) => group.defs.some((def) => def.type.startsWith('part.') && `${def.title} ${def.description} ${def.type}`.toLowerCase().includes(search.trim().toLowerCase()))).map((group) => (
              <div key={group.category} className="mb-2.5">
                <div className="mb-1 px-1 font-mono text-[8px] uppercase tracking-widest text-white/30">{t(group.category)}</div>
                {group.defs.filter((def) => def.type.startsWith('part.') && `${def.title} ${def.description} ${def.type}`.toLowerCase().includes(search.trim().toLowerCase())).map((def) => (
                  <button key={def.type} type="button" onClick={() => addNode(def.type)} title={t(def.description)} className="mb-0.5 block w-full rounded px-1.5 py-1 text-left text-[10.5px] text-white/70 hover:bg-white/10 hover:text-white">
                    {t(def.title)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col p-2">
          <GraphCanvas
            graph={graph}
            selectedId={selectedId}
            diagnostics={compiled.diagnostics.length ? compiled.diagnostics : validation}
            onSelect={setSelectedId}
            onChange={storeGraph}
            onContextMenu={(nodeId) => setSelectedId(nodeId)}
            onConnect={handleConnect}
          />
        </div>

        <div className="flex w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#232326]">
          <div className="min-h-0 flex-1 overflow-hidden">
            <NodeInspector
              node={selected}
              onChange={(key, value) => storeGraph(setParam(graph, selected!.id, key, value))}
              onReset={(key) => {
                if (!selected) return;
                storeGraph({
                  ...graph,
                  nodes: graph.nodes.map((node) => {
                    if (node.id !== selected.id) return node;
                    const { [key]: _removed, ...rest } = node.params;
                    return { ...node, params: rest };
                  }),
                });
              }}
              onDelete={() => { if (!selected) return; storeGraph(removeNode(graph, selected.id)); setSelectedId(null); }}
              onClose={() => setSelectedId(null)}
            />
          </div>

          <div className="shrink-0 border-t border-white/10 p-2">
            <div className="mb-1 flex items-center justify-between font-mono text-[8px] uppercase tracking-widest text-white/30">
              <span>{t('Preview')}</span>
              <span>{plant ? `${plant.items.length} ${t('components')}` : '—'}</span>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded border border-white/10">
              {plant ? <FloorPlanView items={plant.items} showLegend /> : <div className="flex h-full items-center justify-center px-2 text-center text-[9.5px] text-white/30">{t('Connect the graph to see a preview.')}</div>}
            </div>
            {plant && <p className="mt-1 truncate font-mono text-[8.5px] text-white/40" title={t(plant.summary)}>{t(plant.summary)}</p>}

            {intent && intent.tags.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 font-mono text-[8px] uppercase tracking-widest text-white/30">{t('Tags found')}</div>
                <div className="flex flex-wrap gap-1">
                  {intent.tags.slice(0, 10).map((tag) => (
                    <span key={`${tag.id}-${tag.span[0]}`} title={tag.term} className={cn('rounded px-1.5 py-[1px] text-[8.5px]', tag.negated ? 'bg-red-400/15 text-red-200/80 line-through' : 'bg-white/10 text-white/60')}>
                      {t(tag.label)}
                    </span>
                  ))}
                </div>
                {intent.notes.length > 0 && <p className="mt-1 text-[8.5px] leading-snug text-amber-300/70">{t(intent.notes[0])}</p>}
                {describeIntent(intent).length > 0 && <p className="mt-1 font-mono text-[8px] leading-snug text-white/30">{describeIntent(intent).join(' · ')}</p>}
              </div>
            )}

            {compiled.diagnostics.slice(0, 3).map((entry) => (
              <p key={entry.id} className={cn('mt-1 text-[9px] leading-snug', entry.severity === 'error' ? 'text-red-300' : entry.severity === 'warning' ? 'text-amber-300/80' : 'text-white/30')}>
                {t(entry.message)}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#242427] px-4 py-2.5">
        <span className="text-[10px] text-white/35">{t('Each node is a physical factory part. Connect material ports to define its production line.')}</span>
        <button
          type="button"
          disabled={!plant || errors.length > 0}
          onClick={build}
          className="flex items-center gap-2 rounded bg-[#287fbc] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#379cdd] disabled:opacity-40"
        >
          <Factory size={13} /> {t('Build factory')}
        </button>
      </div>

      {toast && <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded border border-white/15 bg-[#2b2b2d] px-3 py-1.5 text-[11px] text-white/85 shadow-xl">{toast}</div>}
    </div>
  );
}
