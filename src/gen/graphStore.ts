import { useSyncExternalStore } from 'react';
// The node definitions must be registered before a saved graph is parsed, otherwise
// `parseGraph` would treat every node type as unknown and drop the user's graph.
import './graph/nodes';
import { defaultGraph, parseGraph, serializeGraph } from './graph/graph';
import type { NodeGraph } from './graph/types';

/**
 * Persisted factory graph.
 *
 * The graph is user data like the project itself, so it lives in localStorage, survives
 * reloads, and is exported/imported as plain JSON. Loading goes through `parseGraph`, so
 * an older save with node types that no longer exist degrades instead of crashing.
 */
const STORAGE_KEY = 'larp-factory-graph-v1';

function load(): NodeGraph {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGraph();
    const graph = parseGraph(JSON.parse(raw));
    return graph.nodes.length ? graph : defaultGraph();
  } catch {
    return defaultGraph();
  }
}

let state: NodeGraph = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGraph(state)));
  } catch {
    // Storage may be unavailable (private mode); the graph still works for this session.
  }
}

export function setGraph(next: NodeGraph) {
  state = next;
  persist();
  emit();
}

export function graphValue() {
  return state;
}

export function replaceGraph(next: NodeGraph) {
  setGraph(parseGraph(next));
}

export function resetGraph() {
  setGraph(defaultGraph());
}

export function useFactoryGraph(): NodeGraph {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    graphValue,
    graphValue,
  );
}
