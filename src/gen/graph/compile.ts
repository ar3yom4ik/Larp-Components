/**
 * Graph evaluation.
 *
 * Evaluation is pull-based like Blueprint data pins but computed once per run: nodes are
 * visited in topological order, each node receives the values on its incoming wires and
 * its outputs are cached for every downstream node. Because the order is topological,
 * a node can never read a value that has not been computed yet, and a cycle is reported
 * as a diagnostic instead of overflowing the stack.
 */
import { getNodeDef } from './registry';
import { topoSort, validateGraph } from './graph';
import type { Diagnostic, EvalContext, NodeGraph, PlantResult } from './types';

export interface CompileResult {
  /** Options and scene items, when the graph produced a factory. */
  plant: PlantResult | null;
  diagnostics: Diagnostic[];
  /** Outputs per node, useful for previews and debugging. */
  results: Map<string, Record<string, unknown>>;
  /** Milliseconds spent evaluating, shown in the editor. */
  ms: number;
}

export function compileGraph(graph: NodeGraph): CompileResult {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const diagnostics = validateGraph(graph);
  if (diagnostics.some((entry) => entry.severity === 'error')) {
    return { plant: null, diagnostics, results: new Map(), ms: 0 };
  }

  const { order, cycle } = topoSort(graph);
  if (cycle.length) {
    return { plant: null, diagnostics, results: new Map(), ms: 0 };
  }

  const results = new Map<string, Record<string, unknown>>();
  const nodeDiagnostics = new Map<string, Diagnostic[]>();

  const report = (nodeId: string) => (message: string, severity: Diagnostic['severity'] = 'warning') => {
    const list = nodeDiagnostics.get(nodeId) ?? [];
    // Keep the list short: repeated warnings from one node add noise, not information.
    if (list.length >= 6 || list.some((entry) => entry.message === message)) return;
    list.push({ id: `${nodeId}:${list.length}`, severity, message, nodeId });
    nodeDiagnostics.set(nodeId, list);
  };

  for (const node of order) {
    const def = getNodeDef(node.type);
    if (!def) continue;
    const inputs: Record<string, unknown[]> = {};
    for (const port of def.inputs) {
      inputs[port.key] = graph.links
        .filter((entry) => entry.to.node === node.id && entry.to.port === port.key)
        .map((entry) => results.get(entry.from.node)?.[entry.from.port])
        .filter((value) => value !== undefined);
    }
    const context: EvalContext = { node, params: node.params, inputs, graph, results, report: report(node.id) };
    try {
      results.set(node.id, def.evaluate(context) ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report(node.id)(`This node failed to evaluate: ${message}`, 'error');
      results.set(node.id, {});
    }
  }

  for (const [, list] of nodeDiagnostics) diagnostics.push(...list);

  const outputNode = order.find((node) => node.type === 'output.factory');
  const plant = (outputNode ? (results.get(outputNode.id)?.plant as PlantResult | undefined) : undefined) ?? null;
  if (!plant) diagnostics.push({ id: 'no-plant', severity: 'error', message: 'The output node did not produce a factory. Connect a recipe or prompt to it.' });

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { plant, diagnostics, results, ms: Math.round((end - started) * 10) / 10 };
}

/** Severity counts for the editor badge. */
export function countDiagnostics(diagnostics: Diagnostic[]) {
  return diagnostics.reduce(
    (counts, entry) => ({ ...counts, [entry.severity]: counts[entry.severity] + 1 }),
    { error: 0, warning: 0, info: 0 } as Record<Diagnostic['severity'], number>,
  );
}
