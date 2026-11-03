import { useSyncExternalStore } from 'react';
// The node definitions must be registered before a saved graph is parsed, otherwise
// `parseGraph` would treat every node type as unknown and drop the user's graph.
import './graph/nodes';
import './graph/components';
import { parseGraph, serializeGraph } from './graph/graph';
import { defaultComponentGraph } from './graph/componentCompile';
import { upgradePickupSensors } from './graph/pickupSensors';
import type { NodeGraph } from './graph/types';

/**
 * Persisted factory graph.
 *
 * The graph is user data like the project itself, so it lives in localStorage, survives
 * reloads, and is exported/imported as plain JSON. Loading goes through `parseGraph`, so
 * an older save with node types that no longer exist degrades instead of crashing.
 */
const STORAGE_KEY = 'larp-factory-component-graph-v1';

function load(): NodeGraph {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultComponentGraph();
    const graph = upgradePickupSensors(parseGraph(JSON.parse(raw)));
    return graph.nodes.length ? graph : defaultComponentGraph();
  } catch {
    return defaultComponentGraph();
  }
}

let state: NodeGraph = load();
const past: NodeGraph[] = [];
const future: NodeGraph[] = [];
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
  if (next === state) return;
  past.push(state); if (past.length > 100) past.shift();
  future.length = 0;
  state = next;
  persist();
  emit();
}

export function undoGraph() {
  const previous = past.pop();
  if (!previous) return;
  future.push(state); state = previous; persist(); emit();
}
export function redoGraph() {
  const next = future.pop();
  if (!next) return;
  past.push(state); state = next; persist(); emit();
}

export function graphValue() {
  return state;
}

export function replaceGraph(next: NodeGraph) {
  setGraph(upgradePickupSensors(parseGraph(next)));
}

export function resetGraph() {
  setGraph(defaultComponentGraph());
}

export function useFactoryGraph(): NodeGraph {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    graphValue,
    graphValue,
  );
}
