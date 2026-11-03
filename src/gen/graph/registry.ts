/**
 * Node registry.
 *
 * Adding a capability to the generator means adding one `NodeDef` here — the editor,
 * validation, serialisation and the add-node palette all read from this registry, so a
 * new node appears everywhere without touching UI code. Node `type` strings are
 * permanent identifiers: saved graphs reference them, so renaming one is a breaking
 * change (same rule ComfyUI applies to `NODE_CLASS_MAPPINGS` keys).
 */
import type { NodeCategory, NodeDef } from './types';

const registry = new Map<string, NodeDef>();

export function registerNode(def: NodeDef) {
  if (registry.has(def.type)) throw new Error(`Duplicate node type: ${def.type}`);
  registry.set(def.type, def);
  return def;
}

export function getNodeDef(type: string): NodeDef | undefined {
  return registry.get(type);
}

export function allNodeDefs(): NodeDef[] {
  return [...registry.values()];
}

export const CATEGORY_ORDER: NodeCategory[] = ['Input', 'Process', 'Resources', 'Layout', 'Output'];

export function nodesByCategory(): { category: NodeCategory; defs: NodeDef[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    defs: allNodeDefs().filter((def) => def.category === category),
  })).filter((group) => group.defs.length > 0);
}

/** Port colours, shared by the editor and the legend. */
export const PORT_COLORS: Record<string, string> = {
  signal: '#4da9d8',
  flow: '#fbbf24',
  machine: '#34d399',
  intent: '#c084fc',
  config: '#7dd3fc',
  cells: '#fbbf24',
  robot: '#34d399',
  layout: '#60a5fa',
  pallet: '#f472b6',
  staff: '#facc15',
  safety: '#f87171',
  plant: '#e2e8f0',
  items: '#94a3b8',
  text: '#a8a29e',
  number: '#22d3ee',
  boolean: '#4ade80',
};
