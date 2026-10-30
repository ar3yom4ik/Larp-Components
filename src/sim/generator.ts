import type { GripperKind, SceneItem } from "../types";
import { isRobotKind } from "../utils/kinds";
import { makeItem } from "../data/library";
import { programToCode } from "./programCode";
import { samplePath } from "./spline";
import { ConveyorRT, MachineRT, PalletRT, RobotRT } from "./engine";
import { getProduct, MACHINE_KINDS, PRODUCTS } from "../data/products";

export type FactoryStyle = "straight" | "L" | "U" | "S";

export type FactoryRecipe = "turning" | "metalworking" | "brick" | "bakery" | "bottling" | "electronics" | "medical" | "logistics" | "assembly";
export const FACTORY_RECIPES = [
  { id: "metalworking", name: "Metalworking", description: "Billets become precision parts.", input: "billet", output: "machined", machine: "cnc", color: "#9db9d1" },
  { id: "turning", name: "Precision turning", description: "Turn metal blanks into a finished round part.", input: "billet", output: "machined", machine: "lathe", color: "#79a6c7" },
  { id: "brick", name: "Brick factory", description: "Fire clay blanks into bricks and pack them.", input: "clay", output: "brick", machine: "kiln", color: "#b85d3e" },
  { id: "bakery", name: "Cookie bakery", description: "Bake dough into chocolate chip cookies.", input: "dough", output: "cookie", machine: "packaging", color: "#dea654" },
  { id: "bottling", name: "Bottling", description: "Fill empty bottles and stack the finished product.", input: "empty-bottle", output: "juice", machine: "packaging", color: "#edaa37" },
  { id: "electronics", name: "Electronics assembly", description: "Turn circuit boards into assembled devices.", input: "pcb", output: "phone", machine: "cnc", color: "#5dc3a0" },
  { id: "medical", name: "Medical filling", description: "Fill medical vials in a collaborative cell.", input: "vial", output: "medicine", machine: "packaging", color: "#79c6d4" },
  { id: "assembly", name: "Assembly plant", description: "Combine components into finished assemblies.", input: "pcb", output: "phone", machine: "assembly", color: "#96b7d1" },
  { id: "logistics", name: "Parcel logistics", description: "Direct carton transport and palletizing.", input: "carton", output: "carton", machine: "cnc", color: "#bb9472" },
] as const;

export interface ProcessStep {
  machine: GenOptions["machineKind"];
  input: string;
  output: string;
  worker: "robot" | "human" | "auto";
}

export interface GenOptions {
  seed: number;
  style: FactoryStyle;
  stages: number;
  cobot: boolean;
  rate: number;
  fences: boolean;
  operators: boolean;
  /** Total staff in the whole plant, not per line. */
  staff: number;
  cabinets: boolean;
  recipe: FactoryRecipe;
  lanes: number;
  beltSpeed: number;
  cycleTime: number;
  gripper: GripperKind;
  cols: number;
  rows: number;
  layers: number;
  product: string;
  staffTask: "patrol" | "inspect" | "carry" | "replenish";
  machineKind: "auto" | "cnc" | "press" | "weld" | "packaging" | "paint" | "cutter" | "inspection" | "assembly" | "kiln" | "lathe" | "grinder";
  columns: number;
  cellWorkers: ("robot" | "human")[];
  cellInputs: string[];
  cellOutputs: string[];
  robotBrand: "robot" | "kuka" | "fanuc";
  outputProduct: string;
  cellMachines: string[];
  processChain: ProcessStep[];
}

export const DEFAULT_GEN: GenOptions = {
  seed: 7,
  style: "L",
  stages: 1,
  cobot: false,
  rate: 12,
  fences: true,
  operators: true,
  staff: 1,
  cabinets: true,
  recipe: "metalworking", lanes: 1, beltSpeed: 0.6, cycleTime: 6,
  gripper: "vacuum", cols: 3, rows: 2, layers: 4, product: "auto", staffTask: "inspect", machineKind: "auto", outputProduct: "auto", columns: 1, cellWorkers: [], cellInputs: [], cellOutputs: [], robotBrand: "robot", cellMachines: [], processChain: [],
};

function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type P2 = [number, number];
const DEG = Math.PI / 180;

const heading = (theta: number): P2 => [Math.cos(theta), -Math.sin(theta)];
const rotate = (theta: number, lx: number, lz: number): P2 => [
  lx * Math.cos(theta) + lz * Math.sin(theta),
  -lx * Math.sin(theta) + lz * Math.cos(theta),
];
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: P2, k: number): P2 => [a[0] * k, a[1] * k];

type Turn = 0 | 90 | -90 | 180 | "S";

function turnPlan(style: FactoryStyle, links: number): Turn[] {
  const plan: Turn[] = Array.from({ length: links }, () => 0 as Turn);
  if (style === "L") {
    plan[Math.floor(links / 2)] = 90;
  } else if (style === "U") {
    if (links === 1) plan[0] = 180;
    else {
      const t1 = Math.floor((links - 1) / 2);
      plan[t1] = 90;
      plan[t1 + 1] = 90;
    }
  } else if (style === "S") {
    if (links === 1) plan[0] = "S";
    else {
      const t1 = Math.floor((links - 1) / 2);
      plan[t1] = 90;
      plan[t1 + 1] = -90;
    }
  }
  return plan;
}

function bezier(p0: P2, p1: P2, p2: P2, p3: P2, t: number): P2 {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function resolveProduct(value: string | undefined, fallback: string) {
  return !value || value === "auto" ? fallback : value;
}

function generateSingle(options: GenOptions): SceneItem[] {
  const o = { ...DEFAULT_GEN, ...options };
  const rand = rng(o.seed);
  const recipe = FACTORY_RECIPES.find((r) => r.id === o.recipe) ?? FACTORY_RECIPES[0];
  const inputProduct = o.product === "auto" ? recipe.input : o.product;
  const outputProduct = o.stages === 0 ? inputProduct : o.outputProduct === "auto" ? recipe.output : o.outputProduct;
  const stages = Math.max(0, Math.min(8, Math.round(o.stages)));
  const robotKind = o.cobot ? "cobot" : o.robotBrand;
  const off = o.cobot ? 1.1 : 1.45;
  const items: SceneItem[] = [];
  const cellCount = stages + 2;
  const links = cellCount - 1;
  const plan = turnPlan(o.style, links);
  const g = 3.6;
  const robotSpeed = Math.round(62 + rand() * 24);

  // Feed cell --------------------------------------------------------
  let outPos: P2 = [0, 0];
  let theta = 0;
  const feedPos = outPos;
  const feederPos = add(feedPos, scale(heading(theta), 0.85));
  items.push(
    makeItem("feeder", [feederPos[0], 0, feederPos[1]], theta / DEG, {
      name: "Feeder F-01",
      props: { interval: Math.max(1.5, Math.round((60 / o.rate) * 10) / 10), active: true, product: inputProduct, requireSupply: o.staffTask === "replenish" && o.operators },
    }),
  );
  if (o.operators) {
    const [ox, oz] = add(feedPos, rotate(theta, 1.2, 2.4));
    items.push(makeItem("operator", [ox, 0, oz], 200 + rand() * 40, { name: "Operator A. Chen" }));
  }

  let prevConveyorName = "";
  let robotIndex = 0;
  let cncIndex = 0;
  const machineCells: SceneItem[] = [];

  for (let i = 0; i < links; i += 1) {
    const hA = heading(theta);
    const turn = plan[i];
    let thetaB = theta;
    let B: P2;
    const len = (i === 0 ? 5.4 : 4.2) + rand() * 0.8;
    if (turn === 0) {
      B = add(outPos, scale(hA, len));
    } else if (turn === 90 || turn === -90) {
      thetaB = theta + (turn as number) * DEG;
      B = add(add(outPos, scale(hA, g)), scale(heading(thetaB), g));
    } else if (turn === 180) {
      thetaB = theta + Math.PI;
      B = add(add(outPos, scale(hA, 0.6)), scale(heading(theta + Math.PI / 2), 6.8));
    } else {
      B = add(add(outPos, scale(hA, g * 2.4)), scale(heading(theta + Math.PI / 2), g * 1.9));
    }
    const hB = heading(thetaB);

    // Spline conveyor (world points -> item local) ----------------------
    let worldPts: P2[];
    if (turn === 0) {
      worldPts = [outPos, add(outPos, scale(hA, len * 0.5)), B];
    } else {
      const dist = Math.hypot(B[0] - outPos[0], B[1] - outPos[1]);
      const k = Math.max(1.2, dist * 0.45);
      const p1 = add(outPos, scale(hA, k));
      const p2 = add(B, scale(hB, -k));
      worldPts = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => bezier(outPos, p1, p2, B, t));
    }
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const local = worldPts.map(([x, z]) => {
      const dx = x - outPos[0];
      const dz = z - outPos[1];
      return [Math.round((dx * c - dz * s) * 100) / 100, Math.round((dx * s + dz * c) * 100) / 100] as P2;
    });
    const convName = `Conveyor ${i + 1}`;
    items.push(
      makeItem("conveyor", [outPos[0], 0, outPos[1]], theta / DEG, {
        name: convName,
        points: local,
        props: { speed: o.beltSpeed, active: true, stopper: true },
      }),
    );

    // Robot cell at the end of the link ----------------------------------
    const isPack = i === links - 1;
    const O = add(B, rotate(thetaB, 0.3, off));
    const cellDeg = thetaB / DEG;
    robotIndex += 1;
    const robotName = `Robot R-0${robotIndex}`;
    if (isPack) {
      const palletName = "Pallet P-01";
      const [px, pz] = add(O, rotate(thetaB, 0, off));
      items.push(
        makeItem(robotKind, [O[0], 0, O[1]], cellDeg, {
          name: robotName,
          props: { payload: o.cobot ? 5 : 12, speed: robotSpeed, gripper: o.gripper },
        }),
        makeItem("crates", [px, 0, pz], cellDeg, {
          name: palletName,
          props: { cols: o.cols, rows: o.rows, layers: o.layers, gap: 0.04, product: outputProduct },
        }),
      );
    } else {
      cncIndex += 1;
      const operation = o.cellMachines[i] ?? o.processChain[i]?.machine;
      const operationName: Record<string, string> = { cutter: "Cutting", cnc: "Milling", inspection: "Quality inspection", weld: "Welding", paint: "Painting", assembly: "Assembly", packaging: "Packaging" };
      const cncName = o.processChain.length ? `${operationName[operation] ?? "Processing"} M-0${cncIndex}` : `CNC M-0${cncIndex}`;
      const [cx, cz] = add(O, rotate(thetaB, 0, off + 1.45));
      items.push(
        makeItem(robotKind, [O[0], 0, O[1]], cellDeg, {
          name: robotName,
          props: { payload: o.cobot ? 5 : 12, speed: robotSpeed, gripper: o.gripper },
        }),
        makeItem((() => { const operation = o.cellMachines[i] ?? o.processChain[i]?.machine; return (operation && operation !== "auto" ? operation : (o.machineKind === "auto" ? recipe.machine : o.machineKind)) as never; })(), [cx, 0, cz], cellDeg + 180, {
          name: cncName,
          props: {
            cycleTime: o.cycleTime,
            requiredParts: ((o.cellMachines[i] ?? o.processChain[i]?.machine ?? o.machineKind) === "assembly" || o.recipe === "assembly") ? 2 : 1,
            inputProduct: resolveProduct(o.cellInputs[i] ?? o.processChain[i]?.input, i === 0 ? inputProduct : outputProduct),
            outputProduct: resolveProduct(o.cellOutputs[i] ?? o.processChain[i]?.output, outputProduct),
            paintColor: "#d6534c",
          },
        }),
      );
      machineCells.push(items[items.length - 1]);
    }

    if (o.fences) {
      items.push(makeItem("fence", [O[0], 0, O[1]], cellDeg, {
        name: "Cell Guarding", points: [[-2.55, 0], [-2.55, isPack ? 2.5 : 4.15], [2.55, isPack ? 2.5 : 4.15], [2.55, 0]],
        props: { height: 2, panelWidth: 1.5, gateOpen: false, gateSegment: 0 },
      }));
    }
    if (o.cabinets) {
      const [cabx, cabz] = add(O, rotate(thetaB, -3.4, 1.3));
      items.push(makeItem("cabinet", [cabx, 0, cabz], cellDeg + 90, { name: `Cell Controller ${robotIndex}` }));
    }
    prevConveyorName = convName;
    outPos = add(B, scale(hB, 0.6));
    theta = thetaB;
  }
  void prevConveyorName;

  // Stable IDs are the bindings: translating names or rearranging components is safe.
  const robots = items.filter((i) => isRobotKind(i.kind));
  robots.forEach((robot, index) => {
    const input = items.find((i) => i.name === `Conveyor ${index + 1}`)!;
    const isPalletizer = index === robots.length - 1;
    const target = isPalletizer ? items.find((i) => i.kind === "crates")! : items.find((i) => i.name === `Conveyor ${index + 2}`)!;
    const machine = machineCells[index];
    const step = o.processChain[index];
    const machineKind = o.cellMachines[index] ?? step?.machine ?? (o.machineKind === "auto" ? recipe.machine : o.machineKind);
    const mode: "palletize" | "tend" | "assemble" | "paint" = isPalletizer ? "palletize" : machineKind === "assembly" ? "assemble" : machineKind === "paint" ? "paint" : "tend";
    robot.program = { mode, sourceId: input.id, targetId: target.id, machineId: machine?.id, repeat: true, delay: 0, clearance: 0.3 };
    robot.script = programToCode(robot.program);
  });
  o.cellWorkers.slice(0, stages).forEach((chainWorker, cell) => {
    const worker = chainWorker;
    if (worker !== "human") return;
    const machineForCell = machineCells[cell] ?? items.find((i) => MACHINE_KINDS.has(i.kind));
    const robot = items.find((i) => i.name === `Robot R-0${cell + 1}`);
    if (!machineForCell || !robot) return;
    const inputBelt = items.find((i) => i.name === `Conveyor ${cell + 1}`) ?? items.find((i) => i.kind === "conveyor");
    const outputBelt = items.find((i) => i.name === `Conveyor ${cell + 2}`) ?? items.find((i) => i.kind === "conveyor" && i !== inputBelt);
    const operator = makeItem("operator", [robot.position[0], 0, robot.position[2] + 0.5], robot.rotation, {
      name: `Operator W-0${cell + 1}`,
      props: { task: "tend", sourceId: inputBelt?.id ?? "", targetId: outputBelt?.id ?? "", machineId: machineForCell.id, hat: "hardhat", glasses: true, walkSpeed: 1 },
    });
    items.push(operator);
    items.splice(items.indexOf(robot), 1);
  });
  const feeder = items.find((i) => i.kind === "feeder")!;
  const first = items.find((i) => i.kind === "conveyor")!;
  const path = samplePath(first.points!, 0.1);
  const n = Math.min(path.x.length - 1, Math.round(0.85 / path.length * (path.x.length - 1)));
  const fpoint = rotate(first.rotation * DEG, path.x[n], path.z[n]);
  feeder.position = [first.position[0] + fpoint[0], 0, first.position[2] + fpoint[1]];
  items.filter((i) => i.kind === "operator").forEach((human) => {
    // Cell workers keep their machine-tending assignment; only general staff take the requested task.
    if (human.props.task === "tend") return;
    human.props = { ...human.props, task: o.staffTask, sourceId: o.staffTask === "replenish" ? feeder.id : first.id, targetId: items.find((i) => i.kind === "crates")?.id ?? "", hat: o.recipe === "medical" || o.recipe === "bakery" ? "cap" : "hardhat", glasses: o.recipe === "metalworking", walkSpeed: 1 };
  });

  // Re-centre the whole plant around the origin -----------------------
  const xs = items.map((item) => item.position[0]);
  const zs = items.map((item) => item.position[2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  items.forEach((item) => {
    item.position = [Math.round((item.position[0] - cx) * 100) / 100, 0, Math.round((item.position[2] - cz) * 100) / 100];
  });
  return items;
}

/** Footprint includes conveyor/fence path points, not only component origins. */
function lineBounds(items: SceneItem[]) {
  const points: P2[] = [];
  for (const item of items) {
    points.push([item.position[0], item.position[2]]);
    if (item.points) for (const [x, z] of item.points) {
      const [dx, dz] = rotate(item.rotation * DEG, x, z);
      points.push([item.position[0] + dx, item.position[2] + dz]);
    }
  }
  return { minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])), minZ: Math.min(...points.map((p) => p[1])), maxZ: Math.max(...points.map((p) => p[1])) };
}

export function generateFactory(options: GenOptions): SceneItem[] {
  const o = { ...DEFAULT_GEN, ...options };
  const lanes = Math.max(1, Math.min(8, Math.round(o.lanes)));
  const columns = Math.max(1, Math.min(4, Math.round(o.columns)));
  // Generate each complete line independently, then reserve a real clear aisle.
  const lines: SceneItem[][] = [];
  for (let column = 0; column < columns; column += 1) for (let lane = 0; lane < lanes; lane += 1) {
    const index = column * lanes + lane;
    const line = generateSingle({ ...o, seed: o.seed + index * 13 });
    // General operators are distributed once below. Machine-tending operators stay in their cell.
    lines.push(line.filter((i) => i.kind !== "operator" || i.props.task === "tend"));
  }
  const bounds = lines.map(lineBounds);
  const pitchX = Math.max(...bounds.map((b) => b.maxX - b.minX)) + 5;
  const pitchZ = Math.max(...bounds.map((b) => b.maxZ - b.minZ)) + 4;
  lines.forEach((line, index) => {
    const column = Math.floor(index / lanes), lane = index % lanes, b = bounds[index];
    const dx = (column - (columns - 1) / 2) * pitchX - (b.minX + b.maxX) / 2;
    const dz = (lane - (lanes - 1) / 2) * pitchZ - (b.minZ + b.maxZ) / 2;
    line.forEach((item) => {
      item.position = [Math.round((item.position[0] + dx) * 100) / 100, item.position[1], Math.round((item.position[2] + dz) * 100) / 100];
      if (lines.length > 1) item.name += ` / ${index + 1}`;
    });
  });
  const all = lines.flat();
  // Staff is a plant-wide count, not multiplied by the number of production lines.
  const existingCellWorkers = all.filter((i) => i.kind === "operator").length;
  const staffCount = o.operators ? Math.max(0, Math.min(50, Math.round(o.staff))) : 0;
  const generalCount = Math.max(0, staffCount - existingCellWorkers);
  for (let i = 0; i < generalCount; i += 1) {
    const line = lines[i % lines.length], b = lineBounds(line);
    const slot = Math.floor(i / lines.length), slots = Math.ceil(generalCount / lines.length);
    const x = b.minX + (b.maxX - b.minX) * (slot + 1) / (slots + 1);
    const z = b.minZ - 1.1;
    const conveyors = line.filter((item) => item.kind === "conveyor" || item.kind === "roller");
    const source = o.staffTask === "replenish" ? line.find((item) => item.kind === "feeder") : conveyors[slot % Math.max(1, conveyors.length)];
    const destination = line.find((item) => item.kind === "crates");
    const human = makeItem("operator", [Math.round(x * 100) / 100, 0, Math.round(z * 100) / 100], 0, {
      name: i === 0 ? "Operator A. Chen" : `Operator ${String(i + 1).padStart(2, "0")}`,
      props: { task: o.staffTask, sourceId: source?.id ?? "", targetId: destination?.id ?? "", hat: o.recipe === "medical" || o.recipe === "bakery" ? "cap" : "hardhat", glasses: o.recipe === "metalworking", walkSpeed: 1 },
    });
    all.push(human);
  }
  return all;
}

export function validateFactory(items: SceneItem[]) {
  const warnings: string[] = [];
  for (const item of items) {
    if (!item.program) continue;
    const robot = new RobotRT(0, item);
    const source = items.find((i) => i.id === item.program!.sourceId);
    const target = items.find((i) => i.id === item.program!.targetId);
    if (source) {
      const conv = new ConveyorRT(source);
      const p = conv.pointAt(conv.length - 0.3);
      if (!robot.reach([p.x, p.y + 0.3, p.z])) warnings.push("Source is outside robot reach.");
    }
    if (target?.kind === "crates") {
      const pallet = new PalletRT(target), product = getProduct(target.props.product);
      for (let i = 0; i < pallet.capacity; i += 1) {
        const p = pallet.slot(i);
        if (!robot.reach([p.x, p.y + product.size[1], p.z])) {
          warnings.push("Some pallet slots are outside reach. Reduce the pattern or use an industrial robot."); break;
        }
      }
    }
    const machineItem = items.find((i) => i.id === item.program!.machineId);
    if (machineItem) {
      const p = new MachineRT(machineItem).table();
      if (!robot.reach([p.x, p.y + 0.25, p.z])) warnings.push("Processing machine is outside robot reach.");
    }
  }
  return [...new Set(warnings)];
}

export function describeFactory(o: GenOptions) {
  const style = { straight: "straight line", L: "L-shaped line", U: "U-shaped line", S: "S-curve line" }[o.style];
  return `${style} - ${o.stages} machining cell${o.stages === 1 ? "" : "s"}, ${o.cobot ? "cobot" : "industrial"} robots, ${o.rate} boxes/min`;
}

/**
 * Local, deterministic interpreter, not an online LLM. Explicit controls and
 * field labels are kept separate from narrative process keywords; users can
 * review the result before generating a layout.
 */
export function parsePrompt(text: string, base: GenOptions): GenOptions {
  const raw = text.toLowerCase().replace(/[\u2013\u2014]/g, "-");
  const t = ` ${raw.replace(/\s+/g, " ")} `;
  const next: GenOptions = { ...DEFAULT_GEN, ...base, cellInputs: [], cellOutputs: [], cellWorkers: [], cellMachines: [], processChain: [] };
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));
  const num = (re: RegExp) => { const m = t.match(re); return m ? Number(m[1]) : undefined; };
  const wordValues: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, один: 1, одна: 1, одной: 1, два: 2, две: 2, двух: 2, три: 3, трех: 3, трёх: 3, четыре: 4, четырех: 4, четырёх: 4, пять: 5, пяти: 5, шесть: 6, шести: 6, семь: 7, семи: 7, восемь: 8 };
  const n = (s: string | undefined) => s === undefined ? undefined : /^\d+$/.test(s) ? Number(s) : wordValues[s];
  const countWord = '(\\d+|one|two|three|four|five|six|seven|eight|один|одна|одной|два|две|двух|три|трех|трёх|четыре|четырех|четырёх|пять|пяти|шесть|шести|семь|семи|восемь)';
  const countBefore = (noun: string) => n(t.match(new RegExp(`${countWord}\\s+(?:(?:parallel|processing|working|рабоч\\S*|параллельн\\S*)\\s+)*${noun}`, 'u'))?.[1]);

  // A palletizing operation is not a factory type and does not erase stations.
  const recipes: [RegExp, FactoryRecipe][] = [
    [/cookie|biscuit|печень|пекарн|bakery|выпеч|dough|тесто/, "bakery"],
    [/brick|кирпич|керамик|clay|глин|обжиг|kiln/, "brick"],
    [/bottl|juice|розлив|бутыл|сок|beverage/, "bottling"],
    [/electronic|circuit|электроник|pcb|печатн.{0,12}плат/, "electronics"],
    [/medical|pharma|медицинск|лекар|флакон|vial/, "medical"],
    [/metalwork|metal working|steel|billet|металл|сталь|стальн|заготовок|фрезеровк|механообработ/, "metalworking"],
    [/turning|lathe|токар/, "turning"],
    [/parcel|logistic|посылк|логист|warehouse|склад/, "logistics"],
    [/assembly|assembl|сборк|сборочн/, "assembly"],
  ];
  const foundRecipe = recipes.find(([re]) => re.test(t));
  if (foundRecipe) next.recipe = foundRecipe[1];

  if (/u[- ]?shape|u[- ]?turn|horseshoe|п[- ]?образ|подков|u[- ]?type/.test(t)) next.style = "U";
  else if (/l[- ]?shape|corner|г[- ]?образ|углов|l[- ]?type/.test(t)) next.style = "L";
  else if (/s[- ]?(shape|curve)|snake|змей|зигзаг/.test(t)) next.style = "S";
  else if (/straight|linear|in[- ]?line|прямолин|линейн/.test(t)) next.style = "straight";

  const stageCount = num(/(?:processing cells?|process(?:ing)? stations?|ячейки обработки|количество ячеек)\s*[:=]\s*(\d+)/)
    ?? countBefore('(?:cells?|stations?|ячей\\S*|этап\\S*|станк\\S*)');
  if (stageCount !== undefined) next.stages = clamp(stageCount, 0, 8);
  if (/no (?:processing|machines?|stations?)|without (?:processing|machines?)|без (?:станков|обработки|ячеек)/.test(t)) next.stages = 0;
  const lanes = num(/(?:parallel lines?|параллельн\S* лини\S*)\s*[:=]\s*(\d+)/) ?? countBefore('(?:lines?|lanes?|лини\\S*)');
  if (lanes !== undefined) next.lanes = clamp(lanes, 1, 8);
  const explicitParallelColumns = num(/(?:parallel columns?|параллельн\S* колонн\S*)\s*[:=]\s*(\d+)/);
  const genericColumns = !/pallet pattern|схем\S* паллет|схем\S* укладки/.test(t) ? countBefore('(?:columns?|cols?|колонн\\S*)') : undefined;
  if ((explicitParallelColumns ?? genericColumns) !== undefined) next.columns = clamp((explicitParallelColumns ?? genericColumns)!, 1, 4);
  const labeledPattern = t.match(/(\d+)\s*(?:columns?|cols?|колонн\S*)\s*[xх×*]\s*(\d+)\s*(?:rows?|ряд\S*)\s*[xх×*]\s*(\d+)\s*(?:layers?|сло\S*|уровн\S*)/u);
  const barePattern = /pallet|поддон|паллет|stack|уклад/.test(t) ? t.match(/(\d+)\s*[xх×*]\s*(\d+)\s*[xх×*]\s*(\d+)/u) : null;
  const dims = labeledPattern ?? barePattern;
  if (dims) { next.cols = clamp(Number(dims[1]), 1, 6); next.rows = clamp(Number(dims[2]), 1, 6); next.layers = clamp(Number(dims[3]), 1, 8); }
  else {
    const rows = countBefore('(?:rows?|ряд\\S*)'), layers = countBefore('(?:layers?|сло\\S*|уровн\\S*)');
    if (rows !== undefined) next.rows = clamp(rows, 1, 6);
    if (layers !== undefined) next.layers = clamp(layers, 1, 8);
  }
  const rate = num(/(?:feed rate|подача|скорость подачи)\s*[:=]\s*(\d+)/)
    ?? num(/(\d+)\s*(?:box\w*|parts?|cartons?|издел\S*|короб\S*|детал\S*|items?|units?|products?)\s*(?:\/|per|a|в)\s*(?:min|мин)/)
    ?? num(/(\d+)\s*(?:\/|в|per)\s*(?:min|мин)/);
  if (rate !== undefined) next.rate = clamp(rate, 1, 60);
  const belt = num(/(\d+(?:\.\d+)?)\s*(?:m\/s|м\/с)/); if (belt !== undefined) next.beltSpeed = Math.max(0.1, Math.min(2, belt));
  const cycle = num(/(\d+)\s*(?:s|sec|second|сек|секунд)(?![a-zа-яё])/); if (cycle !== undefined) next.cycleTime = clamp(cycle, 1, 60);
  const staff = num(/(?:staff|персонал|сотрудники|операторы)\s*[:=]\s*(\d+)/)
    ?? countBefore('(?:staff|people|operators?|workers?|человек|сотрудник\\S*|оператор\\S*)');
  if (staff !== undefined) { next.staff = clamp(staff, 0, 50); next.operators = next.staff > 0; }

  // "рабочих ячейках" means work cells, not human-operated machines.
  const mentionsRobots = /robot|cobot|робот|манипулятор/.test(t);
  const humanTends = /human\s+(?:operator|worker)|human[- ]operat|ручн\S*\s+(?:обслуж|управл)|(?:оператор\S*|рабочие)\s+(?:обслуж|управл|загружа)/.test(t);
  if (humanTends && !mentionsRobots) next.cellWorkers = Array.from({ length: 8 }, () => "human" as const);
  else if (mentionsRobots) next.cellWorkers = Array.from({ length: 8 }, () => "robot" as const);
  if (/kuka|кука/.test(t)) next.robotBrand = "kuka";
  else if (/fanuc|фанук/.test(t)) next.robotBrand = "fanuc";
  else if (/industrial|промышленн|standard|larp/.test(t)) next.robotBrand = "robot";
  if (/cobot|collaborative|кобот|коллаборатив/.test(t)) next.cobot = true;
  if (/industrial|промышленн/.test(t)) next.cobot = false;
  // Mechanical is a positive choice even when vacuum is mentioned as an inferior alternative.
  if (/mechanical|механическ|parallel\s*(?:jaw|grip)|jaw gripper|параллельн\S*\s*захват/.test(t)) next.gripper = "parallel";
  else if (/three[- ]?finger|тр[её]хпальц/.test(t)) next.gripper = "three-finger";
  else if (/magnet|магнит/.test(t)) next.gripper = "magnetic";
  else if (/soft gripper|мягк\S* захват/.test(t)) next.gripper = "soft";
  else if (/vacuum|вакуум|suction|присоск/.test(t)) next.gripper = "vacuum";
  if (/no fence|without fence|без огражд|без забор/.test(t)) next.fences = false;
  else if (/fenc|guard|safety zone|огражд|зон\S* безопасности/.test(t)) next.fences = true;
  if (/no operator|without operator|без оператор|без персонал/.test(t)) { next.operators = false; next.staff = 0; }
  if (/no cabinet|без шкаф/.test(t)) next.cabinets = false;

  const resolveProductName = (value: string) => {
    const q = value.toLowerCase().trim();
    const exact = PRODUCTS.find((p) => p.id === q || p.name.toLowerCase() === q || p.ru.toLowerCase() === q);
    if (exact) return exact.id;
    if (/steel billet|billet|стальн\S*\s+заготов|заготов\S*\s+из\s+стал/.test(q)) return "billet";
    if (/machined part|finished metal|готов\S*\s+металлическ\S*\s+детал|обработанн\S*\s+детал/.test(q)) return "machined";
    return PRODUCTS.find((p) => p.tags.some((tag) => tag.length >= 4 && q.includes(tag)))?.id;
  };
  // Labels are line-scoped so one field cannot consume the next field.
  const inputLabel = raw.match(/(?:input product|input|входной продукт|сырь[её])\s*[:=]\s*([^\n;]+)/u);
  const outputLabel = raw.match(/(?:output product|output|выходной продукт|готовый продукт)\s*[:=]\s*([^\n;]+)/u);
  const from = raw.match(/(?:from|из)\s+([^,.;\n]+?)\s+(?:to|into|в)\s+([^,.;\n]+)/u);
  const input = inputLabel ? resolveProductName(inputLabel[1]) : from ? resolveProductName(from[1]) : undefined;
  const output = outputLabel ? resolveProductName(outputLabel[1]) : from ? resolveProductName(from[2]) : undefined;
  if (input) next.product = input;
  if (output) next.outputProduct = output;

  // Ordered actions are explicit operations only. Moving to a pallet is handled
  // by the final palletizer; quality control is never an assembly operation.
  const stageKeywords: [RegExp, GenOptions["machineKind"]][] = [
    [/weld|свар/gu, "weld"], [/paint|окрас|покрас/gu, "paint"], [/press|штамп/gu, "press"],
    [/grind|шлифов|полир/gu, "grinder"], [/milling|mill\b|фрезер|\bcnc\b/gu, "cnc"],
    [/lathe|turning|токар/gu, "lathe"], [/assembly|assembl|сборк|собрать/gu, "assembly"],
    [/quality\s+(?:control|inspection)|\binspect(?:ion)?\b|проверк|контрол(?:ь|я|ю)|испытан/gu, "inspection"],
    [/filling|fill\b|наполн|фасовк|дозировк/gu, "packaging"],
    [/pack(?:ing|aging)?\b|упаковк/gu, "packaging"], [/kiln|firing|обжиг|печь/gu, "kiln"],
    [/cut(?:ting)?\b|резк|раскрой/gu, "cutter"],
  ];
  const hits: { machine: GenOptions["machineKind"]; index: number }[] = [];
  stageKeywords.forEach(([pattern, machine]) => {
    for (const match of raw.matchAll(pattern)) {
      const index = match.index ?? 0;
      const prefix = raw.slice(Math.max(0, index - 12), index);
      if (/(?:no|without|без)\s*$/.test(prefix)) continue;
      hits.push({ machine, index });
    }
  });
  hits.sort((a, b) => a.index - b.index);
  const ordered = hits.filter((hit, i) => !hits.slice(0, i).some((previous) => previous.machine === hit.machine && hit.index - previous.index < 28));
  const selected = ordered.slice(0, stageCount === undefined ? 8 : clamp(stageCount, 0, 8));
  if (selected.length) {
    const recipe = FACTORY_RECIPES.find((r) => r.id === next.recipe) ?? FACTORY_RECIPES[0];
    const baseInput = next.product === "auto" ? recipe.input : next.product;
    const finalOutput = next.outputProduct === "auto" ? recipe.output : next.outputProduct;
    const metal = next.recipe === "metalworking" || next.recipe === "turning";
    const intermediate: Partial<Record<GenOptions["machineKind"], string>> = { weld: "welded", paint: "painted", press: "stamped", grinder: "machined", cnc: "machined", lathe: "machined", packaging: "carton", kiln: "brick", cutter: metal ? "billet" : "window", assembly: "phone" };
    const chain: ProcessStep[] = [];
    selected.forEach(({ machine }, index) => {
      const previous = index === 0 ? baseInput : chain[index - 1].output;
      const result = machine === "inspection" ? previous : index === selected.length - 1 ? finalOutput : (intermediate[machine] ?? finalOutput);
      chain.push({ machine, input: previous, output: result, worker: humanTends && !mentionsRobots ? "human" : "robot" });
    });
    next.product = baseInput; next.outputProduct = finalOutput; next.processChain = chain;
    if (stageCount === undefined) next.stages = Math.max(next.stages, chain.length);
    next.cellMachines = chain.map((step) => step.machine);
    next.cellWorkers = chain.map((step) => step.worker === "human" ? "human" : "robot");
    next.cellInputs = chain.map((step) => step.input); next.cellOutputs = chain.map((step) => step.output);
  }
  return next;
}
