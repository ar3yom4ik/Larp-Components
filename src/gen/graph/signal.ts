import { signalFunction, signalFunctions } from '../../utils/signalChannels';
import { signalWireColor } from '../../utils/signalPorts';
import { getNodeDef } from './registry';
import type { GraphNode, NodeGraph, PortDef } from './types';

export function signalPortNumber(key: string, side?: 'in' | 'out'): number | null {
  const match = /^signal-(in|out)-([1-9]\d*)$/.exec(key);
  if (!match || (side && match[1] !== side)) return null;
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
        if (Number.isSafeInteger(number) && number > 0 && String(number) === key) rows.add(number);
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

export function setChannel(graph: NodeGraph, nodeId: string, port: number, patch: {mode?: string; color?: string}): NodeGraph {
  return {...graph, nodes:graph.nodes.map(node => node.id === nodeId ? {
    ...node, io:{...node.io, [String(port)]:{...node.io?.[String(port)], ...patch}},
  } : node)};
}
