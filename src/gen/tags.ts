/**
 * Tagging and intent extraction for factory prompts.
 *
 * A prompt is matched against a lexicon of tagged terms (English + Russian, with
 * inflected forms) instead of one giant regular expression. Every match becomes a
 * `Tag` with a character span and a weight, and tags carry their own effect on the
 * options. That has three consequences the old keyword parser could not offer:
 *
 * 1. **Explainability.** The editor can show exactly which words produced which setting.
 * 2. **Extensibility.** A new capability is a new entry in `TAG_RULES`; no parser surgery.
 * 3. **Coherence.** Rules can imply and conflict with each other ("kiln" implies bricks,
 *    "cobot" conflicts with "industrial", "magnetic" needs metal parts), and the
 *    conflicts are reported instead of being resolved by regex order.
 */
import type { GenOptions } from '../sim/generator';
import type { IntentPayload, Tag } from './graph/types';

export type TagKind =
  | 'recipe' | 'process' | 'robot' | 'gripper' | 'style' | 'safety'
  | 'staff' | 'pallet' | 'rate' | 'product' | 'scale' | 'action';

export interface TagRule {
  id: string;
  kind: TagKind;
  label: string;
  /** Lower-case terms. Matching is longest-first and word-bounded. */
  terms: string[];
  /** Marks the entry as negatable and describes the opposite effect. */
  weight?: number;
  implies?: string[];
  conflicts?: string[];
  apply: (intent: IntentPayload, tag: Tag) => void;
}

const set = <K extends keyof GenOptions>(patch: Partial<GenOptions>, key: K, value: GenOptions[K]) => {
  patch[key] = value;
};

const RECIPES: { id: GenOptions['recipe']; label: string; terms: string[] }[] = [
  { id: 'bakery', label: 'Bakery', terms: ['cookie bakery', 'bakery', 'cookies', 'biscuit', 'dough', 'baking', 'пекарн*', 'печен*', 'тест*', 'выпечк*', 'выпечк*', 'пекарн*', 'пекарн*'] },
  { id: 'brick', label: 'Brick factory', terms: ['brick factory', 'bricks', 'brick', 'clay', 'kiln', 'кирпич*', 'глин*', 'обжиг*', 'керамик*', 'кирпич*'] },
  { id: 'bottling', label: 'Bottling', terms: ['bottling', 'bottle filling', 'juice', 'beverage', 'розлив*', 'бутылочн*', 'сок*', 'напитк*', 'бутылк*'] },
  { id: 'electronics', label: 'Electronics', terms: ['electronics', 'circuit board', 'pcb', 'semiconductor', 'электроник*', 'плат*', 'микросхем*'] },
  { id: 'medical', label: 'Medical filling', terms: ['medical', 'pharma', 'vials', 'vial', 'медицин*', 'фармацевт*', 'флакон*', 'лекарств*', 'медицин*'] },
  { id: 'metalworking', label: 'Metalworking', terms: ['metalworking', 'metal working', 'steel plant', 'machining', 'металлообработк*', 'механообработк*', 'сталь', 'стал*', 'металл*', 'заготовк*'] },
  { id: 'turning', label: 'Precision turning', terms: ['turning', 'lathe', 'токарн*', 'токарк*', 'токарн* цех'] },
  { id: 'logistics', label: 'Parcel logistics', terms: ['logistics', 'parcels', 'warehouse', 'distribution center', 'логистик*', 'посылк*', 'склад*', 'распределительн* центр'] },
  { id: 'assembly', label: 'Assembly plant', terms: ['assembly plant', 'assembly line', 'assembling', 'сборк*', 'сборочн*', 'сборочн* лини*'] },
];

const PROCESSES: { id: GenOptions['machineKind']; label: string; terms: string[] }[] = [
  { id: 'weld', label: 'Welding', terms: ['weld', 'welding', 'сварк*', 'сварочн*', 'сварить'] },
  { id: 'paint', label: 'Painting', terms: ['paint', 'painting', 'coating', 'окрас*', 'покрас*', 'окраск*', 'покраск*'] },
  { id: 'press', label: 'Pressing', terms: ['press', 'pressing', 'stamping', 'штамповк*', 'пресс*', 'прессован*'] },
  { id: 'grinder', label: 'Grinding', terms: ['grind', 'grinding', 'polishing', 'шлифов*', 'полировк*', 'полиров*'] },
  { id: 'cnc', label: 'Milling', terms: ['milling', 'cnc', 'machining center', 'фрезеров*', 'фрезерн*', 'чпу'] },
  { id: 'lathe', label: 'Turning', terms: ['lathe', 'turning cell', 'токарн* станок', 'точени*'] },
  { id: 'assembly', label: 'Assembly', terms: ['assembly station', 'assemble', 'assembling', 'сборка', 'собрать'] },
  { id: 'inspection', label: 'Quality inspection', terms: ['quality control', 'quality inspection', 'inspection', 'inspect', 'vision check', 'контрол* качеств*', 'проверк*', 'инспекц*', 'испытан*'] },
  { id: 'packaging', label: 'Packaging', terms: ['packaging', 'pack', 'filling', 'case packer', 'упаковк*', 'фасовк*', 'наполн*', 'дозиров*'] },
  { id: 'kiln', label: 'Kiln', terms: ['kiln', 'firing', 'обжиг*', 'печ*'] },
  { id: 'cutter', label: 'Cutting', terms: ['cutting', 'laser cut', 'plasma cut', 'резк*', 'раскро*', 'лазерн* резк*'] },
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  один: 1, одна: 1, одной: 1, два: 2, две: 2, двух: 2, три: 3, трех: 3, трёх: 3,
  четыре: 4, четырех: 4, четырёх: 4, пять: 5, пяти: 5, шесть: 6, шести: 6,
  семь: 7, семи: 7, восемь: 8, девяти: 9, девять: 9, десять: 10, десятью: 10,
};

export const NUMBER_PATTERN = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|один|одна|одной|два|две|двух|три|трех|трёх|четыре|четырех|четырёх|пять|пяти|шесть|шести|семь|семи|восемь|девять|десять)';

export function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  return NUMBER_WORDS[value.toLowerCase()];
}

const STYLES: { id: GenOptions['style']; label: string; terms: string[] }[] = [
  { id: 'U', label: 'U-shaped line', terms: ['u-shape', 'u shape', 'u-shaped', 'u turn', 'horseshoe', 'п-образн*', 'подков*', 'п образн*'] },
  { id: 'L', label: 'L-shaped line', terms: ['l-shape', 'l shape', 'l-shaped', 'corner line', 'г-образн*', 'углов* лини*'] },
  { id: 'S', label: 'S-curve line', terms: ['s-curve', 's curve', 's-shape', 'snake', 'зигзаг*', 'змейк*', 's-образн*'] },
  { id: 'straight', label: 'Straight line', terms: ['straight line', 'in-line', 'inline', 'linear line', 'прям* лини*', 'прямолинейн*', 'линейн* лини*'] },
];

const STAFF_TASKS: { id: GenOptions['staffTask']; label: string; terms: string[] }[] = [
  { id: 'inspect', label: 'Inspect products', terms: ['inspect products', 'inspection walk', 'quality walk', 'осмотр* продукц*', 'проверк* продукц*', 'инспектир*'] },
  { id: 'carry', label: 'Carry products', terms: ['carry products', 'transport parts', 'переносят', 'переноск*', 'носят детал*'] },
  { id: 'replenish', label: 'Replenish feeder', terms: ['replenish', 'refill feeder', 'load the feeder', 'пополнени*', 'загрузк* фидер*', 'дозагрузк*'] },
  { id: 'patrol', label: 'Patrol route', terms: ['patrol', 'walk the line', 'обход*', 'патрулир*'] },
];

/** Rules are ordered only for readability; matching sorts terms by length. */
export const TAG_RULES: TagRule[] = [
  ...RECIPES.map<TagRule>((recipe) => ({
    id: `recipe:${recipe.id}`,
    kind: 'recipe',
    label: recipe.label,
    terms: recipe.terms,
    weight: 1,
    apply: (intent) => set(intent.patch, 'recipe', recipe.id),
  })),
  ...PROCESSES.map<TagRule>((process) => ({
    id: `process:${process.id}`,
    kind: 'process',
    label: process.label,
    terms: process.terms,
    weight: 1,
    // The prompt chain is built in position order later; the tag only records the step.
    apply: () => {},
  })),
  ...STYLES.map<TagRule>((style) => ({
    id: `style:${style.id}`,
    kind: 'style',
    label: style.label,
    terms: style.terms,
    weight: 1.2,
    apply: (intent) => set(intent.patch, 'style', style.id),
  })),
  ...STAFF_TASKS.map<TagRule>((task) => ({
    id: `task:${task.id}`,
    kind: 'staff',
    label: task.label,
    terms: task.terms,
    weight: 0.8,
    apply: (intent) => set(intent.patch, 'staffTask', task.id),
  })),
  { id: 'robot:cobot', kind: 'robot', label: 'Cobot', terms: ['cobot', 'cobots', 'collaborative robot', 'кобот*', 'коллаборативн*'], weight: 1.5, conflicts: ['robot:industrial'], apply: (intent) => set(intent.patch, 'cobot', true) },
  { id: 'robot:industrial', kind: 'robot', label: 'Industrial robot', terms: ['industrial robot', 'industrial robots', 'промышленн* робот*'], weight: 1.5, conflicts: ['robot:cobot'], apply: (intent) => set(intent.patch, 'cobot', false) },
  { id: 'robot:kuka', kind: 'robot', label: 'KUKA', terms: ['kuka', 'кука'], weight: 2, apply: (intent) => set(intent.patch, 'robotBrand', 'kuka') },
  { id: 'robot:fanuc', kind: 'robot', label: 'FANUC', terms: ['fanuc', 'фанук'], weight: 2, apply: (intent) => set(intent.patch, 'robotBrand', 'fanuc') },
  { id: 'robot:human', kind: 'robot', label: 'Human operators in cells', terms: ['human operator', 'human operators', 'manual cell', 'manual cells', 'ручн* ячейк*', 'человек обслуж*'], weight: 1.4, apply: () => {} },
  { id: 'robot:larp', kind: 'robot', label: 'Larp robot', terms: ['larp robot', 'standard robot', 'обычный робот'], weight: 0.5, apply: (intent) => set(intent.patch, 'robotBrand', 'robot') },

  { id: 'gripper:vacuum', kind: 'gripper', label: 'Vacuum cup', terms: ['vacuum', 'suction', 'вакуум*', 'присоск*'], weight: 1.2, conflicts: ['gripper:parallel', 'gripper:three-finger', 'gripper:magnetic', 'gripper:soft'], apply: (intent) => set(intent.patch, 'gripper', 'vacuum') },
  { id: 'gripper:parallel', kind: 'gripper', label: 'Parallel jaws', terms: ['mechanical gripper', 'parallel jaw', 'parallel jaws', 'jaw gripper', 'механическ* захват*', 'параллельн* губк*'], weight: 1.4, conflicts: ['gripper:vacuum', 'gripper:three-finger', 'gripper:magnetic', 'gripper:soft'], apply: (intent) => set(intent.patch, 'gripper', 'parallel') },
  { id: 'gripper:three-finger', kind: 'gripper', label: 'Three-finger', terms: ['three finger', 'three-finger', 'трехпал*', 'трёхпал*'], weight: 1.4, conflicts: ['gripper:vacuum', 'gripper:parallel', 'gripper:magnetic', 'gripper:soft'], apply: (intent) => set(intent.patch, 'gripper', 'three-finger') },
  { id: 'gripper:magnetic', kind: 'gripper', label: 'Magnetic', terms: ['magnet', 'magnetic gripper', 'магнит*'], weight: 1.4, conflicts: ['gripper:vacuum', 'gripper:parallel', 'gripper:three-finger', 'gripper:soft'], apply: (intent) => set(intent.patch, 'gripper', 'magnetic') },
  { id: 'gripper:soft', kind: 'gripper', label: 'Soft gripper', terms: ['soft gripper', 'мягк* захват*'], weight: 1.2, conflicts: ['gripper:vacuum', 'gripper:parallel', 'gripper:three-finger', 'gripper:magnetic'], apply: (intent) => set(intent.patch, 'gripper', 'soft') },

  { id: 'safety:fences', kind: 'safety', label: 'Safety fences', terms: ['fence', 'fences', 'fencing', 'guarding', 'safety cage', 'огражд*', 'забор*', 'защитн* контур*'], weight: 1, conflicts: ['safety:no-fences'], apply: (intent) => set(intent.patch, 'fences', true) },
  { id: 'safety:no-fences', kind: 'safety', label: 'No fences', terms: ['no fence', 'no fences', 'without fence', 'without fences', 'без огражд*', 'без забор*', 'open cell', 'открыт* ячейк*'], weight: 1.5, conflicts: ['safety:fences'], apply: (intent) => set(intent.patch, 'fences', false) },
  { id: 'safety:cabinets', kind: 'safety', label: 'Control cabinets', terms: ['control cabinet', 'cabinets', 'шкаф* управлени*'], weight: 1, apply: (intent) => set(intent.patch, 'cabinets', true) },
  { id: 'safety:no-cabinets', kind: 'safety', label: 'No cabinets', terms: ['no cabinet', 'no cabinets', 'без шкаф*'], weight: 1.2, apply: (intent) => set(intent.patch, 'cabinets', false) },

  { id: 'staff:present', kind: 'staff', label: 'Operators', terms: ['operators', 'operator', 'workers', 'staff', 'people', 'оператор*', 'рабоч*', 'персонал*', 'сотрудник*'], weight: 0.9, conflicts: ['staff:none'], apply: (intent) => set(intent.patch, 'operators', true) },
  { id: 'staff:none', kind: 'staff', label: 'No operators', terms: ['no operators', 'no operator', 'without operators', 'unmanned', 'lights out', 'без оператор*', 'без персонал*', 'безлюдн*'], weight: 1.6, conflicts: ['staff:present'], apply: (intent) => { intent.patch.operators = false; intent.patch.staff = 0; } },

  { id: 'pallet:pattern', kind: 'pallet', label: 'Pallet pattern', terms: ['pallet pattern', 'stack pattern', 'palletizing pattern', 'схем* укладк*', 'схем* паллет*'], weight: 0.6, apply: () => {} },
  { id: 'scale:compact', kind: 'scale', label: 'Compact cell', terms: ['compact', 'small cell', 'tight cell', 'компактн*', 'маленьк* ячейк*'], weight: 0.8, apply: (intent) => { intent.patch.lanes = 1; } },
  { id: 'scale:large', kind: 'scale', label: 'Large plant', terms: ['large plant', 'big factory', 'large factory', 'больш* завод*', 'крупн* завод*', 'больш* фабрик*'], weight: 0.8, apply: (intent) => { intent.patch.columns = 2; } },
];

/** Process tags in the order they appear become the process chain. */
export function processOrder(tags: Tag[]): GenOptions['machineKind'][] {
  const seen = new Set<string>();
  const out: GenOptions['machineKind'][] = [];
  for (const tag of tags) {
    if (tag.kind !== 'process' || tag.negated) continue;
    if (seen.has(tag.id)) continue;
    seen.add(tag.id);
    out.push(tag.id.split(':')[1] as GenOptions['machineKind']);
  }
  return out;
}

const NEGATORS = ['no', 'not', 'without', 'never', 'без', 'не', 'нет'];

/**
 * Cyrillic-aware word boundaries (`\b` does not understand Cyrillic in JS), plus stem
 * matching: a term ending in `*` matches any suffix. Russian inflects heavily
 * ("кобот → коботами", "ячейка → ячейками"), so stems keep the lexicon small and make
 * the parser understand cases the old keyword list missed.
 */
/**
 * Escapes a dictionary term to a regular expression. A `*` anywhere in the term (not just
 * at the end) becomes a stem wildcard, so multi-word terms such as "контрол* качеств*"
 * work: escaping the inner asterisk first turned them into literals that never matched.
 */
const escapeTerm = (term: string) => term
  .split('*')
  .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
  .join('\\p{L}*');

const boundary = (term: string) => {
  const core = term.endsWith('*') ? `${escapeTerm(term.slice(0, -1))}\\p{L}*` : escapeTerm(term);
  return `(?<![\\p{L}\\p{N}])${core}(?![\\p{L}\\p{N}])`;
};

interface TermMatcher { rule: TagRule; term: string; regex: RegExp }

let matchers: TermMatcher[] | null = null;

/**
 * One compiled matcher per term.
 *
 * A single alternation was tempting, but stem terms make the matched text differ from
 * the dictionary key ("коботами" vs "кобот*"), so every candidate is collected with the
 * rule that produced it instead of being looked up by the matched string.
 */
function compile(): TermMatcher[] {
  if (matchers) return matchers;
  const list: TermMatcher[] = [];
  for (const rule of TAG_RULES) {
    for (const term of rule.terms) {
      list.push({ rule, term, regex: new RegExp(boundary(term.toLowerCase()), 'giu') });
    }
  }
  matchers = list;
  return matchers;
}

/** Extracts every tagged term with its span, weight and negation state. */
export function extractTags(text: string): Tag[] {
  const candidates: { start: number; end: number; term: string; rule: TagRule }[] = [];
  for (const matcher of compile()) {
    matcher.regex.lastIndex = 0;
    for (const match of text.matchAll(matcher.regex)) {
      const start = match.index ?? 0;
      candidates.push({ start, end: start + match[0].length, term: match[0], rule: matcher.rule });
    }
  }
  // Longest match at each position wins ("no fences" over "fences"). Different kinds may
  // share a span on purpose: "kiln" is both the brick recipe and the firing step, and
  // both facts are useful, so only same-kind overlaps are dropped.
  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const taken: { start: number; end: number; kind: string }[] = [];
  const seen = new Set<string>();
  const tags: Tag[] = [];
  for (const candidate of candidates) {
    const overlapsSameKind = taken.some((entry) => entry.kind === candidate.rule.kind && candidate.start < entry.end && candidate.end > entry.start);
    // One hit per rule: "brick … kiln" both name the brick recipe, but that is one fact.
    if (overlapsSameKind || seen.has(candidate.rule.id)) continue;
    seen.add(candidate.rule.id);
    taken.push({ start: candidate.start, end: candidate.end, kind: candidate.rule.kind });
    const before = text.slice(Math.max(0, candidate.start - 16), candidate.start).toLowerCase();
    const negated = NEGATORS.some((negator) => new RegExp(`(?:^|[^\\p{L}])${negator}\\s*$`, 'u').test(before));
    const rule = candidate.rule;
    tags.push({
      id: rule.id, kind: rule.kind, label: rule.label, weight: rule.weight ?? 1,
      span: [candidate.start, candidate.end], term: candidate.term, negated,
    });
  }
  return tags.sort((a, b) => a.span[0] - b.span[0]);
}
