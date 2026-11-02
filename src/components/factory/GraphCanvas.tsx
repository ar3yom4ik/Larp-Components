import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Info, Maximize2 } from 'lucide-react';
import { getNodeDef, PORT_COLORS } from '../../gen/graph/registry';
import { connect, insertNodeInLink, setParam, updateNode } from '../../gen/graph/graph';
import { arrangeGraphNodes, copyGraphSelection, estimatedNodeHeight, groupNodes, NODE_HEADER, NODE_WIDTH, pasteGraphSelection, PORT_PAD, PORT_ROW, removeGraphNodes } from '../../gen/graph/layout';
import type { GraphClipboard } from '../../gen/graph/layout';
import type { Diagnostic, GraphGroup, GraphNode, NodeGraph, PortRef } from '../../gen/graph/types';
import { cn } from '../../utils/cn';
import { t } from '../../i18n';

export { NODE_WIDTH } from '../../gen/graph/layout';
export const nodeHeight = estimatedNodeHeight;
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 1.8;
const GROUP_FADE_START = 0.38;
const GROUP_FADE_END = 0.22;
const NODE_COLORS: Record<string,string> = {
  'part.feeder':'#dd9a4c', 'part.conveyor':'#4da5d0', 'part.robot':'#a880db',
  'part.machine':'#61b995', 'part.pallet':'#d8839b', 'part.human':'#d7bf63',
};
const portY = (index: number) => NODE_HEADER + PORT_PAD + index * PORT_ROW + PORT_ROW / 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export interface GraphSelection { nodeIds: string[]; groupId: string | null }
interface Props {
  graph: NodeGraph;
  selection: GraphSelection;
  diagnostics: Diagnostic[];
  onSelectionChange: (selection: GraphSelection) => void;
  onChange: (graph: NodeGraph) => void;
  /** Called for a single output-to-input gesture; validation lives outside. */
  onConnect: (from: PortRef, to: PortRef) => void;
}
interface Origin { id:string; x:number; y:number }
interface DragState {
  kind: 'nodes' | 'pan' | 'box' | 'wire';
  pointerId: number;
  startX: number;
  startY: number;
  originX?: number;
  originY?: number;
  origins?: Origin[];
  from?: PortRef;
  detachLinkId?: string;
  additive?: boolean;
  baseSelection?: string[];
  insertOnWire?: boolean;
  x?: number;
  y?: number;
}
interface Rect { x:number; y:number; width:number; height:number }
interface Menu { x:number; y:number; nodeIds:string[]; groupId:string | null }

/** DOM nodes and SVG wires share a world transform. All movement previews are
 * ephemeral; one release produces one undoable graph edit. */
export function GraphCanvas({ graph, selection, diagnostics, onSelectionChange, onChange, onConnect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const clipboard = useRef<GraphClipboard | null>(null);
  const pasteCount = useRef(0);
  const drag = useRef<DragState | null>(null);
  const spaceDown = useRef(false);
  const frame = useRef<number | null>(null);
  const [pan, setPan] = useState({ x:24, y:12 });
  const [zoom, setZoom] = useState(0.85);
  const [wire, setWire] = useState<{from:PortRef;x:number;y:number} | null>(null);
  const [hoverPort, setHoverPort] = useState<string | null>(null);
  const [nodePreview, setNodePreview] = useState<{ids:string[];dx:number;dy:number} | null>(null);
  const [box, setBox] = useState<Rect | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [heights, setHeights] = useState<Map<string,number>>(new Map());

  const displayGraph = useMemo(() => {
    if (!nodePreview) return graph;
    const ids = new Set(nodePreview.ids);
    return {...graph,nodes:graph.nodes.map(node => ids.has(node.id) ? {...node,x:node.x+nodePreview.dx,y:node.y+nodePreview.dy} : node)};
  },[graph,nodePreview]);
  const byId = useMemo(() => new Map(displayGraph.nodes.map(node => [node.id,node])),[displayGraph.nodes]);
  const selected = useMemo(() => new Set(selection.nodeIds),[selection.nodeIds]);
  const incomingCounts = useMemo(() => {
    const counts = new Map<string,number>();
    for (const link of graph.links) {
      const key = `${link.to.node}:${link.to.port}`;
      counts.set(key,(counts.get(key) ?? 0)+1);
    }
    return counts;
  },[graph.links]);
  const nodeDiagnostics = useMemo(() => {
    const map = new Map<string,Diagnostic[]>();
    for (const entry of diagnostics) if (entry.nodeId) map.set(entry.nodeId,[...(map.get(entry.nodeId) ?? []),entry]);
    return map;
  },[diagnostics]);

  // DOM heights include parameters and wrapped diagnostics. Frame bounds and
  // rearrangement therefore never crop tall or collapsed nodes.
  useLayoutEffect(() => {
    const next = new Map<string,number>();
    host.current?.querySelectorAll<HTMLElement>('[data-node]').forEach(element => {
      if (element.dataset.node) next.set(element.dataset.node,element.offsetHeight);
    });
    setHeights(previous => {
      if (previous.size === next.size && [...next].every(([id,height]) => previous.get(id) === height)) return previous;
      return next;
    });
  },[graph.nodes,diagnostics]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); },[]);

  const groups = useMemo(() => {
    const rects = new Map<string,Rect>();
    const owners = new Map<string,GraphGroup>();
    for (const group of displayGraph.groups ?? []) {
      const nodes = group.nodeIds.map(id => byId.get(id)).filter((node): node is GraphNode => !!node);
      if (!nodes.length) continue;
      for (const node of nodes) owners.set(node.id,group);
      const left = Math.min(...nodes.map(node => node.x))-28;
      const top = Math.min(...nodes.map(node => node.y))-46;
      const right = Math.max(...nodes.map(node => node.x+NODE_WIDTH))+28;
      const bottom = Math.max(...nodes.map(node => node.y+(heights.get(node.id) ?? estimatedNodeHeight(node))))+28;
      rects.set(group.id,{x:left,y:top,width:right-left,height:bottom-top});
    }
    return {rects,owners};
  },[displayGraph.groups,byId,heights]);
  const groupFade = clamp((zoom-GROUP_FADE_END)/(GROUP_FADE_START-GROUP_FADE_END),0,1);
  const overview = groupFade < 0.5;

  const toWorld = useCallback((clientX:number,clientY:number) => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return {x:0,y:0};
    return {x:(clientX-rect.left-pan.x)/zoom,y:(clientY-rect.top-pan.y)/zoom};
  },[pan,zoom]);

  const capture = (event: React.PointerEvent) => {
    host.current?.focus({preventScroll:true});
    host.current?.setPointerCapture?.(event.pointerId);
  };
  const startNodeDrag = (event: React.PointerEvent, node: GraphNode) => {
    if (event.button !== 0 || spaceDown.current || (event.target as HTMLElement).closest('[data-no-drag]')) return;
    event.preventDefault(); event.stopPropagation();
    let ids: string[];
    if (event.shiftKey) {
      if (selected.has(node.id)) {
        ids = selection.nodeIds.filter(id => id !== node.id);
        onSelectionChange({nodeIds:ids,groupId:null});
        return;
      }
      ids = [...selection.nodeIds,node.id];
    } else if (selected.has(node.id) && !selection.groupId) ids = selection.nodeIds;
    else ids = [node.id];
    onSelectionChange({nodeIds:ids,groupId:null});
    setMenu(null); capture(event);
    const wanted = new Set(ids);
    drag.current = {kind:'nodes',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,insertOnWire:true,origins:graph.nodes.filter(entry => wanted.has(entry.id)).map(({id,x,y}) => ({id,x,y}))};
  };
  const startGroupDrag = (event: React.PointerEvent, group: GraphGroup) => {
    if (event.button !== 0 || spaceDown.current || (event.target as HTMLElement).closest('[data-no-drag]')) return;
    event.preventDefault(); event.stopPropagation();
    const ids = group.nodeIds.filter(id => byId.has(id));
    onSelectionChange({nodeIds:ids,groupId:group.id});
    setMenu(null); capture(event);
    const wanted = new Set(ids);
    drag.current = {kind:'nodes',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,origins:graph.nodes.filter(node => wanted.has(node.id)).map(({id,x,y}) => ({id,x,y}))};
  };
  const startBackground = (event: React.PointerEvent) => {
    const isPan = event.button === 1 || (event.button === 0 && spaceDown.current) || event.pointerType === 'touch';
    if (!isPan && (event.button !== 0 || event.target !== event.currentTarget)) return;
    if (isPan && event.button !== 1 && event.pointerType !== 'touch' && !spaceDown.current) return;
    event.preventDefault(); setMenu(null); capture(event);
    if (isPan) {
      drag.current = {kind:'pan',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:pan.x,originY:pan.y};
    } else {
      drag.current = {kind:'box',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,additive:event.shiftKey,baseSelection:selection.nodeIds};
      if (!event.shiftKey) onSelectionChange({nodeIds:[],groupId:null});
      const rect = host.current!.getBoundingClientRect();
      setBox({x:event.clientX-rect.left,y:event.clientY-rect.top,width:0,height:0});
    }
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.kind === 'nodes' && state.origins) {
      state.x = Math.round((event.clientX-state.startX)/zoom);
      state.y = Math.round((event.clientY-state.startY)/zoom);
      if (frame.current === null) frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const current = drag.current;
        if (current?.kind === 'nodes' && current.origins) setNodePreview({ids:current.origins.map(origin => origin.id),dx:current.x ?? 0,dy:current.y ?? 0});
      });
    } else if (state.kind === 'pan') {
      setPan({x:(state.originX ?? 0)+event.clientX-state.startX,y:(state.originY ?? 0)+event.clientY-state.startY});
    } else if (state.kind === 'box') {
      const rect = host.current!.getBoundingClientRect();
      setBox({x:Math.min(state.startX,event.clientX)-rect.left,y:Math.min(state.startY,event.clientY)-rect.top,width:Math.abs(event.clientX-state.startX),height:Math.abs(event.clientY-state.startY)});
    } else if (state.kind === 'wire' && state.from) {
      setWire({from:state.from,...toWorld(event.clientX,event.clientY)});
    }
  };

  const completeConnection = (from:PortRef,to:PortRef) => {
    const target = byId.get(to.node);
    const targetPort = target && getNodeDef(target.type)?.inputs.find(port => port.key === to.port);
    const source = byId.get(from.node);
    const sourcePort = source && getNodeDef(source.type)?.outputs.find(port => port.key === from.port);
    // Dragging one selected output to a many-input port wires the other selected
    // compatible outputs too, atomically, without generating graph clutter.
    if (targetPort?.many && sourcePort && selected.has(from.node) && selection.nodeIds.length > 1) {
      let next = graph;
      for (const id of selection.nodeIds) {
        if (id === to.node) continue;
        const node = byId.get(id);
        const output = node && getNodeDef(node.type)?.outputs.find(port => port.type === sourcePort.type && port.type === targetPort.type);
        if (!output) continue;
        const result = connect(next,{node:id,port:output.key},to);
        if (result.ok) next = result.graph;
      }
      if (next !== graph) onChange(next);
    } else onConnect(from,to);
  };
  const endDrag = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.kind === 'nodes' && state.origins) {
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
      const dx = Math.round((event.clientX-state.startX)/zoom), dy = Math.round((event.clientY-state.startY)/zoom);
      const ids = new Set(state.origins.map(origin => origin.id));
      let next: NodeGraph = {...graph,nodes:graph.nodes.map(node => ids.has(node.id) ? {...node,x:node.x+dx,y:node.y+dy} : node)};
      // Only a single, loose node can be inserted. Use the rendered wire hit
      // paths and account for a release before the last animation frame.
      if (state.insertOnWire && state.origins.length === 1 && Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>5) {
        const id = state.origins[0].id;
        const element = host.current?.querySelector(`[data-node="${CSS.escape(id)}"]`);
        const rect = element?.getBoundingClientRect();
        const loose = !graph.links.some(link => link.from.node === id || link.to.node === id);
        if (rect && loose) {
          const previewDx = nodePreview?.ids.includes(id) ? nodePreview.dx : 0;
          const previewDy = nodePreview?.ids.includes(id) ? nodePreview.dy : 0;
          const sx = (dx-previewDx)*zoom, sy = (dy-previewDy)*zoom;
          for (const path of host.current?.querySelectorAll<SVGPathElement>('path[data-link-id]') ?? []) {
            const matrix = path.getScreenCTM();
            if (!matrix) continue;
            const length = path.getTotalLength();
            let intersects = false;
            for (let d=0;d<=length;d+=Math.max(4,length/100)) {
              const point = path.getPointAtLength(d).matrixTransform(matrix);
              if (point.x>rect.left+sx && point.x<rect.right+sx && point.y>rect.top+sy && point.y<rect.bottom+sy) { intersects = true; break; }
            }
            if (intersects && path.dataset.linkId) {
              const result = insertNodeInLink(next,id,path.dataset.linkId);
              if (result.ok) { next = result.graph; break; }
            }
          }
        }
      }
      setNodePreview(null);
      if (dx || dy || next.links !== graph.links) onChange(next);
    } else if (state.kind === 'box') {
      if (Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>3) {
        const a = toWorld(state.startX,state.startY), b = toWorld(event.clientX,event.clientY);
        const left = Math.min(a.x,b.x), right = Math.max(a.x,b.x), top = Math.min(a.y,b.y), bottom = Math.max(a.y,b.y);
        const ids = graph.nodes.filter(node => node.x < right && node.x+NODE_WIDTH > left && node.y < bottom && node.y+(heights.get(node.id) ?? estimatedNodeHeight(node)) > top).map(node => node.id);
        onSelectionChange({nodeIds:[...new Set([...(state.additive ? state.baseSelection ?? [] : []),...ids])],groupId:null});
      }
      setBox(null);
    } else if (state.kind === 'wire' && state.from) {
      const target = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-input-node]') as HTMLElement | null;
      const to = target?.dataset.inputNode && target.dataset.inputPort ? {node:target.dataset.inputNode,port:target.dataset.inputPort} : null;
      if (state.detachLinkId && Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>6) {
        const without = {...graph,links:graph.links.filter(link => link.id !== state.detachLinkId)};
        if (to && to.node !== state.from.node) {
          const result = connect(without,state.from,to);
          if (result.ok) onChange(result.graph);
        } else onChange(without);
      } else if (!state.detachLinkId && to && to.node !== state.from.node) completeConnection(state.from,to);
      setHoverPort(null);
    }
    drag.current = null; setWire(null);
  };
  const cancelDrag = () => {
    drag.current = null; setWire(null); setNodePreview(null); setBox(null);
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
  };
  const onWheel = (event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey && Math.abs(event.deltaY)<6) return;
    event.preventDefault();
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    const next = clamp(zoom * Math.exp(-event.deltaY*0.001),MIN_ZOOM,MAX_ZOOM);
    const x = event.clientX-rect.left, y = event.clientY-rect.top;
    setPan({x:x-(x-pan.x)/zoom*next,y:y-(y-pan.y)/zoom*next}); setZoom(next);
  };
  const fitAll = useCallback(() => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect || !graph.nodes.length) return;
    const left = Math.min(...graph.nodes.map(node => node.x))-48;
    const top = Math.min(...graph.nodes.map(node => node.y))-60;
    const right = Math.max(...graph.nodes.map(node => node.x+NODE_WIDTH))+48;
    const bottom = Math.max(...graph.nodes.map(node => node.y+(heights.get(node.id) ?? estimatedNodeHeight(node))))+48;
    const next = clamp(Math.min((rect.width-40)/(right-left),(rect.height-40)/(bottom-top),1),MIN_ZOOM,MAX_ZOOM);
    setZoom(next); setPan({x:(rect.width-(right-left)*next)/2-left*next,y:(rect.height-(bottom-top)*next)/2-top*next});
  },[graph.nodes,heights]);
  const beginWire = (event: React.PointerEvent, node: GraphNode, port:string) => {
    if (event.button !== 0) return;
    event.stopPropagation(); event.preventDefault(); setMenu(null); capture(event);
    drag.current = {kind:'wire',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,from:{node:node.id,port}};
    setWire({from:{node:node.id,port},...toWorld(event.clientX,event.clientY)});
  };
  const beginInputDrag = (event: React.PointerEvent, node:GraphNode, port:string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const links = graph.links.filter(entry => entry.to.node === node.id && entry.to.port === port);
    if (links.length !== 1) return;
    event.preventDefault(); capture(event);
    drag.current = {kind:'wire',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,from:links[0].from,detachLinkId:links[0].id};
    setWire({from:links[0].from,...toWorld(event.clientX,event.clientY)});
  };
  const openMenu = (event: React.MouseEvent, ids:string[], groupId:string | null = null) => {
    event.preventDefault(); event.stopPropagation();
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    onSelectionChange({nodeIds:ids,groupId});
    setMenu({x:clamp(event.clientX-rect.left,0,Math.max(0,rect.width-185)),y:clamp(event.clientY-rect.top,0,Math.max(0,rect.height-210)),nodeIds:ids,groupId});
    host.current?.focus({preventScroll:true});
  };
  const makeGroup = (ids:string[]) => {
    const result = groupNodes(graph,ids,`${t('Group')} ${(graph.groups?.length ?? 0)+1}`);
    if (result.group) { onChange(result.graph); onSelectionChange({nodeIds:result.group.nodeIds,groupId:result.group.id}); }
  };
  const paste = (source:GraphClipboard,offset:number,selectGroup:boolean) => {
    const result = pasteGraphSelection(graph,source,offset);
    if (!result.nodes.length) return;
    onChange(result.graph);
    onSelectionChange({nodeIds:result.nodes.map(node => node.id),groupId:selectGroup && result.groups.length === 1 ? result.groups[0].id : null});
  };
  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable=true]')) return;
      const active = host.current?.contains(document.activeElement) || document.activeElement === document.body;
      const key = event.key.toLowerCase();
      if (key === ' ' && active) { spaceDown.current = true; event.preventDefault(); return; }
      if (!active) return;
      if (key === 'home') { event.preventDefault(); fitAll(); return; }
      if ((key === 'a' && !event.altKey) && !event.shiftKey) {
        event.preventDefault(); event.stopPropagation(); onSelectionChange({nodeIds:graph.nodes.map(node => node.id),groupId:null}); return;
      }
      if ((event.altKey && key === 'a') || (key === 'escape' && (selection.nodeIds.length > 0 || menu || drag.current))) {
        event.preventDefault(); event.stopPropagation(); onSelectionChange({nodeIds:[],groupId:null}); setMenu(null); cancelDrag(); return;
      }
      if ((event.ctrlKey || event.metaKey) && (key === 'c' || key === 'x') && selection.nodeIds.length) {
        event.preventDefault(); event.stopPropagation();
        clipboard.current = copyGraphSelection(graph,selection.nodeIds); pasteCount.current = 0;
        if (key === 'x') { onChange(removeGraphNodes(graph,selection.nodeIds)); onSelectionChange({nodeIds:[],groupId:null}); }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'v' && clipboard.current) {
        event.preventDefault(); event.stopPropagation(); pasteCount.current++;
        paste(clipboard.current,36*pasteCount.current,clipboard.current.groups.length === 1); return;
      }
      if ((event.shiftKey || event.ctrlKey || event.metaKey) && key === 'd' && selection.nodeIds.length) {
        event.preventDefault(); event.stopPropagation(); paste(copyGraphSelection(graph,selection.nodeIds),36,!!selection.groupId); return;
      }
      if ((key === 'delete' || key === 'backspace') && selection.nodeIds.length) {
        event.preventDefault(); event.stopPropagation(); onChange(removeGraphNodes(graph,selection.nodeIds)); onSelectionChange({nodeIds:[],groupId:null});
      }
    };
    const onKeyUp = (event:KeyboardEvent) => { if (event.key === ' ') spaceDown.current = false; };
    const onBlur = () => { spaceDown.current = false; };
    window.addEventListener('keydown',onKey,true); window.addEventListener('keyup',onKeyUp,true); window.addEventListener('blur',onBlur);
    return () => { window.removeEventListener('keydown',onKey,true); window.removeEventListener('keyup',onKeyUp,true); window.removeEventListener('blur',onBlur); };
  },[graph,selection,onSelectionChange,onChange,fitAll,menu]);

  const bounds = useMemo(() => {
    const xs = displayGraph.nodes.map(node => node.x), ys = displayGraph.nodes.map(node => node.y);
    if (wire) { xs.push(wire.x); ys.push(wire.y); }
    const left = Math.min(0,...xs)-400, top = Math.min(0,...ys)-400;
    const right = Math.max(1400,...xs.map(x => x+NODE_WIDTH))+400, bottom = Math.max(800,...ys.map(y => y+400))+400;
    return {left,top,width:right-left,height:bottom-top};
  },[displayGraph.nodes,wire]);

  // At overview scale, external wires meet the frame edge; internal wires fade
  // with the members. Each external link gets its own clearly visible dot.
  const proxyPorts = useMemo(() => {
    const edges = new Map<string,{linkId:string;side:'in'|'out'}[]>();
    for (const link of graph.links) {
      const from = groups.owners.get(link.from.node), to = groups.owners.get(link.to.node);
      if (from && from.id !== to?.id) edges.set(`${from.id}:out`,[...(edges.get(`${from.id}:out`) ?? []),{linkId:link.id,side:'out'}]);
      if (to && to.id !== from?.id) edges.set(`${to.id}:in`,[...(edges.get(`${to.id}:in`) ?? []),{linkId:link.id,side:'in'}]);
    }
    const result = new Map<string,{x:number;y:number}>();
    for (const [key,entries] of edges) {
      const separator = key.lastIndexOf(':');
      const groupId = key.slice(0,separator), side = key.slice(separator+1);
      const rect = groups.rects.get(groupId);
      if (!rect) continue;
      entries.forEach((entry,index) => result.set(`${entry.linkId}:${entry.side}`,{x:side === 'in' ? rect.x : rect.x+rect.width,y:rect.y+rect.height*(index+1)/(entries.length+1)}));
    }
    return result;
  },[graph.links,groups]);
  const endpoint = (node:GraphNode,port:string,side:'in'|'out',linkId:string) => {
    const def = getNodeDef(node.type);
    const index = Math.max(0,(side === 'in' ? def?.inputs : def?.outputs)?.findIndex(entry => entry.key === port) ?? 0);
    const point = {x:node.x+(side === 'out' ? NODE_WIDTH : 0),y:node.y+portY(index)};
    const proxy = proxyPorts.get(`${linkId}:${side}`);
    if (!proxy) return point;
    return {x:proxy.x+(point.x-proxy.x)*groupFade,y:proxy.y+(point.y-proxy.y)*groupFade};
  };
  const pathBetween = (a:{x:number;y:number},b:{x:number;y:number}) => {
    const bend = Math.max(36,Math.abs(b.x-a.x)*0.45);
    return `M ${a.x} ${a.y} C ${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`;
  };

  return (
    <div ref={host} tabIndex={0} aria-label={t('Factory node canvas')} data-graph-canvas data-zoom={zoom.toFixed(4)}
      className="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1f] outline-none"
      onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={cancelDrag} onPointerDown={startBackground} onWheel={onWheel}
      onContextMenu={event => { if (event.target === event.currentTarget) { event.preventDefault(); setMenu(null); } }}
      onDoubleClick={event => { if (event.target === event.currentTarget) fitAll(); }}
      style={{touchAction:'none',backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)',backgroundSize:`${Math.max(4,24*zoom)}px ${Math.max(4,24*zoom)}px`,backgroundPosition:`${pan.x}px ${pan.y}px`}}>
      <div className="absolute left-0 top-0 origin-top-left" style={{transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}}>
        {(displayGraph.groups ?? []).map(group => {
          const rect = groups.rects.get(group.id);
          if (!rect) return null;
          const active = selection.groupId === group.id;
          return <div key={group.id} data-group={group.id} data-group-overview={overview ? 'true' : 'false'}
            className={cn('absolute z-0 select-none rounded-xl border-2 shadow-lg',active && 'ring-2 ring-white/60')}
            style={{left:rect.x,top:rect.y,width:rect.width,height:rect.height,borderColor:group.color,background:`${group.color}${overview ? 'b8' : '32'}`}}
            onPointerDown={event => startGroupDrag(event,group)} onContextMenu={event => openMenu(event,group.nodeIds,group.id)}>
            {overview ? <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 truncate whitespace-nowrap text-center font-semibold text-white" style={{fontSize:12/zoom,maxWidth:180/zoom,background:'#17191bd9',padding:`${2/zoom}px ${5/zoom}px`,borderRadius:4/zoom}}>{group.name}</div>
              : <div data-group-header className="flex h-8 cursor-grab items-center gap-2 rounded-t-lg px-3 text-[11px] font-semibold text-white/90" style={{background:`${group.color}99`}}><span>{group.name}</span><span className="font-normal text-white/60">· {group.nodeIds.length} {t('nodes')}</span></div>}
          </div>;
        })}
        <svg width={bounds.width} height={bounds.height} viewBox={`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`} style={{left:bounds.left,top:bounds.top}} className="pointer-events-none absolute z-[1] overflow-visible">
          {graph.links.map(link => {
            const fromNode = byId.get(link.from.node), toNode = byId.get(link.to.node);
            if (!fromNode || !toNode) return null;
            const fromGroup = groups.owners.get(fromNode.id), toGroup = groups.owners.get(toNode.id);
            const internal = !!fromGroup && fromGroup.id === toGroup?.id;
            const from = endpoint(fromNode,link.from.port,'out',link.id), to = endpoint(toNode,link.to.port,'in',link.id);
            const path = pathBetween(from,to);
            const type = getNodeDef(fromNode.type)?.outputs.find(port => port.key === link.from.port)?.type ?? 'config';
            const color = PORT_COLORS[type] ?? '#94a3b8';
            return <g key={link.id} opacity={internal ? groupFade : 1}>
              <path data-link-id={link.id} d={path} fill="none" stroke="transparent" strokeWidth={14} className={cn('cursor-pointer',(!internal || groupFade > 0.15) && 'pointer-events-auto')}
                onPointerDown={event => { if (event.button !== 0) return; event.stopPropagation(); onChange({...graph,links:graph.links.filter(entry => entry.id !== link.id)}); }}><title>{t('Click to remove this wire')}</title></path>
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.8} />
              {overview && fromGroup && !internal && <circle cx={from.x} cy={from.y} r={Math.max(5,3/zoom)} fill={color} stroke="#1c1c1f" strokeWidth={1/zoom} />}
              {overview && toGroup && !internal && <circle cx={to.x} cy={to.y} r={Math.max(5,3/zoom)} fill={color} stroke="#1c1c1f" strokeWidth={1/zoom} />}
            </g>;
          })}
          {wire && (() => {
            const node = byId.get(wire.from.node), def = node && getNodeDef(node.type);
            const index = Math.max(0,def?.outputs.findIndex(port => port.key === wire.from.port) ?? 0);
            const from = {x:(node?.x ?? 0)+NODE_WIDTH,y:(node?.y ?? 0)+portY(index)};
            return <path d={pathBetween(from,wire)} fill="none" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 4" />;
          })()}
        </svg>
        {displayGraph.nodes.map(node => {
          const def = getNodeDef(node.type);
          if (!def) return null;
          const issues = nodeDiagnostics.get(node.id) ?? [];
          const error = issues.some(entry => entry.severity === 'error');
          const warning = !error && issues.some(entry => entry.severity === 'warning');
          const collapsed = node.collapsed === true;
          const color = NODE_COLORS[node.type] ?? PORT_COLORS[def.outputs[0]?.type ?? 'config'] ?? '#7da7ca';
          const grouped = groups.owners.has(node.id);
          return <div key={node.id} data-node={node.id} data-node-type={node.type} data-node-color={color} data-selected={selected.has(node.id) ? 'true' : 'false'}
            className={cn('absolute z-[2] select-none rounded-md border bg-[#2a2a2e] shadow-lg transition-[opacity,border-color]',selected.has(node.id) ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/60' : error ? 'border-red-400/60' : warning ? 'border-amber-400/50' : 'border-white/15')}
            style={{left:node.x,top:node.y,width:NODE_WIDTH,opacity:grouped ? groupFade : 1,pointerEvents:grouped && groupFade<0.15 ? 'none' : undefined}}
            onPointerDown={event => startNodeDrag(event,node)}
            onContextMenu={event => openMenu(event,selected.has(node.id) && !selection.groupId ? selection.nodeIds : [node.id])}
            onDoubleClick={event => { if (!(event.target as HTMLElement).closest('[data-no-drag]')) onChange(updateNode(graph,node.id,{collapsed:!collapsed})); }}>
            <div className="flex h-[26px] cursor-grab items-center gap-1 rounded-t-md px-2" style={{background:`linear-gradient(90deg, ${color}b0, ${color}30)`}}>
              <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-white">{t(node.title ?? def.title)}</span>
              {error ? <AlertTriangle size={10} className="text-red-200" /> : warning ? <AlertTriangle size={10} className="text-amber-100" /> : null}
              <button type="button" data-no-drag aria-label={collapsed ? t('Expand') : t('Collapse')} onClick={() => onChange(updateNode(graph,node.id,{collapsed:!collapsed}))} className="rounded p-0.5 text-white/70 hover:bg-white/10 hover:text-white">{collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}</button>
            </div>
            <div className="flex gap-2 px-2 py-2" data-node-ports>
              <div className="flex min-w-0 flex-1 flex-col">
                {def.inputs.map((port,index) => <div key={port.key} className="relative flex h-[18px] items-center">
                  <button type="button" data-no-drag data-input-node={node.id} data-input-port={port.key} aria-label={`${def.title} ${port.label}`}
                    onPointerDown={event => beginInputDrag(event,node,port.key)} onPointerEnter={() => setHoverPort(`${node.id}:in:${port.key}`)} onPointerLeave={() => setHoverPort(null)}
                    className="absolute -left-[13px] h-[9px] w-[9px] rounded-full border border-[#1c1c1f] transition"
                    style={{background:PORT_COLORS[port.type] ?? '#94a3b8',boxShadow:hoverPort === `${node.id}:in:${port.key}` ? '0 0 0 3px rgba(255,255,255,.25)' : undefined}}
                    title={port.help ? t(port.help) : `${port.label} (${port.type})`} />
                  {!collapsed && <><span className="truncate text-[9.5px] leading-none text-white/45">{t(port.label)}{port.many && ` (${incomingCounts.get(`${node.id}:${port.key}`) ?? 0})`}</span>{index === 0 && <span className="ml-1 font-mono text-[7px] uppercase text-white/20">{port.type}</span>}</>}
                </div>)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-end">
                {def.outputs.map((port,index) => <div key={port.key} className="relative flex h-[18px] items-center">
                  {!collapsed && <span className="truncate text-[9.5px] leading-none text-white/60">{t(port.label)}</span>}
                  <button type="button" data-no-drag data-output-node={node.id} data-output-port={port.key} aria-label={`${def.title} ${port.label} output`}
                    onPointerDown={event => beginWire(event,node,port.key)} onPointerEnter={() => setHoverPort(`${node.id}:out:${port.key}`)} onPointerLeave={() => setHoverPort(null)}
                    className="absolute -right-[13px] h-[9px] w-[9px] cursor-crosshair rounded-full border border-[#1c1c1f]"
                    style={{background:PORT_COLORS[port.type] ?? '#94a3b8',boxShadow:hoverPort === `${node.id}:out:${port.key}` ? '0 0 0 3px rgba(255,255,255,.25)' : undefined}}
                    title={`${t(port.label)} (${port.type}) — ${t('drag to an input port')}`} />
                  {!collapsed && index === 0 && <span className="ml-1 font-mono text-[7px] uppercase text-white/20">{port.type}</span>}
                </div>)}
              </div>
            </div>
            {!collapsed && node.type.startsWith('part.') && <div data-no-drag className="space-y-1 border-t border-white/10 px-2 py-1.5" onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
              {def.params.map(param => <label key={param.key} className="flex items-center gap-1 text-[9px] text-white/55">
                <span className="w-[72px] shrink-0 truncate" title={t(param.label)}>{t(param.label)}</span>
                {param.kind === 'select' ? <select aria-label={t(param.label)} value={String(node.params[param.key] ?? param.default)} onChange={event => onChange(setParam(graph,node.id,param.key,event.target.value))} className="min-w-0 flex-1 rounded bg-[#19191b] px-1 text-white/85">{param.options?.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select>
                  : param.kind === 'number' ? <><input aria-label={t(param.label)} type="range" min={param.min} max={param.max} step={param.step} value={Number(node.params[param.key] ?? param.default)} onChange={event => onChange(setParam(graph,node.id,param.key,Number(event.target.value)))} className="min-w-0 flex-1 accent-range"/><span className="w-7 text-right font-mono">{String(node.params[param.key] ?? param.default)}</span></> : null}
              </label>)}
            </div>}
            {!collapsed && def.summary && <div data-no-drag className="border-t border-white/5 px-2 py-1"><div className="truncate font-mono text-[8.5px] text-white/40">{def.summary(node.params)}</div></div>}
            {!collapsed && node.type === 'input.prompt' && <textarea data-no-drag value={String(node.params.text ?? '')} onChange={event => onChange(setParam(graph,node.id,'text',event.target.value))} onPointerDown={event => event.stopPropagation()} rows={3} placeholder={t('Describe the factory…')} className="mx-1.5 mb-1.5 w-[calc(100%-12px)] resize-none rounded border border-white/10 bg-[#1e1e20] px-1.5 py-1 text-[9.5px] leading-snug text-white/80 outline-none focus:border-[var(--app-accent)]/60" />}
            {!collapsed && issues.length > 0 && <div className="border-t border-white/5 px-2 py-1">{issues.slice(0,2).map(issue => <div key={issue.id} className={cn('flex items-start gap-1 text-[8px] leading-snug',issue.severity === 'error' ? 'text-red-300' : issue.severity === 'warning' ? 'text-amber-300/90' : 'text-white/35')}>
              {issue.severity === 'info' ? <Info size={8} className="mt-[1px] shrink-0" /> : <AlertTriangle size={8} className="mt-[1px] shrink-0" />}<span className="min-w-0">{issue.message}</span>
            </div>)}</div>}
          </div>;
        })}
      </div>
      {box && <div data-box-selection className="pointer-events-none absolute z-10 border border-sky-300 bg-sky-400/20" style={{left:box.x,top:box.y,width:box.width,height:box.height}} />}
      <button type="button" data-no-drag aria-label={t('Fit all nodes')} title={t('Fit all nodes')} onPointerDown={event => event.stopPropagation()} onClick={fitAll} className="absolute right-2 top-2 z-10 rounded border border-white/15 bg-black/60 p-1.5 text-white/70 hover:bg-white/15"><Maximize2 size={13} /></button>
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-2 rounded bg-black/60 px-2 py-1 font-mono text-[8.5px] text-white/55">
        <span>{Math.round(zoom*100)}%</span><span>· {t('drag to select · middle mouse or Space + drag to pan · wheel to zoom')}</span>
      </div>
      {menu && <div role="menu" aria-label={t('Node actions')} className="absolute z-30 w-[180px] rounded border border-white/20 bg-[#282a2e] p-1 text-[11px] text-white shadow-2xl" style={{left:menu.x,top:menu.y}} onPointerDown={event => event.stopPropagation()} onContextMenu={event => event.preventDefault()}>
        <div className="px-2 py-1 text-[9px] text-white/45">{menu.groupId ? t('Group') : `${menu.nodeIds.length} ${t('selected')}`}</div>
        <button role="menuitem" type="button" disabled={menu.nodeIds.length<2} onClick={() => { onChange(arrangeGraphNodes(graph,menu.nodeIds,heights)); setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/10 disabled:opacity-35">{t('Rearrange nodes')}</button>
        {!menu.groupId && <button role="menuitem" type="button" disabled={menu.nodeIds.length<2} onClick={() => { makeGroup(menu.nodeIds); setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/10 disabled:opacity-35">{t('Group selected nodes')}</button>}
        {menu.groupId && <button role="menuitem" type="button" onClick={() => { onChange({...graph,groups:graph.groups?.filter(group => group.id !== menu.groupId)}); onSelectionChange({nodeIds:menu.nodeIds,groupId:null}); setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/10">{t('Ungroup')}</button>}
        <button role="menuitem" type="button" onClick={() => { clipboard.current=copyGraphSelection(graph,menu.nodeIds); pasteCount.current=0; setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/10">{t('Copy')} <span className="float-right text-white/35">Ctrl+C</span></button>
        <button role="menuitem" type="button" onClick={() => { paste(copyGraphSelection(graph,menu.nodeIds),36,!!menu.groupId); setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/10">{t('Duplicate')} <span className="float-right text-white/35">Shift+D</span></button>
        <button role="menuitem" type="button" onClick={() => { onChange(removeGraphNodes(graph,menu.nodeIds)); onSelectionChange({nodeIds:[],groupId:null}); setMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left text-red-300 hover:bg-white/10">{t('Delete')}</button>
      </div>}
    </div>
  );
}
