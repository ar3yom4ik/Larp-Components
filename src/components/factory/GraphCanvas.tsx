import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { getNodeDef, PORT_COLORS } from '../../gen/graph/registry';
import { setParam, updateNode } from '../../gen/graph/graph';
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
  const drag = useRef<DragState | null>(null);
  const [pan, setPan] = useState({ x: 24, y: 12 });
  const [zoom, setZoom] = useState(0.85);
  const [wire, setWire] = useState<{ from: { node: string; port: string }; x: number; y: number } | null>(null);
  const [hoverPort, setHoverPort] = useState<string | null>(null);

  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
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
      onChange(updateNode(graph, state.id!, { x: Math.round(state.originX + dx), y: Math.round(state.originY + dy) }));
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

  const endDrag = () => {
    const state = drag.current;
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
      if ((event.target as HTMLElement)?.tagName === 'INPUT' || (event.target as HTMLElement)?.tagName === 'SELECT') return;
      if (event.key === 'Delete' && selectedId) {
        event.preventDefault();
        onChange({ ...graph, nodes: graph.nodes.filter((node) => node.id !== selectedId), links: graph.links.filter((link) => link.from.node !== selectedId && link.to.node !== selectedId) });
        onSelect(null);
      }
      if (event.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [graph, onChange, onSelect, selectedId]);

  const bounds = useMemo(() => {
    if (!graph.nodes.length) return { width: 1400, height: 800 };
    return {
      width: Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 400,
      height: Math.max(...graph.nodes.map((node) => node.y + nodeHeight(node))) + 300,
    };
  }, [graph.nodes]);

  return (
    <div
      className="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1f]"
      ref={host}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
        <svg width={bounds.width} height={bounds.height} className="pointer-events-none absolute left-0 top-0">
          {graph.links.map((link) => {
            const fromNode = byId.get(link.from.node), toNode = byId.get(link.to.node);
            if (!fromNode || !toNode) return null;
            const type = getNodeDef(fromNode.type)?.outputs.find((port) => port.key === link.from.port)?.type ?? 'config';
            return (
              <path
                key={link.id}
                d={wirePath(fromNode, link.from.port, toNode, link.to.port)}
                fill="none"
                stroke={PORT_COLORS[type] ?? '#94a3b8'}
                strokeWidth={2}
                strokeOpacity={0.75}
                className="pointer-events-auto cursor-pointer"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onChange({ ...graph, links: graph.links.filter((entry) => entry.id !== link.id) });
                }}
              >
                <title>{t('Click to remove this wire')}</title>
              </path>
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

        {graph.nodes.map((node) => {
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
                          aria-label={`${def.title} ${port.label}`}
                          onPointerDown={(event) => event.stopPropagation()}
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
                        <span className="truncate text-[9.5px] leading-none text-white/45">{t(port.label)}</span>
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
