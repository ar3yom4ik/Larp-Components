/**
 * The built-in node library.
 *
 * Each node owns one section of the factory description: what to produce, how many
 * process cells, which robot, how the line is laid out, how products are stacked, who
 * works there, what is guarded, and finally the output that compiles everything into
 * scene items. Nodes are pure: they receive resolved inputs plus their own parameters
 * and return values for their output ports, so the whole graph is deterministic and
 * testable without a browser.
 */
import { DEFAULT_GEN, FACTORY_RECIPES, generateFactory, validateFactory, type GenOptions, type ProcessStep } from '../../sim/generator';
import { getProduct } from '../../data/products';
import { analyzePrompt } from '../prompt';
import { registerNode } from './registry';
import type {
  IntentPayload, LayoutSpec, PalletSpec, PlantResult, ProcessChain, RobotSpec, SafetySpec, StaffSpec,
} from './types';

const OPTION_KEYS: (keyof GenOptions)[] = [
  'seed', 'style', 'stages', 'cobot', 'rate', 'fences', 'operators', 'staff', 'cabinets', 'recipe',
  'lanes', 'beltSpeed', 'cycleTime', 'gripper', 'cols', 'rows', 'layers', 'product', 'staffTask',
  'machineKind', 'columns', 'cellWorkers', 'cellInputs', 'cellOutputs', 'robotBrand', 'outputProduct',
  'cellMachines', 'processChain',
];

const number = (value: unknown, fallback: number) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
/** True when the user actually set this parameter (as opposed to seeing its default). */
const set = (params: Record<string, unknown>, key: string) => params[key] !== undefined;

/** Only settable keys, so a malformed graph cannot inject arbitrary object keys. */
function cleanConfig(input: unknown): Partial<GenOptions> {
  if (!input || typeof input !== 'object') return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of OPTION_KEYS) {
    if (key in source && source[key] !== undefined) out[key] = source[key];
  }
  return out as Partial<GenOptions>;
}

const MACHINE_OPTIONS = [
  { value: 'auto', label: 'Recipe default' },
  { value: 'cnc', label: 'CNC milling' },
  { value: 'press', label: 'Press' },
  { value: 'weld', label: 'Weld cell' },
  { value: 'packaging', label: 'Case packer' },
  { value: 'paint', label: 'Paint station' },
  { value: 'cutter', label: 'Laser cutter' },
  { value: 'inspection', label: 'Quality inspection' },
  { value: 'assembly', label: 'Assembly station' },
  { value: 'kiln', label: 'Industrial kiln' },
  { value: 'lathe', label: 'Turning lathe' },
  { value: 'grinder', label: 'Surface grinder' },
];

/* ------------------------------------------------------------------ input */

registerNode({
  type: 'input.prompt',
  title: 'Prompt',
  category: 'Input',
  description: 'Natural language (English or Russian). Produces tagged intent: recipe, processes, robot, layout, safety, pallet and rate. Everything it cannot place is reported as a note.',
  inputs: [],
  outputs: [{ key: 'intent', label: 'Intent', type: 'intent' }],
  params: [
    { key: 'text', label: 'Prompt', kind: 'text', default: 'L-shaped metalworking cell, 2 process cells, cobot, vacuum gripper, 8 boxes per minute', help: 'Free text. Tags are extracted with their exact source words.' },
  ],
  summary: (params) => (text(params.text) ? text(params.text).slice(0, 64) : 'Empty prompt'),
  evaluate: ({ params, report }) => {
    const prompt = text(params.text);
    const intent: IntentPayload = analyzePrompt(prompt, { base: DEFAULT_GEN });
    if (!prompt.trim()) report('The prompt node is empty, so it contributes nothing.', 'info');
    if (intent.notes.length) for (const note of intent.notes) report(note, 'warning');
    if (prompt.trim() && intent.confidence < 0.35) report('Only part of the prompt was understood; check the tags before building.', 'warning');
    return { intent };
  },
});

registerNode({
  type: 'input.recipe',
  title: 'Recipe & products',
  category: 'Input',
  description: 'What the plant makes: a preset recipe, or explicit input and output products. The recipe also provides the default machine type.',
  inputs: [],
  outputs: [{ key: 'config', label: 'Config', type: 'config' }],
  params: [
    { key: 'recipe', label: 'Recipe', kind: 'select', default: 'metalworking', options: FACTORY_RECIPES.map((recipe) => ({ value: recipe.id, label: recipe.name })) },
    { key: 'product', label: 'Input product', kind: 'product', default: 'auto' },
    { key: 'outputProduct', label: 'Output product', kind: 'product', default: 'auto' },
  ],
  summary: (params) => {
    const recipe = FACTORY_RECIPES.find((entry) => entry.id === params.recipe) ?? FACTORY_RECIPES[0];
    const input = text(params.product, 'auto');
    const output = text(params.outputProduct, 'auto');
    return `${recipe.name} · ${input === 'auto' ? recipe.input : input} → ${output === 'auto' ? recipe.output : output}`;
  },
  evaluate: ({ params }) => {
    const config: Partial<GenOptions> = {};
    if (set(params, 'recipe')) {
      const recipe = FACTORY_RECIPES.find((entry) => entry.id === params.recipe) ?? FACTORY_RECIPES[0];
      config.recipe = recipe.id;
      config.machineKind = recipe.machine;
    }
    if (set(params, 'product')) config.product = text(params.product, 'auto');
    if (set(params, 'outputProduct')) config.outputProduct = text(params.outputProduct, 'auto');
    return { config };
  },
});

/* ---------------------------------------------------------------- process */

registerNode({
  type: 'process.chain',
  title: 'Process chain',
  category: 'Process',
  description: 'The machining steps between the feeder and the palletizer. A wired intent supplies the steps and their order; the parameters override them when set.',
  inputs: [{ key: 'intent', label: 'Intent', type: 'intent', many: true, help: 'Optional. Uses the process steps found in the prompt.' }],
  outputs: [
    { key: 'cells', label: 'Cells', type: 'cells' },
    { key: 'config', label: 'Config', type: 'config' },
  ],
  params: [
    { key: 'stages', label: 'Cells', kind: 'number', default: 2, min: 0, max: 8 },
    { key: 'operation', label: 'Operation', kind: 'select', default: 'auto', options: MACHINE_OPTIONS, help: 'Force every cell to one machine type, or follow the recipe.' },
    { key: 'worker', label: 'Cell worker', kind: 'select', default: 'auto', options: [{ value: 'auto', label: 'From proposal' }, { value: 'robot', label: 'Robot' }, { value: 'human', label: 'Human' }] },
  ],
  summary: (params) => `${number(params.stages, 2)} cell(s)${text(params.operation) !== 'auto' && params.operation ? ` · ${text(params.operation)}` : ''}`,
  evaluate: (ctx) => {
    const intents = ctx.inputs.intent as IntentPayload[];
    const operation = text(ctx.params.operation, 'auto');
    const worker = text(ctx.params.worker, 'auto');
    const fromPrompt = intents.flatMap((intent) => intent?.chain ?? []);
    // Precedence: a cell count the user typed > the chain the prompt described.
    // With neither, the node contributes nothing so the prompt's own cell count and the
    // recipe's machine type survive downstream instead of being replaced by a guess.
    const explicit = set(ctx.params, 'stages') || operation !== 'auto';
    const count = explicit
      ? Math.max(0, Math.min(8, Math.round(number(ctx.params.stages, DEFAULT_GEN.stages))))
      : fromPrompt.length;

    const steps: ProcessStep[] = [];
    for (let index = 0; index < (explicit || fromPrompt.length ? count : 0); index += 1) {
      const proposal = fromPrompt[index];
      const machine = (operation !== 'auto' ? operation : proposal?.machine ?? 'auto') as GenOptions['machineKind'];
      const previous = index === 0 ? proposal?.input ?? 'auto' : steps[index - 1].output;
      steps.push({
        machine,
        input: proposal?.input ?? previous,
        output: proposal?.output ?? (index === count - 1 ? 'auto' : machine),
        worker: worker === 'auto' ? (proposal?.worker ?? 'robot') : (worker as 'robot' | 'human'),
      });
    }
    if (set(ctx.params, 'stages') && fromPrompt.length && steps.length !== fromPrompt.length) {
      ctx.report(`The prompt described ${fromPrompt.length} process steps but this node asks for ${steps.length}; the first ${Math.min(steps.length, fromPrompt.length)} are used.`, 'warning');
    }
    // With no explicit steps the chain stays silent: the prompt's cell count and the
    // recipe's own machine type then decide, instead of being overwritten by "0".
    const config: Partial<GenOptions> = steps.length ? {
        stages: steps.length,
        cellMachines: steps.map((step) => step.machine),
        cellInputs: steps.map((step) => step.input),
        cellOutputs: steps.map((step) => step.output),
        cellWorkers: steps.map((step) => (step.worker === 'human' ? 'human' : 'robot')),
        processChain: steps,
      } : {};
    return { cells: { steps, fromText: fromPrompt.length > 0 } as ProcessChain, config };
  },
});

registerNode({
  type: 'process.speed',
  title: 'Line speed',
  category: 'Process',
  description: 'Belt speed, machine cycle time and the feed rate. The feed rate decides how often the feeder releases a product.',
  inputs: [],
  outputs: [{ key: 'config', label: 'Config', type: 'config' }],
  params: [
    { key: 'rate', label: 'Feed rate', kind: 'number', default: 12, min: 1, max: 60, step: 1, help: 'Products per minute.' },
    { key: 'beltSpeed', label: 'Belt speed', kind: 'number', default: 0.6, min: -2, max: 2, step: 0.05, unbounded: true, help: 'Metres per second.' },
    { key: 'cycleTime', label: 'Cycle time', kind: 'number', default: 6, min: 1, max: 60, step: 1, help: 'Seconds per machine operation.' },
  ],
  summary: (params) => `${number(params.rate, 12)}/min · ${number(params.beltSpeed, 0.6).toFixed(2)} m/s · ${number(params.cycleTime, 6)} s`,
  evaluate: ({ params, report }) => {
    const config: Partial<GenOptions> = {};
    if (set(params, 'rate')) config.rate = Math.max(1, Math.min(60, Math.round(number(params.rate, 12))));
    if (set(params, 'beltSpeed')) config.beltSpeed = number(params.beltSpeed, 0.6);
    if (set(params, 'cycleTime')) config.cycleTime = Math.max(1, Math.min(60, Math.round(number(params.cycleTime, 6))));
    if (config.rate !== undefined && config.cycleTime !== undefined) {
      const cellCapacity = 60 / config.cycleTime;
      if (config.rate > cellCapacity) report(`A ${config.cycleTime}s cycle allows at most ${cellCapacity.toFixed(1)} products/min per cell; parts will queue on the belt.`, 'warning');
    }
    return { config };
  },
});

/* -------------------------------------------------------------- resources */

registerNode({
  type: 'resources.robot',
  title: 'Robot & tool',
  category: 'Resources',
  description: 'The manipulator in every cell and the gripper it carries.',
  inputs: [],
  outputs: [{ key: 'robot', label: 'Robot', type: 'robot' }],
  params: [
    { key: 'brand', label: 'Brand', kind: 'select', default: 'robot', options: [{ value: 'robot', label: 'Larp industrial' }, { value: 'kuka', label: 'KUKA' }, { value: 'fanuc', label: 'FANUC' }] },
    { key: 'cobot', label: 'Cobot', kind: 'boolean', default: false, help: 'Slower and smaller, but can work without a full safety cage.' },
    { key: 'gripper', label: 'Gripper', kind: 'select', default: 'vacuum', options: [
      { value: 'vacuum', label: 'Vacuum cup' }, { value: 'parallel', label: 'Parallel jaws' },
      { value: 'three-finger', label: 'Three-finger' }, { value: 'magnetic', label: 'Magnetic' }, { value: 'soft', label: 'Soft gripper' },
    ] },
  ],
  summary: (params) => `${bool(params.cobot, false) ? 'Cobot' : text(params.brand, 'robot')} · ${text(params.gripper, 'vacuum')}`,
  evaluate: ({ params }) => {
    const robot: RobotSpec = {};
    if (set(params, 'brand')) robot.brand = text(params.brand, 'robot') as RobotSpec['brand'];
    if (set(params, 'cobot')) robot.cobot = bool(params.cobot, false);
    if (set(params, 'gripper')) robot.gripper = text(params.gripper, 'vacuum') as RobotSpec['gripper'];
    return { robot };
  },
});

registerNode({
  type: 'resources.staff',
  title: 'Staff',
  category: 'Resources',
  description: 'Human operators in the plant. The count is plant-wide, not per line.',
  inputs: [],
  outputs: [{ key: 'staff', label: 'Staff', type: 'staff' }],
  params: [
    { key: 'enabled', label: 'Operators', kind: 'boolean', default: true },
    { key: 'count', label: 'People', kind: 'number', default: 2, min: 0, max: 50 },
    { key: 'task', label: 'Task', kind: 'select', default: 'inspect', options: [
      { value: 'patrol', label: 'Patrol route' }, { value: 'inspect', label: 'Inspect products' },
      { value: 'carry', label: 'Carry products' }, { value: 'replenish', label: 'Replenish feeder' },
    ] },
  ],
  summary: (params) => (bool(params.enabled, true) ? `${number(params.count, 2)} × ${text(params.task, 'inspect')}` : 'Unmanned'),
  evaluate: ({ params }) => {
    const staff: StaffSpec = {};
    if (set(params, 'enabled')) staff.enabled = bool(params.enabled, true);
    if (set(params, 'count')) staff.count = Math.max(0, Math.min(50, Math.round(number(params.count, 2))));
    if (set(params, 'task')) staff.task = text(params.task, 'inspect') as StaffSpec['task'];
    return { staff };
  },
});

registerNode({
  type: 'resources.safety',
  title: 'Safety',
  category: 'Resources',
  description: 'Cell guarding and control cabinets.',
  inputs: [],
  outputs: [{ key: 'safety', label: 'Safety', type: 'safety' }],
  params: [
    { key: 'fences', label: 'Fences', kind: 'boolean', default: true },
    { key: 'cabinets', label: 'Cabinets', kind: 'boolean', default: true },
  ],
  summary: (params) => `${bool(params.fences, true) ? 'Fenced' : 'Open'} · ${bool(params.cabinets, true) ? 'cabinets' : 'no cabinets'}`,
  evaluate: ({ params }) => {
    const safety: SafetySpec = {};
    if (set(params, 'fences')) safety.fences = bool(params.fences, true);
    if (set(params, 'cabinets')) safety.cabinets = bool(params.cabinets, true);
    return { safety };
  },
});

/* ----------------------------------------------------------------- layout */

registerNode({
  type: 'layout.line',
  title: 'Line layout',
  category: 'Layout',
  description: 'Line shape, parallel lines, parallel columns and the seed that varies cell dimensions.',
  inputs: [],
  outputs: [{ key: 'layout', label: 'Layout', type: 'layout' }],
  params: [
    { key: 'style', label: 'Shape', kind: 'select', default: 'L', options: [
      { value: 'straight', label: 'Straight' }, { value: 'L', label: 'L-shape' }, { value: 'U', label: 'U-shape' }, { value: 'S', label: 'S-curve' },
    ] },
    { key: 'lanes', label: 'Parallel lines', kind: 'number', default: 1, min: 1, max: 8 },
    { key: 'columns', label: 'Columns', kind: 'number', default: 1, min: 1, max: 4 },
    { key: 'seed', label: 'Seed', kind: 'seed', default: 7, min: 0, max: 9999 },
  ],
  summary: (params) => `${text(params.style, 'L')} · ${number(params.lanes, 1)}×${number(params.columns, 1)} · seed ${number(params.seed, 7)}`,
  evaluate: ({ params }) => {
    const layout: LayoutSpec = {};
    if (set(params, 'style')) layout.style = text(params.style, 'L') as LayoutSpec['style'];
    if (set(params, 'lanes')) layout.lanes = Math.max(1, Math.min(8, Math.round(number(params.lanes, 1))));
    if (set(params, 'columns')) layout.columns = Math.max(1, Math.min(4, Math.round(number(params.columns, 1))));
    if (set(params, 'seed')) layout.seed = Math.max(0, Math.round(number(params.seed, 7)));
    return { layout };
  },
});

registerNode({
  type: 'layout.pallet',
  title: 'Pallet pattern',
  category: 'Layout',
  description: 'How the last robot stacks finished products.',
  inputs: [],
  outputs: [{ key: 'pallet', label: 'Pallet', type: 'pallet' }],
  params: [
    { key: 'cols', label: 'Columns', kind: 'number', default: 3, min: 1, max: 6 },
    { key: 'rows', label: 'Rows', kind: 'number', default: 2, min: 1, max: 6 },
    { key: 'layers', label: 'Layers', kind: 'number', default: 4, min: 1, max: 8 },
  ],
  summary: (params) => `${number(params.cols, 3)} × ${number(params.rows, 2)} × ${number(params.layers, 4)}`,
  evaluate: ({ params }) => {
    const pallet: PalletSpec = {};
    if (set(params, 'cols')) pallet.cols = Math.max(1, Math.min(6, Math.round(number(params.cols, 3))));
    if (set(params, 'rows')) pallet.rows = Math.max(1, Math.min(6, Math.round(number(params.rows, 2))));
    if (set(params, 'layers')) pallet.layers = Math.max(1, Math.min(8, Math.round(number(params.layers, 4))));
    return { pallet };
  },
});

/* ----------------------------------------------------------------- output */

registerNode({
  type: 'output.factory',
  title: 'Factory output',
  category: 'Output',
  description: 'Compiles every wired section into a factory. Connections further left win over connections further right; explicit nodes win over the prompt.',
  inputs: [
    { key: 'intent', label: 'Intent', type: 'intent', many: true },
    { key: 'config', label: 'Config', type: 'config', many: true },
    { key: 'cells', label: 'Cells', type: 'cells', many: true },
    { key: 'robot', label: 'Robot', type: 'robot', many: true },
    { key: 'layout', label: 'Layout', type: 'layout', many: true },
    { key: 'pallet', label: 'Pallet', type: 'pallet', many: true },
    { key: 'staff', label: 'Staff', type: 'staff', many: true },
    { key: 'safety', label: 'Safety', type: 'safety', many: true },
  ],
  outputs: [
    { key: 'plant', label: 'Factory', type: 'plant' },
    { key: 'items', label: 'Scene items', type: 'items' },
  ],
  params: [],
  summary: () => 'Compiles the graph',
  evaluate: (ctx) => {
    const { inputs, graph, report } = ctx;
    let options: GenOptions = { ...DEFAULT_GEN };

    // 1. Prompt intents first: they describe the desired result, not the layout.
    const intents = inputs.intent as IntentPayload[];
    for (const intent of intents) {
      if (!intent) continue;
      // A prompt never moves the pallet pattern unless it defined one.
      const patch = { ...intent.patch };
      if (!('cols' in patch) && !('rows' in patch) && !('layers' in patch)) {
        delete patch.cols; delete patch.rows; delete patch.layers;
      }
      options = { ...options, ...cleanConfig(patch) };
    }

    // 2. Explicit config nodes.
    for (const config of inputs.config as Partial<GenOptions>[]) options = { ...options, ...cleanConfig(config) };

    // 3. Typed sections.
    const robot = (inputs.robot as RobotSpec[]).at(-1);
    if (robot) {
      if (robot.cobot !== undefined) options = { ...options, cobot: robot.cobot };
      if (robot.brand !== undefined) options = { ...options, robotBrand: robot.brand };
      if (robot.gripper !== undefined) options = { ...options, gripper: robot.gripper };
    }
    const layout = (inputs.layout as LayoutSpec[]).at(-1);
    if (layout) {
      for (const key of ['style', 'lanes', 'columns', 'seed'] as const) {
        if (layout[key] !== undefined) options = { ...options, [key]: layout[key] } as GenOptions;
      }
    }
    const pallet = (inputs.pallet as PalletSpec[]).at(-1);
    if (pallet) {
      for (const key of ['cols', 'rows', 'layers'] as const) {
        if (pallet[key] !== undefined) options = { ...options, [key]: pallet[key] } as GenOptions;
      }
    }
    const staff = (inputs.staff as StaffSpec[]).at(-1);
    if (staff) {
      if (staff.task !== undefined) options = { ...options, staffTask: staff.task };
      if (staff.enabled !== undefined) options = { ...options, operators: staff.enabled };
      if (staff.count !== undefined) options = { ...options, staff: staff.enabled === false ? 0 : staff.count };
      if (staff.enabled === false) options = { ...options, staff: 0 };
    }
    const safety = (inputs.safety as SafetySpec[]).at(-1);
    if (safety) {
      if (safety.fences !== undefined) options = { ...options, fences: safety.fences };
      if (safety.cabinets !== undefined) options = { ...options, cabinets: safety.cabinets };
    }
    const chain = (inputs.cells as ProcessChain[]).at(-1);
    if (chain?.steps.length) {
      options = {
        ...options,
        stages: chain.steps.length,
        processChain: chain.steps,
        cellMachines: chain.steps.map((step) => step.machine),
        cellInputs: chain.steps.map((step) => step.input),
        cellOutputs: chain.steps.map((step) => step.output),
        cellWorkers: chain.steps.map((step) => (step.worker === 'human' ? 'human' : 'robot')),
      };
    }

    // 4. Product coherence: a magnetic tool cannot handle a plastic part.
    if (options.gripper === 'magnetic') {
      const recipe = FACTORY_RECIPES.find((entry) => entry.id === options.recipe) ?? FACTORY_RECIPES[0];
      const input = options.product === 'auto' ? recipe.input : options.product;
      const output = options.outputProduct === 'auto' ? recipe.output : options.outputProduct;
      if (!getProduct(input).magnetic || !getProduct(output).magnetic) {
        options = { ...options, gripper: 'vacuum' };
        report(`The magnetic gripper was replaced with vacuum: "${getProduct(input).name}" is not magnetic.`, 'warning');
      }
    }

    // 5. Nothing to build is an error worth reporting once, not per node.
    if (!graph.nodes.some((node) => node.type === 'input.recipe' || node.type === 'input.prompt')) {
      report('No recipe or prompt node is connected, so the factory uses the default metalworking recipe.', 'info');
    }

    const items = generateFactory(options);
    const warnings = validateFactory(items);
    for (const warning of warnings) report(warning, 'warning');

    const recipe = FACTORY_RECIPES.find((entry) => entry.id === options.recipe) ?? FACTORY_RECIPES[0];
    const summary = `${recipe.name} · ${options.stages} cell(s) · ${options.lanes}×${options.columns} lines · ${options.rate}/min · ${items.length} components`;
    const plant: PlantResult = { options, items, summary, warnings };
    return { plant, items };
  },
});
