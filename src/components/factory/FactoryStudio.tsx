import { nodeColor } from '../../gen/graph/nodeColors';
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Factory, Plus, RotateCcw, Upload, Wand2 } from "lucide-react";
import { GraphCanvas, type GraphSelection } from "./GraphCanvas";
import { NodeInspector } from "./NodeInspector";
import { nodesByCategory, getNodeDef } from "../../gen/graph/registry";
import { connect, makeNode, removeNode, setParam, validateGraph } from "../../gen/graph/graph";
import { compileGraph } from "../../gen/graph/compile";
import { ensurePickupSensor } from "../../gen/graph/pickupSensors";
import { setChannel } from "../../gen/graph/signal";
import { arrangeGraphNodes, groupNodes } from "../../gen/graph/layout";
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
  productItems = [],
}: {
  onBuild: (items: SceneItem[], options: GenOptions) => void;
  onClose: () => void;
  productItems?: readonly SceneItem[];
}) {
  const graph = useFactoryGraph();
  const [selection, setSelection] = useState<GraphSelection>({nodeIds:[],groupId:null});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const selected = selection.nodeIds.length === 1 && !selection.groupId ? graph.nodes.find(node => node.id === selection.nodeIds[0]) ?? null : null;
  const selectedGroup = graph.groups?.find(group => group.id === selection.groupId) ?? null;
  // Undo/import/deleting a member must not leave a dangling selection.
  useEffect(() => {
    setSelection(current => {
      const present = new Set(graph.nodes.map(node => node.id));
      const ids = current.nodeIds.filter(id => present.has(id));
      const groupId = current.groupId && graph.groups?.some(group => group.id === current.groupId) ? current.groupId : null;
      return ids.length === current.nodeIds.length && groupId === current.groupId ? current : {nodeIds:ids,groupId};
    });
  },[graph.nodes,graph.groups]);

  // Editor coordinates and collapsed state have no effect on compilation. Keep
  // preview IDs/results stable when a node is moved, and avoid rebuilding the
  // entire factory just to persist a new canvas position.
  const structure = JSON.stringify({
    nodes: graph.nodes.map(({ id, type, params, io }) => ({ id, type, params, io })),
    links: graph.links,
  });
  const validation = useMemo(() => validateGraph(graph), [structure]);
  const compiled = useMemo(() => compileGraph(graph), [structure]);
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
    const next = from.port === 'out' && to.port === 'in' ? ensurePickupSensor(result.graph,from.node,to.node) : result.graph;
    storeGraph(next);
  }, [graph]);

  const addNode = (type: string) => {
    const def = getNodeDef(type);
    if (!def) return;
    const maxX = graph.nodes.length ? Math.max(...graph.nodes.map((node) => node.x)) : 0;
    const node = makeNode(type, maxX + 260, 40 + (graph.nodes.length % 6) * 90);
    storeGraph({ ...graph, nodes: [...graph.nodes, node] });
    setSelection({nodeIds:[node.id],groupId:null});
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
  useEffect(() => {
    if (errors.length && errors[0].nodeId) setSelection(current => current.nodeIds.length ? current : {nodeIds:[errors[0].nodeId!],groupId:null});
  }, [errors.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="factory-studio-toolbar flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#242427] px-3 py-2">
        <span className="flex items-center gap-1.5 rounded bg-[var(--app-accent)]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-accent-bright)]">
          <Wand2 size={11} /> {t('Factory parts')}
        </span>
        <div className="factory-studio-status flex items-center gap-1.5 text-[10px] text-white/40">
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

      <div className="factory-studio-workspace relative flex min-h-0 flex-1">
        {paletteOpen && (
          <div className="factory-studio-palette thin-scroll w-[186px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#232326] p-2">
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search parts…')} aria-label={t('Search parts')} className="mb-2 w-full rounded border border-white/15 bg-[#19191b] px-2 py-1 text-xs text-white" />
            {nodesByCategory().filter((group) => group.defs.some((def) => def.type.startsWith('part.') && `${def.title} ${def.description} ${def.type}`.toLowerCase().includes(search.trim().toLowerCase()))).map((group) => (
              <div key={group.category} className="mb-2.5">
                <div className="mb-1 px-1 font-mono text-[8px] uppercase tracking-widest text-white/30">{t(group.category)}</div>
                {group.defs.filter((def) => def.type.startsWith('part.') && `${def.title} ${def.description} ${def.type}`.toLowerCase().includes(search.trim().toLowerCase())).map((def) => (
                  <button key={def.type} type="button" onClick={() => addNode(def.type)} title={t(def.description)} style={{color:nodeColor(def),backgroundColor:`${nodeColor(def)}18`,borderLeft:`3px solid ${nodeColor(def)}`}} className="mb-0.5 block w-full rounded px-1.5 py-1 text-left text-[10.5px] hover:brightness-125">
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
            selection={selection}
            diagnostics={compiled.diagnostics.length ? compiled.diagnostics : validation}
            onSelectionChange={setSelection}
            onChange={storeGraph}
            onConnect={handleConnect}
          />
        </div>

        <div className="factory-studio-inspector flex w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#232326]">
          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedGroup ? (
              <div className="space-y-3 p-3 text-[11px] text-white/75" data-group-inspector>
                <div className="text-xs font-semibold text-white">{t('Group')}</div>
                <label className="block space-y-1"><span>{t('Group name')}</span><input aria-label={t('Group name')} maxLength={80} value={selectedGroup.name} onChange={event => storeGraph({...graph,groups:graph.groups?.map(group => group.id === selectedGroup.id ? {...group,name:event.target.value} : group)})} onBlur={() => { if (!selectedGroup.name.trim()) storeGraph({...graph,groups:graph.groups?.map(group => group.id === selectedGroup.id ? {...group,name:t('Group')} : group)}); }} className="w-full rounded border border-white/15 bg-[#19191b] px-2 py-1.5 text-white" /></label>
                <label className="flex items-center justify-between gap-3"><span>{t('Group color')}</span><input aria-label={t('Group color')} type="color" value={selectedGroup.color} onChange={event => storeGraph({...graph,groups:graph.groups?.map(group => group.id === selectedGroup.id ? {...group,color:event.target.value} : group)})} className="h-8 w-12 cursor-pointer rounded border border-white/15 bg-transparent" /></label>
                <p className="text-white/45">{selectedGroup.nodeIds.length} {t('nodes')} · {t('Drag the frame to move its members. Copy and paste to duplicate the group.')}</p>
                <button type="button" onClick={() => { storeGraph({...graph,groups:graph.groups?.filter(group => group.id !== selectedGroup.id)}); setSelection({nodeIds:selectedGroup.nodeIds,groupId:null}); }} className="rounded border border-white/15 px-2 py-1.5 hover:bg-white/10">{t('Ungroup')}</button>
              </div>
            ) : selection.nodeIds.length > 1 ? (
              <div className="space-y-3 p-3 text-[11px] text-white/70" data-multi-selection>
                <div className="text-xs font-semibold text-white">{selection.nodeIds.length} {t('nodes selected')}</div>
                <p className="leading-relaxed text-white/45">{t('Drag a selected node to move the selection. Right-click for more actions.')}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => storeGraph(arrangeGraphNodes(graph,selection.nodeIds))} className="rounded border border-white/15 px-2 py-1.5 hover:bg-white/10">{t('Rearrange nodes')}</button>
                  <button type="button" onClick={() => { const result=groupNodes(graph,selection.nodeIds,`${t('Group')} ${(graph.groups?.length ?? 0)+1}`); if (result.group) { storeGraph(result.graph); setSelection({nodeIds:result.group.nodeIds,groupId:result.group.id}); } }} className="rounded border border-white/15 px-2 py-1.5 hover:bg-white/10">{t('Group selected nodes')}</button>
                </div>
              </div>
            ) : <NodeInspector
              node={selected}
              graph={graph}
              items={productItems}
              onChannelChange={(port,patch) => { if (selected) storeGraph(setChannel(graph,selected.id,port,patch)); }}
              onChange={(key, value) => { if (selected) { const next=setParam(graph, selected.id, key, value); storeGraph(key === 'range' && selected.type === 'part.laser' ? setParam(next,selected.id,'autoRange',false) : next); } }}
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
              onDelete={() => { if (!selected) return; storeGraph(removeNode(graph, selected.id)); setSelection({nodeIds:[],groupId:null}); }}
              onClose={() => setSelection({nodeIds:[],groupId:null})}
            />}
          </div>

          <div className="factory-studio-preview shrink-0 border-t border-white/10 p-2">
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

      <div className="factory-studio-footer flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#242427] px-4 py-2.5 pr-7">
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
