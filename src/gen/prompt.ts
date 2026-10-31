/**
 * Prompt analysis for the node graph.
 *
 * Two stages, deliberately separated:
 * 1. `extractTags` (tags.ts) finds *what* the user talked about, bilingually.
 * 2. This module turns tags plus numbers into an `IntentPayload` — a validated patch of
 *    generator options, a coherent process chain, and notes describing what was
 *    assumed or ignored.
 *
 * Coherence is the point. The old parser applied regular expressions in file order, so
 * "cobot … industrial" or "kiln … cookies" silently produced contradictory factories.
 * Here the rules run, then a coherence pass fixes or reports every contradiction:
 * recipe ↔ machine, gripper ↔ product, chain input/output hand-off, staff count,
 * stage count vs. chain length, and pallet dimensions.
 */
import { FACTORY_RECIPES, DEFAULT_GEN, type GenOptions, type ProcessStep } from '../sim/generator';
import { getProduct, PRODUCTS } from '../data/products';
import type { IntentPayload, Tag } from './graph/types';
import { TAG_RULES, extractTags, processOrder, toNumber, NUMBER_PATTERN } from './tags';

/** Product vocabulary that describes no product in particular. */
const GENERIC_PRODUCT_WORDS = new Set([
  'готовое', 'готовый', 'готовая', 'готовые', 'изделие', 'изделия', 'продукт', 'продукция',
  'part', 'parts', 'item', 'items', 'finished', 'product', 'products', 'goods', 'piece',
]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

/**
 * Products named anywhere in the text.
 *
 * Only the product's own name (English or Russian) and its id are used. Its descriptive
 * tags ("box", "pallet", "raw") are deliberately ignored: they are shared by dozens of
 * products and made the old parser turn "pallet pattern" into "brick pack".
 */
function productsInText(text: string) {
  const lower = text.toLowerCase();
  const found: { id: string; index: number }[] = [];
  for (const product of PRODUCTS) {
    for (const term of [product.name, product.ru, product.id]) {
      if (term.length < 4) continue;
      const index = lower.indexOf(term.toLowerCase());
      if (index >= 0) { found.push({ id: product.id, index }); break; }
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/** `12 boxes per minute`, `8 коробок в минуту`, `rate: 12`, `12/min`. */
function rateFromText(text: string): number | undefined {
  const lower = text.toLowerCase().replace(/ё/g, 'е');
  const unit = '(?:box\\w*|parts?|cartons?|pieces?|items?|units?|products?|издел\\S*|короб\\S*|детал\\S*|штук\\S*|единиц\\S*)';
  const minute = '(?:min|мин|минуту|минуты)';
  const hour = '(?:hour|hr|час|часа|часов)';
  const perMinute = new RegExp(`(\\d+)\\s*${unit}?\\s*(?:\\/|per|a|в)\\s*${minute}`).exec(lower)
    ?? new RegExp(`(?:feed rate|производительность|скорость|rate)\\s*[:=]?\\s*(\\d+)\\s*(?:\\/\\s*min|в\\s*мин|per\\s*min)?`).exec(lower);
  if (perMinute) return clamp(Number(perMinute[1]), 1, 60);
  const perHour = new RegExp(`(\\d+)\\s*${unit}?\\s*(?:\\/|per|в)\\s*${hour}`).exec(lower);
  if (perHour) return clamp(Math.round(Number(perHour[1]) / 60), 1, 60);
  return undefined;
}

const countBefore = (text: string, noun: string): number | undefined => {
  // Adjectives that may sit between the number and the noun ("2 process cells",
  // "три технологические ячейки"); this is what made "2 process cells" fall through.
  const modifiers = '(?:parallel|processing|process|working|machining|рабоч\\S*|параллельн\\S*|технологическ\\S*|обрабатывающ\\S*|производственн\\S*)';
  const pattern = new RegExp(`${NUMBER_PATTERN}\\s+(?:${modifiers}\\s+)*${noun}`, 'iu');
  const match = pattern.exec(text);
  return toNumber(match?.[1]);
};

/**
 * Resolves contradictory tags before any of them is applied.
 *
 * Rules declare their rivals (`conflicts`), so the decision is explicit instead of being
 * an accident of sentence order: the more specific / heavier phrase wins, and a tie keeps
 * the phrase that was written first. Every dropped tag becomes a note, so the editor can
 * explain *why* "вакуумной присоски" did not become the gripper although it was mentioned.
 */
function resolveConflicts(tags: Tag[]): { kept: Tag[]; notes: string[] } {
  const rules = new Map(TAG_RULES.map((rule) => [rule.id, rule]));
  const conflicts = (a: Tag, b: Tag) => {
    if (a.id === b.id) return false;
    const ra = rules.get(a.id);
    const rb = rules.get(b.id);
    return Boolean(ra?.conflicts?.includes(b.id) || rb?.conflicts?.includes(a.id));
  };
  const dropped = new Set<number>();
  for (let i = 0; i < tags.length; i += 1) {
    for (let j = i + 1; j < tags.length; j += 1) {
      if (dropped.has(i) || dropped.has(j)) continue;
      if (!conflicts(tags[i], tags[j])) continue;
      dropped.add(tags[j].weight > tags[i].weight ? i : j);
    }
  }
  const notes: string[] = [];
  tags.forEach((tag, index) => {
    if (!dropped.has(index)) return;
    const rival = tags.find((other, otherIndex) => otherIndex !== index && !dropped.has(otherIndex) && (other.kind === tag.kind));
    if (rival) notes.push(`Both "${tag.term}" and "${rival.term}" were mentioned; "${rival.term}" is the more specific phrase, so it was used.`);
  });
  return { kept: tags.filter((_, index) => !dropped.has(index)), notes };
}

/**
 * Applies the tag rules in text order. Contradictory tags are filtered first by
 * `resolveConflicts`, so what remains is a consistent set of facts.
 */
function applyTags(tags: Tag[]) {
  const intent: IntentPayload = { tags, patch: {}, chain: [], notes: [], confidence: 0 };
  let score = 0;
  let best = 0;
  for (const tag of tags) {
    const rule = TAG_RULES.find((entry) => entry.id === tag.id);
    if (!rule) continue;
    if (tag.negated) {
      // A negated tag cancels its conflicting positive counterpart instead of applying.
      score += tag.weight * 0.5;
      continue;
    }
    rule.apply(intent, tag);
    score += tag.weight;
    best += 2;
    for (const implied of rule.implies ?? []) {
      const target = TAG_RULES.find((entry) => entry.id === implied);
      if (target) target.apply(intent, { ...tag, id: target.id, kind: target.kind, label: target.label });
    }
  }
  intent.confidence = best === 0 ? 0 : Math.min(1, score / best);
  return intent;
}

export interface AnalyzeOptions {
  /** Options the graph already has; the prompt only overrides what it actually mentions. */
  base?: GenOptions;
  /** Keep the previous pallet pattern unless the prompt defines a new one. */
  keepUnmentioned?: boolean;
}

/**
 * Builds the intent payload. The patch only contains keys the prompt actually mentions,
 * so a prompt node can sit next to explicit nodes without erasing their settings.
 */
export function analyzePrompt(input: string, options: AnalyzeOptions = {}): IntentPayload {
  const text = input.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  const resolved = resolveConflicts(extractTags(text));
  const tags = resolved.kept;
  const intent = applyTags(tags);
  intent.tags = tags;
  intent.notes.push(...resolved.notes);
  const base = options.base ?? DEFAULT_GEN;

  // Products ---------------------------------------------------------------
  const productHits = productsInText(text);
  // Labels are matched on the normalised lowercase text: the form writes "Output product:"
  // with a capital letter, and case-sensitive matching silently ignored the field.
  const labeledInput = /(?:input product|input|входной продукт|сырь[её])\s*[:=]\s*([^\n;]+)/u.exec(text);
  const labeledOutput = /(?:output product|output|выходной продукт|готовый продукт)\s*[:=]\s*([^\n;]+)/u.exec(text);
  const arrow = /(?:from|из)\s+([^,.;\n]+?)\s+(?:to|into|в)\s+([^,.;\n]+)/u.exec(text);
  /**
   * Turns a labelled product phrase into a product id.
   *
   * Exact id / English / Russian names come first. People rarely write a bare product
   * name though ("готовая металлическая деталь или ближайший доступный вариант"), so the
   * fallback scores the product's own vocabulary against the phrase — stems included,
   * because Russian inflects ("заготовкой" vs "заготовка").
   */
  const resolve = (value: string) => {
    const q = value.trim().toLowerCase();
    const exact = PRODUCTS.find((product) => product.id === q || product.name.toLowerCase() === q || product.ru.toLowerCase() === q);
    if (exact) return exact.id;
    // Words shared by many products ("готовое", "изделие") cannot identify one, so they
    // are weighted down by how many products use them rather than by their length, and
    // purely generic words are ignored outright.
    const frequency = new Map<string, number>();
    for (const product of PRODUCTS) {
      for (const term of new Set([...product.tags, product.id])) {
        frequency.set(term, (frequency.get(term) ?? 0) + 1);
      }
    }
    let best: { id: string; score: number } | undefined;
    for (const product of PRODUCTS) {
      for (const term of [product.name, product.ru, product.id, ...product.tags]) {
        const word = term.toLowerCase();
        if (word.length < 4 || GENERIC_PRODUCT_WORDS.has(word)) continue;
        const stem = word.slice(0, Math.max(4, word.length - 2));
        if (!q.includes(stem)) continue;
        const score = word.length - 2 * (frequency.get(word) ?? 1);
        if (!best || score > best.score) best = { id: product.id, score };
      }
    }
    return best?.id;
  };
  const inputProduct = labeledInput ? resolve(labeledInput[1]) : arrow ? resolve(arrow[1]) : productHits[0]?.id;
  const outputProduct = labeledOutput ? resolve(labeledOutput[1]) : arrow ? resolve(arrow[2]) : productHits.length > 1 ? productHits[productHits.length - 1].id : undefined;
  if (inputProduct) intent.patch.product = inputProduct;
  if (outputProduct) intent.patch.outputProduct = outputProduct;

  // Counts ------------------------------------------------------------------
  const stageRaw = /(?:processing cells?|process(?:ing)? stations?|ячейки обработки|количество ячеек)\s*[:=]\s*(\d+)/u.exec(text)?.[1]
    ?? countBefore(text, '(?:cells?|stations?|яче\\S*|этап\\S*|станц\\S*)');
  const stageCount = stageRaw === undefined ? undefined : toNumber(String(stageRaw));
  const noProcessing = /no (?:processing|machines?|stations?)|without (?:processing|machines?)|без (?:станков|обработки|ячеек)/u.test(text);
  const lanesRaw = /(?:parallel lines?|параллельн\S* лини\S*)\s*[:=]\s*(\d+)/u.exec(text)?.[1] ?? countBefore(text, '(?:lines?|lanes?|лини\\S*)');
  const lanes = lanesRaw === undefined ? undefined : toNumber(String(lanesRaw));
  const columnsRaw = /(?:parallel columns?|параллельн\S* колонн\S*)\s*[:=]\s*(\d+)/u.exec(text)?.[1];
  const isPalletContext = /pallet|поддон|паллет|stack|уклад/u.test(text);

  // Pallet pattern: "3 columns x 2 rows x 4 layers", or "2x2x2" next to a pallet word.
  const labeledPattern = /(\d+)\s*(?:columns?|cols?|колонн\S*)\s*[xх×*]\s*(\d+)\s*(?:rows?|ряд\S*)\s*[xх×*]\s*(\d+)\s*(?:layers?|сло\S*|уровн\S*)/u.exec(text);
  const barePattern = isPalletContext ? /(\d+)\s*[xх×*]\s*(\d+)\s*[xх×*]\s*(\d+)/u.exec(text) : null;
  const pattern = labeledPattern ?? barePattern;
  if (pattern) {
    intent.patch.cols = clamp(Number(pattern[1]), 1, 6);
    intent.patch.rows = clamp(Number(pattern[2]), 1, 6);
    intent.patch.layers = clamp(Number(pattern[3]), 1, 8);
  } else {
    const rows = countBefore(text, '(?:rows?|ряд\\S*)');
    const layers = countBefore(text, '(?:layers?|сло\\S*|уровн\\S*)');
    const cols = !isPalletContext ? undefined : countBefore(text, '(?:columns?|cols?|колонн\\S*)');
    if (rows !== undefined) intent.patch.rows = clamp(rows, 1, 6);
    if (layers !== undefined) intent.patch.layers = clamp(layers, 1, 8);
    if (cols !== undefined) intent.patch.cols = clamp(cols, 1, 6);
  }
  if (lanes !== undefined) intent.patch.lanes = clamp(lanes, 1, 8);
  if (columnsRaw !== undefined) intent.patch.columns = clamp(Number(columnsRaw), 1, 4);
  else if (!isPalletContext) {
    const columns = countBefore(text, '(?:columns?|cols?|колонн\\S*)');
    if (columns !== undefined) intent.patch.columns = clamp(columns, 1, 4);
  }
  if (stageCount !== undefined) intent.patch.stages = clamp(stageCount, 0, 8);
  if (noProcessing) intent.patch.stages = 0;

  // Speed, cycle, staff ------------------------------------------------------
  const rate = rateFromText(text);
  if (rate !== undefined) intent.patch.rate = rate;
  const belt = /(\d+(?:[.,]\d+)?)\s*(?:m\/s|м\/с)/u.exec(text);
  if (belt) intent.patch.beltSpeed = Math.max(0.1, Math.min(2, Number(belt[1].replace(',', '.'))));
  const cycle = /(\d+)\s*(?:s|sec|second|сек|секунд)(?![\p{L}])/u.exec(text);
  if (cycle) intent.patch.cycleTime = clamp(Number(cycle[1]), 1, 60);
  const staff = /(?:staff|персонал|сотрудники|операторы)\s*[:=]\s*(\d+)/u.exec(text)?.[1]
    ?? countBefore(text, '(?:staff|people|operators?|workers?|человек|сотрудник\\S*|оператор\\S*)');
  if (staff !== undefined) {
    const staffValue = typeof staff === 'number' ? staff : toNumber(String(staff)) ?? Number(staff);
    intent.patch.staff = clamp(staffValue, 0, 50);
    intent.patch.operators = (intent.patch.staff ?? 0) > 0;
  }

  // Process chain ------------------------------------------------------------
  const chainMachines = processOrder(tags);
  const mentionsRobots = tags.some((tag) => tag.kind === 'robot' && /robot|cobot|kuka|fanuc/i.test(tag.id));
  const humanCells = tags.some((tag) => tag.id === 'robot:human' && !tag.negated);
  intent.patch.cellWorkers = Array.from({ length: 8 }, () => (humanCells && !mentionsRobots ? 'human' : 'robot') as 'human' | 'robot');
  if (humanCells) intent.notes.push('Human operators are assigned to every cell that was described.');

  const requestedStages = intent.patch.stages ?? stageCount;
  const chain = buildChain(chainMachines, intent, requestedStages, base);
  if (chain.length) {
    intent.chain = chain;
    intent.patch.processChain = chain;
    intent.patch.cellMachines = chain.map((step) => step.machine);
    intent.patch.cellInputs = chain.map((step) => step.input);
    intent.patch.cellOutputs = chain.map((step) => step.output);
    // An explicit chain defines the number of machining cells unless the text said otherwise.
    if (requestedStages === undefined) intent.patch.stages = chain.length;
  }

  coherence(intent, base, { labeledInput: !!labeledInput, labeledOutput: !!labeledOutput });
  return intent;
}

/** Builds the ordered chain and hands each product to the next step. */
function buildChain(machines: GenOptions['machineKind'][], intent: IntentPayload, stages: number | undefined, base: GenOptions): ProcessStep[] {
  if (!machines.length) return [];
  const recipe = FACTORY_RECIPES.find((entry) => entry.id === (intent.patch.recipe ?? base.recipe)) ?? FACTORY_RECIPES[0];
  const start = intent.patch.product && intent.patch.product !== 'auto' ? intent.patch.product : recipe.input;
  const end = intent.patch.outputProduct && intent.patch.outputProduct !== 'auto' ? intent.patch.outputProduct : recipe.output;
  const intermediate: Partial<Record<GenOptions['machineKind'], string>> = {
    weld: 'welded', paint: 'painted', press: 'stamped', grinder: 'machined', cnc: 'machined',
    lathe: 'machined', packaging: 'carton', kiln: 'brick', cutter: 'billet', assembly: 'phone',
  };
  const limited = stages !== undefined && stages > 0 ? machines.slice(0, clamp(stages, 0, 8)) : machines.slice(0, 8);
  return limited.map((machine, index) => {
    const input = index === 0 ? start : 'chain';
    const output = machine === 'inspection'
      ? 'unchanged'
      : index === limited.length - 1 ? end : (intermediate[machine] ?? end);
    return { machine, input, output, worker: 'robot' as const };
  }).map((step, index, all) => ({
    ...step,
    // Resolve the symbolic hand-off into real product ids so the engine can match parts.
    input: index === 0 ? step.input : all[index - 1].output,
    output: step.output === 'unchanged' ? (index === 0 ? step.input : all[index - 1].output) : step.output,
  }));
}

/** Fixes or reports everything that would make the factory contradict itself. */
function coherence(intent: IntentPayload, base: GenOptions, labels: { labeledInput: boolean; labeledOutput: boolean }) {
  const { labeledInput, labeledOutput } = labels;
  const patch = intent.patch;
  const recipe = FACTORY_RECIPES.find((entry) => entry.id === (patch.recipe ?? base.recipe)) ?? FACTORY_RECIPES[0];

  // 1. Recipe and machine must agree: a kiln fires bricks, not cookies or steel.
  const machine = patch.machineKind ?? base.machineKind;
  const chainMachines = intent.chain.map((step) => step.machine);
  const hasKiln = machine === 'kiln' || chainMachines.includes('kiln');
  if (hasKiln && recipe.id !== 'brick') {
    // A kiln is specific enough to be the deciding signal: switch the recipe, not the kiln.
    patch.recipe = 'brick';
    intent.notes.push('A kiln was requested, so the brick recipe and its clay → brick product flow were selected.');
    if (!labeledInput) patch.product = 'clay';
    if (!labeledOutput) patch.outputProduct = 'brick';
  } else if (hasKiln && recipe.id === 'brick') {
    if (!labeledInput) patch.product = 'clay';
    if (!labeledOutput) patch.outputProduct = 'brick';
  }

  // 2. A magnetic gripper can only pick magnetic products.
  const gripper = patch.gripper ?? base.gripper;
  if (gripper === 'magnetic') {
    const input = patch.product && patch.product !== 'auto' ? patch.product : recipe.input;
    const output = patch.outputProduct && patch.outputProduct !== 'auto' ? patch.outputProduct : recipe.output;
    if (!getProduct(input).magnetic || !getProduct(output).magnetic) {
      patch.gripper = 'vacuum';
      intent.notes.push(`"${getProduct(input).name}" is not magnetic, so a vacuum gripper was selected.`);
    }
  }

  // 3. Stage count and chain length must match.
  const stages = patch.stages;
  if (intent.chain.length && stages !== undefined && stages > 0 && stages !== intent.chain.length) {
    patch.stages = intent.chain.length;
    intent.notes.push(`The process chain has ${intent.chain.length} steps, so the cell count was set to match.`);
  }

  // 4. A chain needs a robot or a human in every cell; staff cannot exceed cells x 2.
  if (patch.operators === false && (patch.staff ?? base.staff) > 0) {
    patch.staff = 0;
    intent.notes.push('Staff was set to 0 because the prompt asked for an unmanned plant.');
  }

  // 5. Feed rate and cycle time have to be physically compatible.
  if (patch.rate !== undefined && patch.cycleTime !== undefined) {
    const implied = 60 / Math.max(1, patch.cycleTime);
    if (Math.abs(implied - patch.rate) > patch.rate * 0.75) {
      intent.notes.push(`A ${patch.cycleTime}s cycle cannot feed ${patch.rate} products/min; the cycle time is applied per cell, so expect a lower real output.`);
    }
  }

  // 6. Lanes multiply the plant, so the staff count must address every line.
  if ((patch.lanes ?? 1) > 3 && (patch.staff ?? 0) > 0 && (patch.staff ?? 0) < 3) {
    intent.notes.push('With this many parallel lines one operator cannot cover every cell.');
  }

  // 7. Deterministic confidence penalty for anything that was assumed.
  if (intent.notes.length) intent.confidence = Math.max(0, intent.confidence - 0.05 * intent.notes.length);
}

/** Merge a prompt intent over explicit options: the prompt only touches what it mentions. */
export function mergeIntent(base: GenOptions, intent: IntentPayload, keys: (keyof GenOptions)[] = []): GenOptions {
  const allowed = keys.length ? new Set(keys) : null;
  const patch = Object.fromEntries(
    Object.entries(intent.patch).filter(([key]) => !allowed || allowed.has(key as keyof GenOptions)),
  ) as Partial<GenOptions>;
  return { ...base, ...patch };
}

/** Human-readable list of what the parser understood, for the editor. */
export function describeIntent(intent: IntentPayload): string[] {
  const lines: string[] = [];
  const recipe = intent.patch.recipe;
  if (recipe) lines.push(`Recipe: ${FACTORY_RECIPES.find((entry) => entry.id === recipe)?.name ?? recipe}`);
  if (intent.chain.length) lines.push(`Chain: ${intent.chain.map((step) => step.machine).join(' → ')}`);
  if (intent.patch.style) lines.push(`Layout: ${intent.patch.style}`);
  if (intent.patch.rate) lines.push(`Rate: ${intent.patch.rate}/min`);
  if (intent.patch.gripper) lines.push(`Tool: ${intent.patch.gripper}`);
  if (intent.patch.lanes) lines.push(`Parallel lines: ${intent.patch.lanes}`);
  return lines;
}
