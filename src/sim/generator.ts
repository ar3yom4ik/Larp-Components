import type { GripperKind, SceneItem } from "../types";
import { isRobotKind } from "../utils/kinds";
import { makeItem } from "../data/library";
import { programToCode } from "./programCode";
import { samplePath } from "./spline";
import { ConveyorRT, MachineRT, PalletRT, RobotRT } from "./engine";
import { getProduct, MACHINE_KINDS } from "../data/products";
import { analyzePrompt, mergeIntent } from "../gen/prompt";

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
      const p = conv.pointAt(Math.max(0, conv.length - (item.program!.pickupBack ?? 0.3)));
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
/**
 * Natural-language -> options, for the form dialog and any external caller.
 *
 * The parsing lives in `gen/prompt.ts` (tags -> intent -> coherence), which is also what
 * the node graph uses. Keeping one implementation means the graph and the form can never
 * disagree about what a sentence means; this wrapper only merges the intent over a base
 * record and returns a complete `GenOptions`.
 */
export function parsePrompt(text: string, base: GenOptions): GenOptions {
  const complete: GenOptions = {
    ...DEFAULT_GEN,
    ...base,
    cellInputs: [...(base.cellInputs ?? [])],
    cellOutputs: [...(base.cellOutputs ?? [])],
    cellWorkers: [...(base.cellWorkers ?? [])],
    cellMachines: [...(base.cellMachines ?? [])],
    processChain: [...(base.processChain ?? [])],
  };
  const intent = analyzePrompt(text, { base: complete, keepUnmentioned: true });
  return mergeIntent(complete, intent);
}
