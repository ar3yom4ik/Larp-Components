import { getNodeDef } from './registry';
import type { GraphNode } from './types';

/** Shared world-space geometry for nodes, ports and graph layout. */
export const NODE_WIDTH = 208;
export const NODE_HEADER = 26;
export const PORT_ROW = 18;
export const PORT_PAD = 8;

export function estimatedNodeHeight(node: GraphNode): number {
  const def = getNodeDef(node.type);
  if (!def) return NODE_HEADER;
  const ports = NODE_HEADER + PORT_PAD * 2 + Math.max(def.inputs.length, def.outputs.length) * PORT_ROW;
  if (node.collapsed) return ports;
  return ports + (node.type.startsWith('part.') ? def.params.length * 19 + 12 : 0) + (def.summary ? 18 : 0) + (node.type === 'input.prompt' ? 60 : 0);
}
