import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { getNodeDef, PORT_COLORS } from '../../gen/graph/registry';
import { connect, insertNodeInLink, makeNode, setParam, updateNode } from '../../gen/graph/graph';
import type { Diagnostic, GraphNode, NodeGraph } from '../../gen/graph/types';
import { cn } from '../../utils/cn';
import { t } from '../../i18n';

export const NODE_WIDTH = 208;
const HEADER = 26;
const ROW = 18;
const PAD = 8;

/** Height of a node body, used for both drawing and hit-testing. */
export function nodeHeight(node: GraphNode) {
  const def = getNodeDef(node.type);
  if (!def || node.collapsed) return HEADER;
  return HEADER + PAD + Math.max(def.inputs.length, def.outputs.length) * ROW + PAD;
}

function portY(index: number) {
  return HEADER + PAD + index * ROW + ROW / 2;
}

interface Props {
  graph: NodeGraph;
  selectedId: string | null;
  diagnostics: Diagnostic[];
  onSelect: (id: string | null) => void;
  onChange: (graph: NodeGraph) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  /** Called when an output port is released over an input port. Validation lives outside. */
  onConnect: (from: { node: string; port: string }, to: { node: string; port: string }) => void;
}

interface DragState {
  kind: 'node' | 'pan' | 'wire';
  id?: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  from?: { node: string; port: string };
  detachLinkId?: string;
  x?: number;
  y?: number;
}

/**
 * The node canvas.
 *
 * Deliberately plain DOM + SVG rather than a graph library: the graph is small (tens of
 * nodes), and the editor needs to stay dependency-free for the single-file build. Nodes
 * are absolutely positioned in a transformed "world" layer; wires are cubic Béziers in
 * an SVG layer behind them.
 */
export function GraphCanvas({ graph, selectedId, diagnostics, onSelect, onChange, onContextMenu, onConnect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const clipboard = useRef<GraphNode | null>(null);
  const drag = useRef<DragState | null>(null);
  const [pan, setPan] = useState({ x: 24, y: 12 });
  const [zoom, setZoom] = useState(0.85);
  const [wire, setWire] = useState<{ from: { node: string; port: string }; x: number; y: number } | null>(null);
  const [hoverPort, setHoverPort] = useState<string | null>(null);
  // A drag is an ephemeral canvas preview, not hundreds of persisted edits.
  // Only its final position is committed to graph history/storage.
  const [nodePreview, setNodePreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);
  const displayGraph = useMemo(() => nodePreview ? updateNode(graph, nodePreview.id, nodePreview) : graph, [graph, nodePreview]);
  const byId = useMemo(() => new Map(displayGraph.nodes.map((node) => [node.id, node])), [displayGraph.nodes]);
  const incomingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of graph.links) {
      const key = `${link.to.node}:${link.to.port}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [graph.links]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const nodeDiagnostics = useMemo(() => {
    const map = new Map<string, Diagnostic[]>();
    for (const entry of diagnostics) {
      if (!entry.nodeId) continue;
      map.set(entry.nodeId, [...(map.get(entry.nodeId) ?? []), entry]);
    }
    return map;
  }, [diagnostics]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const startNodeDrag = (event: React.PointerEvent, node: GraphNode) => {
    if ((event.target as HTMLElement).closest('[data-no-drag]')) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    drag.current = { kind: 'node', id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y };
    onSelect(node.id);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (state?.kind === 'node' && state.pointerId === event.pointerId) {
      const dx = (event.clientX - state.startX) / zoom;
      const dy = (event.clientY - state.startY) / zoom;
      state.x = Math.round(state.originX + dx);
      state.y = Math.round(state.originY + dy);
      if (frame.current === null) frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const current = drag.current;
        if (current?.kind === 'node' && current.id && current.x !== undefined && current.y !== undefined) {
          setNodePreview({ id: current.id, x: current.x, y: current.y });
        }
      });
      return;
    }
    if (state?.kind === 'pan' && state.pointerId === event.pointerId) {
      setPan({ x: state.originX + event.clientX - state.startX, y: state.originY + event.clientY - state.startY });
      return;
    }
    if (state?.kind === 'wire') {
      const point = toWorld(event.clientX, event.clientY);
      setWire({ from: state.from!, x: point.x, y: point.y });
    }
  };

  const endDrag = (event: React.PointerEvent) => {
    const state = drag.current;
    if (state?.kind === 'node' && state.id && state.pointerId === event.pointerId) {
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
      const x = Math.round(state.originX + (event.clientX - state.startX) / zoom);
      const y = Math.round(state.originY + (event.clientY - state.startY) / zoom);
      let next = updateNode(graph, state.id, { x, y });
      // Insert only loose nodes, and only when their box actually covers a wire.
      const element = host.current?.querySelector(`[data-node="${CSS.escape(state.id)}"]`);
      const rect = element?.getBoundingClientRect();
      const loose = !graph.links.some((link) => link.from.node === state.id || link.to.node === state.id);
      if (rect && loose && Math.hypot(event.clientX-state.startX, event.clientY-state.startY) > 5) {
        // The last RAF may not have painted yet when a fast drag ends. Shift
        // the last rendered rectangle to the actual final pointer position.
        const previewX = nodePreview?.id === state.id ? nodePreview.x : state.originX;
        const previewY = nodePreview?.id === state.id ? nodePreview.y : state.originY;
        const dx = (x - previewX) * zoom, dy = (y - previewY) * zoom;
        for (const path of host.current?.querySelectorAll<SVGPathElement>('path[data-link-id]') ?? []) {
          const matrix = path.getScreenCTM();
          if (!matrix) continue;
          const length = path.getTotalLength();
          let intersects = false;
          for (let d = 0; d <= length; d += Math.max(4, length / 100)) {
            const point = path.getPointAtLength(d).matrixTransform(matrix);
            if (point.x > rect.left + dx && point.x < rect.right + dx && point.y > rect.top + dy && point.y < rect.bottom + dy) { intersects = true; break; }
          }
          if (intersects && path.dataset.linkId) {
            const result = insertNodeInLink(next, state.id, path.dataset.linkId);
            if (result.ok) { next = result.graph; break; }
          }
        }
      }
      setNodePreview(null);
      if (x !== state.originX || y !== state.originY || next.links !== graph.links) onChange(next);
    }
    if (state?.kind === 'wire' && state.from) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-input-node]') as HTMLElement | null;
      if (state.detachLinkId && Math.hypot(event.clientX-state.startX, event.clientY-state.startY)>6) {
        const without = {...graph, links: graph.links.filter(link => link.id !== state.detachLinkId)};
        if (target?.dataset.inputNode && target.dataset.inputPort && target.dataset.inputNode !== state.from.node) {
          const result = connect(without, state.from, {node:target.dataset.inputNode,port:target.dataset.inputPort});
          if (result.ok) onChange(result.graph);
        } else onChange(without);
      } else if (!state.detachLinkId && target?.dataset.inputNode && target.dataset.inputPort && target.dataset.inputNode !== state.from.node) {
        onConnect(state.from, { node: target.dataset.inputNode, port: target.dataset.inputPort });
      }
    }
    drag.current = null;
    setWire(null);
    if (state?.kind === 'wire') setHoverPort(null);
  };

  /** Wires are drawn from the node's header-relative port positions. */
  const wirePath = (fromNode: GraphNode, fromPort: string, toNode: GraphNode, toPort: string) => {
    const fromDef = getNodeDef(fromNode.type);
    const toDef = getNodeDef(toNode.type);
    const fromIndex = fromDef?.outputs.findIndex((port) => port.key === fromPort) ?? 0;
    const toIndex = toDef?.inputs.findIndex((port) => port.key === toPort) ?? 0;
    const x1 = fromNode.x + NODE_WIDTH, y1 = fromNode.y + portY(Math.max(0, fromIndex));
    const x2 = toNode.x, y2 = toNode.y + portY(Math.max(0, toIndex));
    const bend = Math.max(36, Math.abs(x2 - x1) * 0.45);
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  };

  // Wheel zoom around the cursor keeps the node under the pointer in place.
  const onWheel = (event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) < 6) return;
    event.preventDefault();
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.max(0.35, Math.min(1.6, zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    const mx = event.clientX - rect.left, my = event.clientY - rect.top;
    setPan({ x: mx - ((mx - pan.x) / zoom) * next, y: my - ((my - pan.y) / zoom) * next });
    setZoom(next);
  };

  const beginWire = (event: React.PointerEvent, node: GraphNode, port: string) => {
    event.stopPropagation();
    event.preventDefault();
    (host.current as HTMLElement)?.setPointerCapture?.(event.pointerId);
    const point = toWorld(event.clientX, event.clientY);
    drag.current = { kind: 'wire', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: 0, originY: 0, from: { node: node.id, port } };
    setWire({ from: { node: node.id, port }, x: point.x, y: point.y });
  };

  const beginInputDrag = (event: React.PointerEvent, node: GraphNode, port: string) => {
    event.stopPropagation();
    const links = graph.links.filter(entry => entry.to.node === node.id && entry.to.port === port);
    // A multi-input port has no unique branch to pull. Its individual wires
    // remain independently removable by clicking the corresponding path.
    if (links.length !== 1) return;
    const link = links[0];
    event.preventDefault();
    host.current?.setPointerCapture?.(event.pointerId);
    drag.current = {kind:'wire', pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:0,originY:0,from:link.from,detachLinkId:link.id};
    const point = toWorld(event.clientX,event.clientY);
    setWire({from:link.from,...point});
  };

  const finishWire = (event: React.PointerEvent, node: GraphNode, port: string) => {
    const state = drag.current;
    if (state?.kind !== 'wire' || !state.from) return;
    event.stopPropagation();
    drag.current = null;
    setWire(null);
    if (state.from.node === node.id) return;
    onConnect(state.from, { node: node.id, port });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable=true]')) return;
      const key = event.key.toLowerCase();
      const selected = graph.nodes.find(node => node.id === selectedId);
      if ((event.ctrlKey || event.metaKey) && (key === 'c' || key === 'x') && selected) {
        event.preventDefault(); event.stopPropagation();
        clipboard.current = structuredClone(selected);
        if (key === 'x') { onChange({...graph,nodes:graph.nodes.filter(node=>node.id!==selected.id),links:graph.links.filter(link=>link.from.node!==selected.id && link.to.node!==selected.id)}); onSelect(null); }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'v' && clipboard.current) {
        event.preventDefault(); event.stopPropagation();
        const old=clipboard.current; const node=makeNode(old.type,old.x+35,old.y+35,structuredClone(old.params),old.title);
        clipboard.current=node; onChange({...graph,nodes:[...graph.nodes,node]}); onSelect(node.id); return;
      }
      if (event.key === 'Delete' && selectedId) {
        event.preventDefault();
        onChange({ ...graph, nodes: graph.nodes.filter((node) => node.id !== selectedId), links: graph.links.filter((link) => link.from.node !== selectedId && link.to.node !== selectedId) });
        onSelect(null);
      }
      if (event.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [graph, onChange, onSelect, selectedId]);

  const bounds = useMemo(() => {
    const xs = displayGraph.nodes.map(node => node.x); const ys = displayGraph.nodes.map(node => node.y);
    if (wire) { xs.push(wire.x); ys.push(wire.y); }
    const left = Math.min(0, ...xs) - 400, top = Math.min(0, ...ys) - 400;
    const right = Math.max(1400, ...xs.map(x=>x+NODE_WIDTH)) + 400;
    const bottom = Math.max(800, ...ys.map(y=>y+400)) + 400;
    return { left, top, width:right-left, height:bottom-top };
  }, [displayGraph.nodes, wire]);

  return (
    <div
      className="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1f]"
      ref={host}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={() => { drag.current = null; setWire(null); setNodePreview(null); if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; } }}
      onWheel={onWheel}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        onSelect(null);
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        drag.current = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
      }}
      onDoubleClick={(event) => { if (event.target === event.currentTarget) { setPan({ x: 24, y: 12 }); setZoom(0.85); } }}
      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)', backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
      data-graph-canvas
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg width={bounds.width} height={bounds.height} viewBox={`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`} style={{left:bounds.left,top:bounds.top}} className="pointer-events-none absolute overflow-visible">
          {graph.links.map((link) => {
            const fromNode = byId.get(link.from.node), toNode = byId.get(link.to.node);
            if (!fromNode || !toNode) return null;
            const type = getNodeDef(fromNode.type)?.outputs.find((port) => port.key === link.from.port)?.type ?? 'config';
            return (
              <g key={link.id}>
                <path
                  data-link-id={link.id}
                  d={wirePath(fromNode, link.from.port, toNode, link.to.port)}
                  fill="none" stroke="transparent" strokeWidth={14}
                  className="pointer-events-auto cursor-pointer"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onChange({ ...graph, links: graph.links.filter((entry) => entry.id !== link.id) });
                  }}
                >
                  <title>{t('Click to remove this wire')}</title>
                </path>
                <path d={wirePath(fromNode, link.from.port, toNode, link.to.port)} fill="none"
                  stroke={PORT_COLORS[type] ?? '#94a3b8'} strokeWidth={2} strokeOpacity={0.75} />
              </g>
            );
          })}
          {wire && (() => {
            const fromNode = byId.get(wire.from.node);
            const def = fromNode ? getNodeDef(fromNode.type) : undefined;
            const index = Math.max(0, def?.outputs.findIndex((port) => port.key === wire.from.port) ?? 0);
            const x1 = (fromNode?.x ?? 0) + NODE_WIDTH, y1 = (fromNode?.y ?? 0) + portY(index);
            const bend = Math.max(36, Math.abs(wire.x - x1) * 0.45);
            return <path d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${wire.x - bend} ${wire.y}, ${wire.x} ${wire.y}`} fill="none" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 4" />;
          })()}
        </svg>

        {displayGraph.nodes.map((node) => {
          const def = getNodeDef(node.type);
          if (!def) return null;
          const issues = nodeDiagnostics.get(node.id) ?? [];
          const error = issues.some((entry) => entry.severity === 'error');
          const warning = !error && issues.some((entry) => entry.severity === 'warning');
          const selected = node.id === selectedId;
          const collapsed = node.collapsed === true;
          return (
            <div
              key={node.id}
              data-node={node.id}
              className={cn(
                'absolute select-none rounded-md border bg-[#2a2a2e] shadow-lg transition-colors',
                selected ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/40' : error ? 'border-red-400/60' : warning ? 'border-amber-400/50' : 'border-white/15',
              )}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
              onPointerDown={(event) => startNodeDrag(event, node)}
              onContextMenu={(event) => { event.preventDefault(); onContextMenu(node.id, event.clientX, event.clientY); }}
              onDoubleClick={() => onChange(updateNode(graph, node.id, { collapsed: !collapsed }))}
            >
              <div
                className="flex h-[26px] cursor-grab items-center gap-1 rounded-t-md px-2"
                style={{ background: `linear-gradient(90deg, ${PORT_COLORS[def.outputs[0]?.type ?? 'config']}22, transparent)` }}
              >
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-white/85">{t(node.title ?? def.title)}</span>
                {error ? <AlertTriangle size={10} className="text-red-400" /> : warning ? <AlertTriangle size={10} className="text-amber-400" /> : null}
                <button
                  type="button"
                  data-no-drag
                  aria-label={collapsed ? t('Expand') : t('Collapse')}
                  onClick={() => onChange(updateNode(graph, node.id, { collapsed: !collapsed }))}
                  className="rounded p-0.5 text-white/35 hover:bg-white/10 hover:text-white"
                >
                  {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
              </div>

              {!collapsed && (
                <div className="flex gap-2 px-2 py-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    {def.inputs.map((port, index) => (
                      <div key={port.key} className="relative flex h-[18px] items-center">
                        <button
                          type="button"
                          data-no-drag
                          data-input-node={node.id}
                          data-input-port={port.key}
                          aria-label={`${def.title} ${port.label}`}
                          onPointerDown={(event) => beginInputDrag(event, node, port.key)}
                          onPointerUp={(event) => finishWire(event, node, port.key)}
                          onPointerEnter={() => setHoverPort(`${node.id}:in:${port.key}`)}
                          onPointerLeave={() => setHoverPort(null)}
                          className="absolute -left-[13px] h-[9px] w-[9px] rounded-full border border-[#1c1c1f] transition"
                          style={{
                            background: PORT_COLORS[port.type] ?? '#94a3b8',
                            boxShadow: hoverPort === `${node.id}:in:${port.key}` ? '0 0 0 3px rgba(255,255,255,.25)' : undefined,
                          }}
                          title={port.help ? t(port.help) : `${port.label} (${port.type})`}
                        />
                        <span className="truncate text-[9.5px] leading-none text-white/45">{t(port.label)}{port.many && ` (${incomingCounts.get(`${node.id}:${port.key}`) ?? 0})`}</span>
                        {index === 0 && <span className="ml-1 font-mono text-[7px] uppercase text-white/20">{port.type}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-end">
                    {def.outputs.map((port, index) => (
                      <div key={port.key} className="relative flex h-[18px] items-center">
                        <span className="truncate text-[9.5px] leading-none text-white/60">{t(port.label)}</span>
                        <button
                          type="button"
                          data-no-drag
                          aria-label={`${def.title} ${port.label} output`}
                          onPointerDown={(event) => beginWire(event, node, port.key)}
                          onPointerEnter={() => setHoverPort(`${node.id}:out:${port.key}`)}
                          onPointerLeave={() => setHoverPort(null)}
                          className="absolute -right-[13px] h-[9px] w-[9px] cursor-crosshair rounded-full border border-[#1c1c1f]"
                          style={{ background: PORT_COLORS[port.type] ?? '#94a3b8', boxShadow: hoverPort === `${node.id}:out:${port.key}` ? '0 0 0 3px rgba(255,255,255,.25)' : undefined }}
                          title={`${t(port.label)} (${port.type}) — ${t('drag to an input port')}`}
                        />
                        {index === 0 && <span className="ml-1 font-mono text-[7px] uppercase text-white/20">{port.type}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!collapsed && node.type.startsWith('part.') && (
                <div data-no-drag className="space-y-1 border-t border-white/10 px-2 py-1.5" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                  {def.params.map((param) => (
                    <label key={param.key} className="flex items-center gap-1 text-[9px] text-white/55">
                      <span className="w-[72px] shrink-0 truncate" title={t(param.label)}>{t(param.label)}</span>
                      {param.kind === 'select' ? <select aria-label={t(param.label)} value={String(node.params[param.key] ?? param.default)} onChange={e => onChange(setParam(graph, node.id, param.key, e.target.value))} className="min-w-0 flex-1 rounded bg-[#19191b] px-1 text-white/85">{param.options?.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select> : param.kind === 'number' ? <><input aria-label={t(param.label)} type="range" min={param.min} max={param.max} step={param.step} value={Number(node.params[param.key] ?? param.default)} onChange={e => onChange(setParam(graph,node.id,param.key,Number(e.target.value)))} className="min-w-0 flex-1 accent-range"/><span className="w-7 text-right font-mono">{String(node.params[param.key] ?? param.default)}</span></> : null}
                    </label>
                  ))}
                </div>
              )}

              {!collapsed && def.summary && (
                <div data-no-drag className="border-t border-white/5 px-2 py-1">
                  <div className="truncate font-mono text-[8.5px] text-white/40">{def.summary(node.params)}</div>
                </div>
              )}

              {!collapsed && node.type === 'input.prompt' && (
                <textarea
                  data-no-drag
                  value={String(node.params.text ?? '')}
                  onChange={(event) => onChange(setParam(graph, node.id, 'text', event.target.value))}
                  onPointerDown={(event) => event.stopPropagation()}
                  rows={3}
                  placeholder="Describe the factory…"
                  className="mx-1.5 mb-1.5 w-[calc(100%-12px)] resize-none rounded border border-white/10 bg-[#1e1e20] px-1.5 py-1 text-[9.5px] leading-snug text-white/80 outline-none focus:border-[var(--app-accent)]/60"
                />
              )}

              {issues.length > 0 && (
                <div className="border-t border-white/5 px-2 py-1">
                  {issues.slice(0, 2).map((issue) => (
                    <div key={issue.id} className={cn('flex items-start gap-1 text-[8px] leading-snug', issue.severity === 'error' ? 'text-red-300' : issue.severity === 'warning' ? 'text-amber-300/90' : 'text-white/35')}>
                      {issue.severity === 'info' ? <Info size={8} className="mt-[1px] shrink-0" /> : <AlertTriangle size={8} className="mt-[1px] shrink-0" />}
                      <span className="min-w-0">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/50 px-2 py-1 font-mono text-[8.5px] text-white/40">
        <span>{Math.round(zoom * 100)}%</span>
        <span>· drag to pan · wheel to zoom · click a wire to cut it</span>
      </div>
    </div>
  );
}
