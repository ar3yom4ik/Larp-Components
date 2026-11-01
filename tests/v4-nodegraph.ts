// Browser-free checks for the node-based AI Factory generator.
//
// Covers the graph engine (ordering, wiring rules, validation, serialisation), the node
// registry contract, the tagging/prompt engine (bilingual, negation, coherence) and the
// equivalence of a compiled graph with the classic option path.
import assert from 'node:assert/strict';
import '../src/gen/graph/nodes';
import { allNodeDefs, getNodeDef, nodesByCategory } from '../src/gen/graph/registry';
import {
  addNode, connect, defaultGraph, disconnect, emptyGraph, makeNode, parseGraph,
  removeNode, serializeGraph, setParam, topoSort, validateGraph,
} from '../src/gen/graph/graph';
import { compileGraph } from '../src/gen/graph/compile';
import { analyzePrompt } from '../src/gen/prompt';
import { extractTags, TAG_RULES } from '../src/gen/tags';
import { DEFAULT_GEN, generateFactory, parsePrompt } from '../src/sim/generator';
import type { NodeGraph } from '../src/gen/graph/types';

/* ----- registry contract --------------------------------------------------------- */
const defs = allNodeDefs();
assert.ok(defs.length >= 9, 'the library has the full section set');
assert.equal(new Set(defs.map((def) => def.type)).size, defs.length, 'node types are unique');
for (const def of defs) {
  assert.ok(def.type.includes('.'), `${def.type} follows the category.type naming convention`);
  assert.ok(def.title && def.description, `${def.type} documents itself`);
  assert.equal(typeof def.evaluate, 'function', `${def.type} has an evaluator`);
  for (const port of [...def.inputs, ...def.outputs]) {
    assert.ok(port.type && port.label, `${def.type}.${port.key} has a type and label`);
  }
  // Every parameter's default must match its declared kind, so the inspector can't render garbage.
  for (const param of def.params) {
    if (param.kind === 'number' || param.kind === 'seed') assert.equal(typeof param.default, 'number', `${def.type}.${param.key} numeric`);
    if (param.kind === 'boolean') assert.equal(typeof param.default, 'boolean', `${def.type}.${param.key} boolean`);
    if (param.kind === 'select') assert.ok((param.options ?? []).some((option) => option.value === param.default), `${def.type}.${param.key} default is an option`);
  }
}
assert.deepEqual(nodesByCategory().map((group) => group.category), ['Input', 'Process', 'Resources', 'Layout', 'Output']);

/* ----- the starter graph builds ------------------------------------------------ */
const starter = defaultGraph();
assert.equal(validateGraph(starter).filter((entry) => entry.severity === 'error').length, 0, 'the starter graph is valid');
const compiled = compileGraph(starter);
assert.ok(compiled.plant, 'the starter graph produces a factory');
const plant = compiled.plant!;
assert.ok(plant.items.length > 5);
assert.ok(plant.items.some((item) => !!item.program), 'robots are programmed');
assert.ok(compiled.ms >= 0);

/**
 * Scene items carry freshly generated ids, so "the same factory" means the same kinds,
 * names, transforms and properties — not identical id strings.
 */
const fingerprint = (items: typeof plant.items) =>
  JSON.stringify(items.map((item) => ({ kind: item.kind, name: item.name, position: item.position, rotation: item.rotation, props: item.props, program: item.program, points: item.points })))
    // Generated item ids are unique per build, so they are normalised away; the wiring
    // they express (which belt feeds which robot) is still compared through program/script.
    .replace(/item-[a-z0-9]+-\d+/g, 'item-id');

// Determinism: the same graph twice must give the same factory.
const again = compileGraph(defaultGraph());
assert.deepEqual(fingerprint(again.plant!.items), fingerprint(plant.items), 'compilation is deterministic');
assert.deepEqual(again.plant!.options, plant.options);

// Equivalence with the classic path: compiling the graph must be the same as calling
// generateFactory with the options the graph produced.
assert.deepEqual(fingerprint(generateFactory(plant.options)), fingerprint(plant.items), 'graph output equals the option-based generator');

/* ----- wiring rules ------------------------------------------------------------- */
const output = starter.nodes.find((node) => node.type === 'output.factory')!;
const prompt = starter.nodes.find((node) => node.type === 'input.prompt')!;
const chain = starter.nodes.find((node) => node.type === 'process.chain')!;
const recipe = starter.nodes.find((node) => node.type === 'input.recipe')!;

assert.equal(connect(starter, { node: prompt.id, port: 'intent' }, { node: prompt.id, port: 'intent' }).ok, false, 'no self wires');
const mismatch = connect(starter, { node: prompt.id, port: 'intent' }, { node: output.id, port: 'robot' });
assert.equal(mismatch.ok, false);
assert.match(mismatch.error ?? '', /Cannot connect/);
assert.equal(connect(starter, { node: output.id, port: 'plant' }, { node: chain.id, port: 'intent' }).ok, false, 'output type mismatch');

// A single-valued input keeps only the newest wire; a `many` input accumulates.
const single = starter.links.filter((link) => link.to.node === chain.id && link.to.port === 'intent').length;
assert.equal(single, 1);
const extraRecipe = addNode(starter, makeNode('input.recipe', 0, 0));
const twoConfigs = connect(extraRecipe, { node: recipe.id, port: 'config' }, { node: output.id, port: 'config' });
assert.ok(twoConfigs.ok, 'config inputs accept several wires');
const configWires = twoConfigs.graph.links.filter((link) => link.to.node === output.id && link.to.port === 'config').length;
assert.ok(configWires >= 2);

// Cutting a wire removes exactly one link.
const cut = disconnect(starter, starter.links[0].id);
assert.equal(cut.links.length, starter.links.length - 1);

// Removing a node removes its wires too.
const removed = removeNode(starter, chain.id);
assert.ok(!removed.nodes.some((node) => node.id === chain.id));
assert.ok(!removed.links.some((link) => link.from.node === chain.id || link.to.node === chain.id));

/* ----- cycles ------------------------------------------------------------------- */
const loop = [...starter.links];
const cyclic: NodeGraph = { ...starter, links: [...loop, { id: 'loop1', from: { node: output.id, port: 'plant' }, to: { node: chain.id, port: 'intent' } }] };
assert.ok(topoSort(cyclic).cycle.length > 0, 'a cycle is detected');
assert.ok(validateGraph(cyclic).some((entry) => entry.id === 'cycle'));
assert.equal(compileGraph(cyclic).plant, null, 'a cyclic graph refuses to compile');

/* ----- topological order -------------------------------------------------------- */
const order = topoSort(starter).order.map((node) => node.id);
const position = (id: string) => order.indexOf(id);
for (const link of starter.links) assert.ok(position(link.from.node) < position(link.to.node), 'sources come before consumers');

/* ----- validation and sanitisation ---------------------------------------------- */
const broken: NodeGraph = { ...emptyGraph(), nodes: [makeNode('output.factory', 0, 0), makeNode('does.not.exist', 10, 10)] };
const brokenDiagnostics = validateGraph(broken);
assert.ok(brokenDiagnostics.some((entry) => entry.message.includes('Unknown node type')));
assert.ok(brokenDiagnostics.some((entry) => entry.id === 'no-output') === false, 'the output node exists here');

const restored = parseGraph({
  version: 1,
  nodes: [
    { id: 'a', type: 'input.prompt', x: 1e9, y: -1e9, params: { text: 'bakery', evil: '<script>' } },
    { id: 'b', type: 'nope', x: 0, y: 0, params: {} },
    { id: 'c', type: 'output.factory', x: 200, y: 0, params: {} },
  ],
  links: [
    { id: 'l1', from: { node: 'a', port: 'intent' }, to: { node: 'c', port: 'intent' } },
    { id: 'l2', from: { node: 'b', port: 'out' }, to: { node: 'c', port: 'robot' } },
    { id: 'l3', from: { node: 'a', port: 'intent' }, to: { node: 'missing', port: 'intent' } },
  ],
} as unknown as NodeGraph);
assert.equal(restored.nodes.length, 2, 'unknown node types are dropped');
assert.ok(!('evil' in restored.nodes[0].params), 'unknown parameters are dropped');
assert.ok(Math.abs(restored.nodes[0].x) <= 1000000, 'coordinates are clamped');
assert.equal(restored.links.length, 1, 'wires to missing or invalid nodes are dropped');
assert.equal(parseGraph(null).nodes.length, defaultGraph().nodes.length, 'a corrupt save falls back to the starter graph');

/* ----- every node type evaluates on its own -------------------------------------- */
for (const def of defs) {
  const graph: NodeGraph = { version: 1, nodes: [makeNode(def.type, 0, 0), makeNode('output.factory', 400, 0)], links: [] };
  const result = compileGraph(graph);
  assert.ok(!result.diagnostics.some((entry) => entry.severity === 'error' && entry.nodeId === graph.nodes[0].id && entry.message.includes('failed')), `${def.type} evaluates`);
}

/* ----- tagging engine ----------------------------------------------------------- */
const en = extractTags('l-shaped metalworking cell with a cobot and no fences, 12 boxes per minute');
assert.deepEqual(en.map((tag) => tag.id), ['style:L', 'recipe:metalworking', 'robot:cobot', 'safety:no-fences']);
assert.ok(en.every((tag) => tag.negated === (tag.id === 'safety:no-fences') || !tag.negated));

// Russian inflections resolve through stems.
const ru = extractTags('П-образная пекарня с коботами и без ограждений');
assert.deepEqual(ru.map((tag) => tag.id), ['style:U', 'recipe:bakery', 'robot:cobot', 'safety:no-fences']);

// Overlapping terms of different kinds are both kept; same-kind overlaps are not.
const kiln = extractTags('brick kiln');
assert.ok(kiln.some((tag) => tag.id === 'recipe:brick'));
assert.ok(kiln.some((tag) => tag.id === 'process:kiln'));
assert.equal(new Set(kiln.map((tag) => tag.id)).size, kiln.length);

// Every rule must be reachable by at least one of its terms.
for (const rule of TAG_RULES) {
  const text = rule.terms[0].replace('*', 'ов').toLowerCase();
  assert.ok(extractTags(text).some((tag) => tag.id === rule.id), `${rule.id} matches its own term`);
}

/* ----- prompt intent and coherence ---------------------------------------------- */
const intent = analyzePrompt('brick factory with a kiln and 3x2x4 pallet');
assert.equal(intent.patch.recipe, 'brick');
assert.equal(intent.patch.product, 'clay', 'a kiln implies clay in / brick out');
assert.equal(intent.patch.outputProduct, 'brick');
assert.deepEqual([intent.patch.cols, intent.patch.rows, intent.patch.layers], [3, 2, 4]);

const magnetic = analyzePrompt('cobot line with a magnetic gripper making cookies');
assert.equal(magnetic.patch.gripper, 'vacuum', 'a magnetic tool cannot pick dough');
assert.ok(magnetic.notes.some((note) => note.includes('not magnetic')));

const contradictory = analyzePrompt('cobot and industrial robots, fenced, without fences');
assert.ok(contradictory.notes.length > 0, 'contradictions are reported instead of silently resolved');

const stages = analyzePrompt('L-shaped line with 3 process cells');
assert.equal(stages.patch.stages, 3);
assert.equal(stages.patch.style, 'L');

/* ----- precedence: explicit nodes beat the prompt, defaults do not --------------- */
function buildWithPrompt(text: string, tweak?: (graph: NodeGraph) => NodeGraph) {
  let graph = defaultGraph();
  const promptNode = graph.nodes.find((node) => node.type === 'input.prompt')!;
  graph = setParam(graph, promptNode.id, 'text', text);
  if (tweak) graph = tweak(graph);
  const result = compileGraph(graph);
  assert.ok(result.plant, 'the tweaked graph still builds');
  return result.plant!;
}

const promptDriven = buildWithPrompt('U-shaped bakery with 2 cells, 12 boxes per minute and no fences');
assert.equal(promptDriven.options.recipe, 'bakery');
assert.equal(promptDriven.options.style, 'U');
assert.equal(promptDriven.options.rate, 12);
assert.equal(promptDriven.options.fences, false);
assert.equal(promptDriven.options.stages, 2);

const edited = buildWithPrompt('U-shaped bakery with 2 cells', (graph) => {
  const robot = graph.nodes.find((node) => node.type === 'resources.robot')!;
  return setParam(graph, robot.id, 'gripper', 'parallel');
});
assert.equal(edited.options.gripper, 'parallel', 'an explicit node value overrides the prompt');
assert.equal(edited.options.recipe, 'bakery', 'untouched nodes leave the prompt alone');
assert.equal(edited.options.style, 'U');

// A node that was never touched must not override the prompt with its default.
assert.equal(promptDriven.options.cobot, false, 'the untouched robot node does not force a cobot');
const cobotPrompt = buildWithPrompt('metalworking cell with a cobot');
assert.equal(cobotPrompt.options.cobot, true);

/* ----- legacy parser stays compatible with the graph engine ---------------------- */
const legacy = parsePrompt('П-образная пекарня с 2 ячейками, коботами и 8 коробок в минуту', DEFAULT_GEN);
assert.equal(legacy.recipe, 'bakery');
assert.equal(legacy.style, 'U');
assert.equal(legacy.cobot, true);
const legacyIntent = analyzePrompt('П-образная пекарня с 2 ячейками, коботами и 8 коробок в минуту');
assert.equal(legacyIntent.patch.recipe, legacy.recipe, 'both parsers agree on the recipe');
assert.equal(legacyIntent.patch.style, legacy.style, 'both parsers agree on the shape');
assert.equal(legacyIntent.patch.cobot, legacy.cobot, 'both parsers agree on the robot');
assert.equal(legacyIntent.patch.rate, legacy.rate, 'both parsers agree on the rate');

/* ----- serialisation round-trip -------------------------------------------------- */
const roundTrip = parseGraph(serializeGraph(starter));
assert.equal(roundTrip.nodes.length, starter.nodes.length);
assert.equal(roundTrip.links.length, starter.links.length);
assert.deepEqual(fingerprint(compileGraph(roundTrip).plant!.items), fingerprint(plant.items), 'a saved and reloaded graph builds the same factory');

// Sparse parameters survive: unset stays unset so the prompt keeps control.
const sparse = roundTrip.nodes.find((node) => node.type === 'resources.robot')!;
assert.deepEqual(sparse.params, {});

// A node's own definition is available for the inspector.
assert.ok(getNodeDef('input.prompt'));

console.log('node graph: registry, ordering, wiring, validation, tags, prompt coherence, precedence and round-trip OK');
