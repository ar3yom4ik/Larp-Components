import assert from 'node:assert/strict';
import { compileComponentGraph } from '../src/gen/graph/componentCompile';
import { connect, makeNode, parseGraph, serializeGraph } from '../src/gen/graph/graph';
import type { GraphNode, NodeGraph } from '../src/gen/graph/types';
import { Engine } from '../src/sim/engine';
import { serializeProject, parseProject } from '../src/utils/project';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';
import { samplePath } from '../src/sim/spline';
import { buildConveyorGeometry } from '../src/components/ModelKit';

const products = ['carton', 'billet', 'gear', 'cookie'];
function makeMerge(style: 'side' | 'multi-head', count: number, nested = false) {
  const feeders = products.slice(0, count).map(product => makeNode('part.feeder', 0, 0, { product, interval: 2 }));
  const inputs = feeders.map(() => makeNode('part.conveyor', 0, 0, { speed: 0.6 }));
  const junction = makeNode('part.conveyor', 0, 0, { mergeStyle: style, length: 8, speed: 0.6 });
  const other = nested ? makeNode('part.conveyor', 0, 0, { mergeStyle: style, length: 8, speed: 0.6 }) : null;
  const robot = makeNode('part.robot', 0, 0), pallet = makeNode('part.pallet', 0, 0);
  let graph: NodeGraph = { version: 1, nodes: [...feeders, ...inputs, junction, ...(other ? [other] : []), robot, pallet], links: [] };
  const wire = (from: GraphNode, to: GraphNode) => {
    const result = connect(graph, { node: from.id, port: 'out' }, { node: to.id, port: 'in' });
    assert.ok(result.ok, result.error); graph = result.graph;
  };
  feeders.forEach((feeder, i) => wire(feeder, inputs[i]));
  inputs.forEach((input, i) => wire(input, nested && i === count - 1 ? other! : junction));
  if (other) wire(junction, other);
  wire(other ?? junction, robot); wire(robot, pallet);
  const restored = parseGraph(serializeGraph(graph));
  assert.equal(restored.links.length, graph.links.length, 'multi-input wires survive a graph round trip');
  const result = compileComponentGraph(restored);
  assert.ok(result.plant, JSON.stringify(result.diagnostics));
  const target = result.plant.items.filter(item => typeof item.props.mergeInputs === 'number').at(-1)!;
  return { graph, result, target };
}

// Heavily loaded inputs include unequal carton/billet sizes. The old arbitration
// starved the larger part indefinitely; every head must make fair progress.
for (const style of ['multi-head', 'side'] as const) for (const count of [2, 3, 4]) {
  const { result, target } = makeMerge(style, count);
  assert.equal(target.props.mergeStyle, style);
  assert.equal(result.plant!.items.filter(item => item.props.mergeTargetId === target.id).length, count);
  const disk = serializeProject({ projectName: 'Merge', layoutName: style, activeLayoutId: null, items: result.plant!.items });
  const items = parseProject(readProjectArchive(createProjectArchive(disk))).items;
  const e = new Engine(); e.sync(items); e.setRunning(true);
  const delivered = Object.fromEntries(products.slice(0, count).map(product => [product, 0]));
  for (let frame = 0; frame < 100 * 60; frame++) {
    if (frame === 35 * 60) e.conveyors.get(target.id)!.active = false;
    if (frame === 40 * 60) e.conveyors.get(target.id)!.active = true;
    e.step(1 / 60);
    // A downstream collector frees space so the test exercises the junction
    // under continuous load rather than filling a single pallet forever.
    for (const box of e.boxes) if (box.state === 'free' && box.convId === target.id && box.convS > 2.8) { delivered[box.productId]++; box.state = 'dead'; }
  }
  for (const product of products.slice(0, count)) assert.ok(delivered[product] >= 3, `${style}, ${count} heads starved ${product}: ${JSON.stringify(delivered)}`);
  assert.equal(e.stats.lost, 0, `${style} loses products`);
  const routes = (e as unknown as {mergeRoutes: Map<string, unknown>}).mergeRoutes;
  assert.equal(routes.size, count);
  e.sync(items.map(item => item.id === target.id ? { ...item, position: [item.position[0], item.position[1] + 2, item.position[2]] } : item));
  assert.equal(routes.size, 0, 'moving the target to another height disconnects physical merge routes');
}

// Nested merges are also actual, independent material queues.
for (const style of ['multi-head', 'side'] as const) {
  const {result, target} = makeMerge(style, 3, true);
  const e = new Engine(); e.sync(result.plant!.items); e.setRunning(true);
  const seen = new Set<string>();
  for (let frame = 0; frame < 160 * 60; frame++) {
    e.step(1 / 60);
    for (const box of e.boxes) if (box.state === 'free' && box.convId === target.id && box.convS > 2.8) { seen.add(box.productId); box.state = 'dead'; }
  }
  assert.deepEqual([...seen].sort(), products.slice(0, 3).sort(), `nested ${style} must carry every input`);
  assert.equal(e.stats.lost, 0);
}

// Side-entry and head-end models open their rails at the actual junction.
{
  const path = samplePath([[0, 0], [4, 0]], 0.1);
  const closed = buildConveyorGeometry(path, false);
  const open = buildConveyorGeometry(path, false, [{ along: 2, side: 1, radius: 0.6 }]);
  assert.ok(open.steel!.getAttribute('position').count < closed.steel!.getAttribute('position').count, 'side rail has a visible opening');
  for (const g of [closed, open]) { g.belt.dispose(); g.steel?.dispose(); g.dark?.dispose(); g.warn?.dispose(); }
}
console.log('conveyor merges: fair 2–4 heads, nested lines, geometry, persistence, and stopped belts OK');
