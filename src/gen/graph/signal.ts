import { signalAcceptsInput, signalFunction, signalFunctions } from '../../utils/signalChannels';
import { signalWireColor } from '../../utils/signalPorts';
import { getNodeDef } from './registry';
import type { GraphNode, NodeGraph, PortDef } from './types';

export function signalPortNumber(key: string, side?: 'in' | 'out'): number | null {
  const match = /^(?:signal-(in|out)|legacy-in)-([1-9]\d*)$/.exec(key);
  const direction = match?.[1] ?? 'in';
  if (!match || (side && direction !== side)) return null;
  const number = Number(match[2]);
  return Number.isSafeInteger(number) ? number : null;
}

export const signalPort = (side: 'in' | 'out', number: number) => `signal-${side}-${number}`;

/** Static material/data pins and dynamic signal pins share the same validation. */
export function nodePort(node: GraphNode | undefined, key: string, side: 'in' | 'out'): PortDef | undefined {
  if (!node) return undefined;
  const def = getNodeDef(node.type);
  const fixed = (side === 'in' ? def?.inputs : def?.outputs)?.find(port => port.key === key);
  if (fixed) return fixed;
  const number = signalPortNumber(key, side);
  // Grandfather old saved enable wires without offering new detector inputs.
  if (side === 'in' && !signalAcceptsInput(node.type) && !key.startsWith('legacy-in-')) return undefined;
  if (number === null || !node.type.startsWith('part.') || !signalFunctions(node.type).length) return undefined;
  return {key, label:`${side.toUpperCase()} ${number}`, type:'signal'};
}

/** Only enumerate rows that exist or are used. Sparse/untrusted port numbers never
 * allocate a giant array; normal interactive wiring grows 1, 2, 3, and so on. */
const rowCache = new WeakMap<NodeGraph, Map<string, number[]>>();
export function signalRows(graph: NodeGraph, node: GraphNode): number[] {
  let indexed = rowCache.get(graph);
  if (!indexed) {
    const sets = new Map<string,Set<number>>();
    for (const entry of graph.nodes) {
      if (!entry.type.startsWith('part.') || !signalFunctions(entry.type).length) continue;
      const rows = new Set<number>([1]);
      for (const key of Object.keys(entry.io ?? {})) {
        const number = Number(key);
        if (Number.isSafeInteger(number) && number > 0 && String(number) === key) { rows.add(number); if (entry.type === 'part.color-sensor' && entry.io?.[key]?.material && number < Number.MAX_SAFE_INTEGER) rows.add(number + 1); }
      }
      sets.set(entry.id,rows);
    }
    const add = (id: string, key: string, side: 'in' | 'out') => {
      const rows = sets.get(id), number = signalPortNumber(key,side);
      if (!rows || number === null) return;
      rows.add(number);
      if (number < Number.MAX_SAFE_INTEGER) rows.add(number + 1);
    };
    for (const link of graph.links) { add(link.to.node,link.to.port,'in'); add(link.from.node,link.from.port,'out'); }
    indexed = new Map([...sets].map(([id,rows]) => [id,[...rows].sort((a,b) => a-b)]));
    rowCache.set(graph,indexed);
  }
  return indexed.get(node.id) ?? [];
}

export function channelMode(node: GraphNode, port: number): string {
  return signalFunction(node.type, node.io?.[String(port)]?.mode)?.value ?? '';
}

export function channelColor(node: GraphNode, port: number): string {
  return signalWireColor(node.io?.[String(port)]?.color ?? node.params.wireColor);
}

export function setChannel(graph: NodeGraph, nodeId: string, port: number, patch: {mode?: string; color?: string; material?: string; materialRef?:string; programSource?:string; programTarget?:string; programMode?:string}): NodeGraph {
  return {...graph, nodes:graph.nodes.map(node => node.id === nodeId ? {
    ...node, io:{...node.io, [String(port)]:{...node.io?.[String(port)], ...patch}},
  } : node)};
}

/** Convert alpha.5 conveyor-to-detector signal wires into placement-only links.
 * Other old enable wires stay read-only legacy channels so imported graphs keep
 * their original runtime behaviour, but users cannot create new detector inputs. */
export function migrateSensorMounts(graph: NodeGraph): NodeGraph {
  if (graph.signalSchema === 2) return graph;
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const links = graph.links.map(link => {
    const to = nodes.get(link.to.node), from = nodes.get(link.from.node);
    const number = signalPortNumber(link.to.port, 'in');
    if (!to || signalAcceptsInput(to.type) || number === null) return link;
    if (from?.type === 'part.conveyor' && signalPortNumber(link.from.port,'out') !== null)
      return {...link, from:{...link.from,port:'attach'}, to:{...link.to,port:'mount'}};
    return {...link,to:{...link.to,port:`legacy-in-${number}`}};
  });
  return {...graph, links, signalSchema:2};
}
