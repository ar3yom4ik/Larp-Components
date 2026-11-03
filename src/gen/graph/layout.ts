import { estimatedNodeHeight, NODE_WIDTH } from './metrics';
export { estimatedNodeHeight, NODE_WIDTH, NODE_HEADER, PORT_PAD, PORT_ROW } from './metrics';
import { makeNode, uid } from './graph';
import { signalPortNumber } from './signal';
import type { GraphGroup, GraphLink, GraphNode, NodeGraph } from './types';

export const GROUP_COLOR = '#5973a6';

/** Remove nodes, their wires and stale memberships in one history operation. */
export function removeGraphNodes(graph: NodeGraph, ids: Iterable<string>): NodeGraph {
  const selected = new Set(ids);
  return {
    ...graph,
    nodes: graph.nodes.filter(node => !selected.has(node.id)),
    links: graph.links.filter(link => !selected.has(link.from.node) && !selected.has(link.to.node)),
    groups: graph.groups?.map(group => ({...group, nodeIds:group.nodeIds.filter(id => !selected.has(id))})).filter(group => group.nodeIds.length),
  };
}

/** Creating a frame rehomes its members, preventing overlapping ownership. */
export function groupNodes(graph: NodeGraph, ids: Iterable<string>, name = 'Group', color = GROUP_COLOR) {
  const requested = new Set(ids);
  const nodeIds = graph.nodes.filter(node => requested.has(node.id)).map(node => node.id);
  if (!nodeIds.length) return { graph, group: null };
  const group: GraphGroup = { id:uid('g'), name: name.trim().slice(0,80) || 'Group', color: /^#[0-9a-f]{6}$/i.test(color) ? color : GROUP_COLOR, nodeIds };
  const selected = new Set(nodeIds);
  const old = (graph.groups ?? []).map(entry => ({...entry,nodeIds:entry.nodeIds.filter(id => !selected.has(id))})).filter(entry => entry.nodeIds.length);
  return {graph:{...graph,groups:[...old,group]},group};
}

export interface GraphClipboard { nodes: GraphNode[]; links: GraphLink[]; groups: GraphGroup[] }

/** Copy only complete frames and links wholly inside the selection. */
export function copyGraphSelection(graph: NodeGraph, ids: Iterable<string>): GraphClipboard {
  const selected = new Set(ids);
  return structuredClone({
    nodes: graph.nodes.filter(node => selected.has(node.id)),
    links: graph.links.filter(link => selected.has(link.from.node) && selected.has(link.to.node)),
    groups: (graph.groups ?? []).filter(group => group.nodeIds.length > 0 && group.nodeIds.every(id => selected.has(id))),
  });
}

export function pasteGraphSelection(graph: NodeGraph, clipboard: GraphClipboard, offset = 36) {
  const idMap = new Map<string,string>();
  const nodes = clipboard.nodes.map(old => {
    const node = makeNode(old.type, old.x + offset, old.y + offset, structuredClone(old.params), old.title);
    node.collapsed = old.collapsed;
    node.io = old.io ? structuredClone(old.io) : undefined;
    idMap.set(old.id,node.id);
    return node;
  });
  for (const node of nodes) {
    const mounted = node.params.mountedTo;
    if (typeof mounted === 'string' && idMap.has(mounted)) node.params.mountedTo = idMap.get(mounted)!;
  }
  const links = clipboard.links.flatMap(link => {
    const from = idMap.get(link.from.node), to = idMap.get(link.to.node);
    return from && to ? [{id:uid('l'),from:{node:from,port:link.from.port},to:{node:to,port:link.to.port}}] : [];
  });
  const groups = clipboard.groups.map(group => ({...group,id:uid('g'),nodeIds:group.nodeIds.map(id => idMap.get(id)).filter((id): id is string => !!id)})).filter(group => group.nodeIds.length);
  return { graph:{...graph,nodes:[...graph.nodes,...nodes],links:[...graph.links,...links],groups:[...(graph.groups ?? []),...groups]}, nodes, groups };
}

/** Lay out the selected induced DAG in columns, using measured heights if known. */
export function arrangeGraphNodes(graph: NodeGraph, ids: Iterable<string>, heights: ReadonlyMap<string,number> = new Map()): NodeGraph {
  const selected = new Set(ids);
  const nodes = graph.nodes.filter(node => selected.has(node.id));
  if (nodes.length < 2) return graph;
  const byId = new Map(nodes.map(node => [node.id,node]));
  const indegree = new Map(nodes.map(node => [node.id,0]));
  const outs = new Map<string,string[]>();
  for (const link of graph.links) {
    if (!selected.has(link.from.node) || !selected.has(link.to.node) || signalPortNumber(link.from.port, 'out') !== null) continue;
    indegree.set(link.to.node,(indegree.get(link.to.node) ?? 0)+1);
    outs.set(link.from.node,[...(outs.get(link.from.node) ?? []),link.to.node]);
  }
  const queue = nodes.filter(node => indegree.get(node.id) === 0).sort((a,b) => a.y-b.y || a.x-b.x);
  const ranks = new Map(nodes.map(node => [node.id,0]));
  for (let i=0;i<queue.length;i++) {
    const node = queue[i];
    for (const next of outs.get(node.id) ?? []) {
      ranks.set(next,Math.max(ranks.get(next) ?? 0,(ranks.get(node.id) ?? 0)+1));
      indegree.set(next,(indegree.get(next) ?? 1)-1);
      if (indegree.get(next) === 0) queue.push(byId.get(next)!);
    }
  }
  const left = Math.min(...nodes.map(node => node.x));
  const top = Math.min(...nodes.map(node => node.y));
  const columns = new Map<number,GraphNode[]>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    columns.set(rank,[...(columns.get(rank) ?? []),node]);
  }
  const positions = new Map<string,{x:number;y:number}>();
  for (const [rank,column] of columns) {
    let y = top;
    column.sort((a,b) => a.y-b.y || a.x-b.x);
    for (const node of column) {
      positions.set(node.id,{x:left+rank*(NODE_WIDTH+100),y});
      y += (heights.get(node.id) ?? estimatedNodeHeight(node, graph)) + 48;
    }
  }
  return {...graph,nodes:graph.nodes.map(node => positions.has(node.id) ? {...node,...positions.get(node.id)!} : node)};
}
