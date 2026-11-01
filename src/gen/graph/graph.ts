/**
 * Graph operations: creation, wiring, validation and serialisation.
 *
 * Wiring rules are checked here (not in the UI) so keyboard-driven and programmatic
 * edits obey the same constraints as mouse drags:
 * - an input port takes one wire unless it is marked `many`;
 * - both ends must exist and have the same port type;
 * - a wire that would close a cycle is rejected.
 */
import { getNodeDef } from './registry';
import type { Diagnostic, GraphLink, GraphNode, NodeGraph, PortType } from './types';

let counter = 0;
export function uid(prefix = 'n') {
  counter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${counter.toString(36)}`;
}

/**
 * Creates a node. Only the given parameters are stored: a node whose parameters were
 * never touched stays empty, which is how "defaults yield to the prompt" works.
 */
export function makeNode(type: string, x: number, y: number, params: Record<string, unknown> = {}, title?: string): GraphNode {
  return { id: uid(), type, x, y, params: { ...params }, title };
}

export function emptyGraph(): NodeGraph {
  return { version: 1, nodes: [], links: [] };
}

/**
 * Starter graph wired to the same result as the previous default settings, so the node
 * editor opens with something that already builds a factory.
 */
export function defaultGraph(): NodeGraph {
  const nodes: GraphNode[] = [
    makeNode('input.prompt', 40, 40, { text: 'L-shaped metalworking cell with 2 process cells, cobot, vacuum gripper, 8 boxes per minute' }),
    makeNode('input.recipe', 40, 250),
    makeNode('process.chain', 380, 40),
    makeNode('process.speed', 380, 250),
    makeNode('resources.robot', 380, 430),
    makeNode('resources.staff', 380, 590),
    makeNode('resources.safety', 380, 750),
    makeNode('layout.line', 720, 40),
    makeNode('layout.pallet', 720, 250),
    makeNode('output.factory', 1060, 200),
  ];
  const byType = (type: string) => nodes.find((node) => node.type === type)!;
  const links: GraphLink[] = [
    link(byType('input.prompt'), 'intent', byType('process.chain'), 'intent'),
    // The prompt also goes straight to the output: the chain node consumes its process
    // steps, while the output node needs the rest (recipe, robot, style, safety, rate).
    link(byType('input.prompt'), 'intent', byType('output.factory'), 'intent'),
    link(byType('input.recipe'), 'config', byType('output.factory'), 'config'),
    link(byType('process.chain'), 'config', byType('output.factory'), 'config'),
    link(byType('process.chain'), 'cells', byType('output.factory'), 'cells'),
    link(byType('process.speed'), 'config', byType('output.factory'), 'config'),
    link(byType('resources.robot'), 'robot', byType('output.factory'), 'robot'),
    link(byType('resources.staff'), 'staff', byType('output.factory'), 'staff'),
    link(byType('resources.safety'), 'safety', byType('output.factory'), 'safety'),
    link(byType('layout.line'), 'layout', byType('output.factory'), 'layout'),
    link(byType('layout.pallet'), 'pallet', byType('output.factory'), 'pallet'),
  ];
  return { version: 1, nodes, links };
}

function link(from: GraphNode, fromPort: string, to: GraphNode, toPort: string): GraphLink {
  return { id: uid('l'), from: { node: from.id, port: fromPort }, to: { node: to.id, port: toPort } };
}

export function portType(graph: NodeGraph, ref: { node: string; port: string }, side: 'in' | 'out'): PortType | undefined {
  const node = graph.nodes.find((entry) => entry.id === ref.node);
  const def = node ? getNodeDef(node.type) : undefined;
  return (side === 'in' ? def?.inputs : def?.outputs)?.find((port) => port.key === ref.port)?.type;
}

export interface ConnectResult { ok: boolean; graph: NodeGraph; error?: string }

/** Adds a wire, replacing the existing one on a single-valued input. */
export function connect(graph: NodeGraph, from: { node: string; port: string }, to: { node: string; port: string }): ConnectResult {
  if (from.node === to.node) return { ok: false, graph, error: 'A node cannot be wired to itself.' };
  const outType = portType(graph, from, 'out');
  const inType = portType(graph, to, 'in');
  if (!outType) return { ok: false, graph, error: 'That output does not exist.' };
  if (!inType) return { ok: false, graph, error: 'That input does not exist.' };
  if (outType !== inType) return { ok: false, graph, error: `Cannot connect ${outType} to ${inType}.` };

  const targetNode = graph.nodes.find((node) => node.id === to.node);
  const def = targetNode ? getNodeDef(targetNode.type) : undefined;
  const many = def?.inputs.find((port) => port.key === to.port)?.many ?? false;

  const links = graph.links.filter((entry) => {
    if (entry.from.node === from.node && entry.from.port === from.port && entry.to.node === to.node && entry.to.port === to.port) return false;
    if (!many && entry.to.node === to.node && entry.to.port === to.port) return false;
    return true;
  });
  const next: NodeGraph = { ...graph, links: [...links, { id: uid('l'), from, to }] };
  const cycles = findCycles(next);
  if (cycles.length) return { ok: false, graph, error: 'That wire would create a loop. Node graphs must stay acyclic.' };
  return { ok: true, graph: next };
}

export function disconnect(graph: NodeGraph, linkId: string): NodeGraph {
  return { ...graph, links: graph.links.filter((entry) => entry.id !== linkId) };
}

export function removeNode(graph: NodeGraph, nodeId: string): NodeGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    links: graph.links.filter((entry) => entry.from.node !== nodeId && entry.to.node !== nodeId),
  };
}

export function addNode(graph: NodeGraph, node: GraphNode): NodeGraph {
  return { ...graph, nodes: [...graph.nodes, node] };
}

export function updateNode(graph: NodeGraph, nodeId: string, patch: Partial<GraphNode>): NodeGraph {
  return { ...graph, nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch, params: { ...node.params, ...(patch.params ?? {}) } } : node)) };
}

export function setParam(graph: NodeGraph, nodeId: string, key: string, value: unknown): NodeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, params: { ...node.params, [key]: value } } : node)),
  };
}

/** Kahn's algorithm. Returns a stable topological order and any nodes stuck in cycles. */
export function topoSort(graph: NodeGraph): { order: GraphNode[]; cycle: string[] } {
  const indegree = new Map<string, number>();
  const edges = new Map<string, string[]>();
  for (const node of graph.nodes) { indegree.set(node.id, 0); edges.set(node.id, []); }
  for (const entry of graph.links) {
    if (!indegree.has(entry.to.node) || !indegree.has(entry.from.node)) continue;
    edges.get(entry.from.node)!.push(entry.to.node);
    indegree.set(entry.to.node, (indegree.get(entry.to.node) ?? 0) + 1);
  }
  // Nodes with no incoming wire, in creation order, so the result is deterministic.
  const queue = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const order: GraphNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = graph.nodes.find((entry) => entry.id === id);
    if (node) order.push(node);
    for (const next of edges.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  const cycle = graph.nodes.filter((node) => !order.some((entry) => entry.id === node.id)).map((node) => node.id);
  return { order, cycle };
}

export function findCycles(graph: NodeGraph): string[] {
  return topoSort(graph).cycle;
}

/** Every diagnostic the editor can show before a build. */
export function validateGraph(graph: NodeGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    const def = getNodeDef(node.type);
    if (!def) {
      diagnostics.push({ id: `unknown:${node.id}`, severity: 'error', nodeId: node.id, message: `Unknown node type "${node.type}".` });
      continue;
    }
    ids.add(node.id);
    for (const input of def.inputs) {
      const wired = graph.links.filter((entry) => entry.to.node === node.id && entry.to.port === input.key);
      if (input.required && wired.length === 0) {
        diagnostics.push({ id: `missing:${node.id}:${input.key}`, severity: 'error', nodeId: node.id, port: input.key, message: `${def.title}: "${input.label}" is required.` });
      }
      if (!input.many && wired.length > 1) {
        diagnostics.push({ id: `multi:${node.id}:${input.key}`, severity: 'error', nodeId: node.id, port: input.key, message: `${def.title}: "${input.label}" accepts one wire.` });
      }
      for (const entry of wired) {
        const type = portType(graph, entry.from, 'out');
        if (type !== input.type) {
          diagnostics.push({ id: `type:${entry.id}`, severity: 'error', nodeId: node.id, port: input.key, message: `${def.title}: "${input.label}" expects ${input.type} but receives ${type ?? 'nothing'}.` });
        }
      }
    }
    for (const entry of graph.links.filter((link) => link.from.node === node.id)) {
      if (!graph.nodes.some((other) => other.id === entry.to.node)) {
        diagnostics.push({ id: `dangling:${entry.id}`, severity: 'warning', nodeId: node.id, message: `${def.title}: a wire points at a node that no longer exists.` });
      }
    }
  }
  const { cycle } = topoSort(graph);
  if (cycle.length) {
    diagnostics.push({ id: 'cycle', severity: 'error', message: `The graph has a loop through ${cycle.length} node(s). Remove one of the wires to continue.` });
  }
  if (!graph.nodes.some((node) => node.type === 'output.factory' || node.type === 'part.pallet')) {
    diagnostics.push({ id: 'no-output', severity: 'error', message: 'The graph needs a Factory output node to build anything.' });
  }
  // Orphan nodes are allowed but worth pointing out, since users expect them to matter.
  const connected = new Set(graph.links.flatMap((entry) => [entry.from.node, entry.to.node]));
  for (const node of graph.nodes) {
    if (!connected.has(node.id) && graph.nodes.length > 1) {
      diagnostics.push({ id: `orphan:${node.id}`, severity: 'info', nodeId: node.id, message: `${getNodeDef(node.type)?.title ?? node.type} is not connected to anything.` });
    }
  }
  return diagnostics;
}

/* ---------------------------------------------------------- serialisation */

export function serializeGraph(graph: NodeGraph) {
  return JSON.parse(JSON.stringify(graph)) as NodeGraph;
}

/**
 * Restores a graph from untrusted JSON (a project file or localStorage) with the same
 * defensive posture as the settings loader: unknown fields are dropped, coordinates are
 * clamped, unknown node types are removed with their wires.
 */
export function parseGraph(input: unknown): NodeGraph {
  if (!input || typeof input !== 'object') return defaultGraph();
  const source = input as Partial<NodeGraph>;
  const nodes: GraphNode[] = [];
  for (const candidate of Array.isArray(source.nodes) ? source.nodes : []) {
    if (!candidate || typeof candidate !== 'object') continue;
    const node = candidate as Partial<GraphNode>;
    if (typeof node.type !== 'string' || !getNodeDef(node.type)) continue;
    const def = getNodeDef(node.type)!;
    const params: Record<string, unknown> = {};
    for (const param of def.params) {
      const value = node.params?.[param.key];
      // Keep only values the definition knows about; defaults are applied at read time.
      if (value !== undefined && typeof value === typeof param.default) params[param.key] = value;
    }
    nodes.push({
      id: typeof node.id === 'string' && node.id ? node.id : uid(),
      type: node.type,
      x: Number.isFinite(node.x) ? Math.max(-1000000, Math.min(1000000, Number(node.x))) : 40,
      y: Number.isFinite(node.y) ? Math.max(-1000000, Math.min(1000000, Number(node.y))) : 40,
      params,
      title: typeof node.title === 'string' ? node.title.slice(0, 80) : undefined,
      collapsed: node.collapsed === true,
    });
  }
  const present = new Set(nodes.map((node) => node.id));
  const links: GraphLink[] = [];
  for (const candidate of Array.isArray(source.links) ? source.links : []) {
    const entry = candidate as Partial<GraphLink>;
    if (!entry?.from?.node || !entry?.to?.node) continue;
    if (!present.has(entry.from.node) || !present.has(entry.to.node)) continue;
    links.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : uid('l'),
      from: { node: entry.from.node, port: String(entry.from.port) },
      to: { node: entry.to.node, port: String(entry.to.port) },
    });
  }
  const graph: NodeGraph = { version: 1, nodes, links, note: typeof source.note === 'string' ? source.note.slice(0, 4000) : undefined };
  // Drop wires that no longer type-check after a registry change.
  return { ...graph, links: links.filter((entry) => portType(graph, entry.from, 'out') === portType(graph, entry.to, 'in')) };
}

/** Insert a compatible node in a wire atomically; leave the graph untouched on failure. */
export function insertNodeInLink(graph: NodeGraph, nodeId: string, linkId: string): ConnectResult {
  const link = graph.links.find(entry => entry.id === linkId);
  const node = graph.nodes.find(entry => entry.id === nodeId);
  if (!link || !node || link.from.node === nodeId || link.to.node === nodeId) return {ok:false,graph};
  if (graph.links.some(entry => entry.from.node === nodeId || entry.to.node === nodeId)) return {ok:false,graph};
  const def = getNodeDef(node.type);
  const type = portType(graph, link.from, 'out');
  const input = def?.inputs.find(port => port.type === type);
  const output = def?.outputs.find(port => port.type === type);
  if (!input || !output) return {ok:false,graph};
  const without = {...graph,links:graph.links.filter(entry=>entry.id !== linkId)};
  const first = connect(without,link.from,{node:nodeId,port:input.key});
  if (!first.ok) return {ok:false,graph,error:first.error};
  const second = connect(first.graph,{node:nodeId,port:output.key},link.to);
  return second.ok ? second : {ok:false,graph,error:second.error};
}
