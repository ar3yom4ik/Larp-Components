import type { Category, ComponentDef, ComponentKind, SceneItem, Vec3 } from "../types";
import { blankScript } from "../sim/scripts";

export const CATEGORIES: ("All" | Category)[] = [
  "All",
  "Robots",
  "Conveyors",
  "Machines",
  "Logistics",
  "Storage",
  "Safety",
  "Building",
  "Automation",
  "Lighting",
];

export const COMPONENTS: ComponentDef[] = [
  { kind: "platform", name: "Elevated Platform", category: "Building", description: "Raised factory floor with adjustable dimensions and structural legs.", accent: "#8298aa", specs: [{label: "Deck", value: "Adjustable"}], defaults: { width: 4, depth: 4, height: 2, surfaceMaterial: "steel" } },
  { kind: "stairs", name: "Industrial Stairs", category: "Building", description: "Adjustable stepped access between a lower level and an elevated platform.", accent: "#d6ac4a", specs: [{label: "Access", value: "Multi-level"}], defaults: { width: 1.2, length: 4, height: 2, surfaceMaterial: "steel" } },
  { kind: "imported-model", name: "Imported 3D model", category: "Building", description: "A local imported visual model with editable materials.", accent: "#75b9c8", specs: [{label:"Source",value:"Local file"}], defaults: {} },
  {
    kind: "robot",
    name: "6-Axis Industrial Robot",
    category: "Robots",
    description: "High-payload articulated robot, programmable with the Larp robot API.",
    badge: "Popular",
    accent: "#6DBE45",
    specs: [
      { label: "Payload", value: "12 kg" },
      { label: "Reach", value: "2.3 m" },
    ],
    defaults: { payload: 12, speed: 70, gripper: "vacuum", outputMode: "operation-end" },
  },
  {
    kind: "cobot",
    name: "Collaborative Robot",
    category: "Robots",
    description: "Safe, compact arm for collaborative work cells.",
    accent: "#8CCB5E",
    specs: [
      { label: "Payload", value: "5 kg" },
      { label: "Reach", value: "1.6 m" },
    ],
    defaults: { payload: 5, speed: 60, gripper: "parallel", outputMode: "operation-end" },
  },
  {
    kind: "feeder",
    name: "Box Feeder",
    category: "Conveyors",
    description: "Drops cartons onto the belt at a configurable rate.",
    badge: "New",
    accent: "#E0A030",
    specs: [
      { label: "Rate", value: "15 /min" },
      { label: "Drop", value: "0.45 m" },
    ],
    defaults: { interval: 4, active: true, product: "carton", requireSupply: false },
  },
  {
    kind: "conveyor",
    name: "Spline Conveyor",
    category: "Conveyors",
    description: "Belt conveyor defined by a spline - drag the handles to reshape it.",
    badge: "Spline",
    accent: "#4DA3E8",
    specs: [
      { label: "Width", value: "0.62 m" },
      { label: "Speed", value: "0.6 m/s" },
    ],
    defaults: { speed: 0.6, width: 0.62, active: true, stopper: false },
  },
  {
    kind: "roller",
    name: "Roller Conveyor",
    category: "Conveyors",
    description: "Powered roller transport section, also spline based.",
    accent: "#7FAAD6",
    specs: [
      { label: "Width", value: "0.62 m" },
      { label: "Speed", value: "0.8 m/s" },
    ],
    defaults: { speed: 0.8, width: 0.62, active: true, stopper: false },
  },
  {
    kind: "cnc",
    name: "CNC Machining Center",
    category: "Machines",
    description: "Enclosed machining cell with a load tray the robot can tend.",
    accent: "#E8A245",
    specs: [
      { label: "Cycle", value: "6 s" },
      { label: "Spindle", value: "12k rpm" },
    ],
    defaults: { cycleTime: 6, inputProduct: "any", outputProduct: "machined" },
  },
  {
    kind: "press",
    name: "Hydraulic Press",
    category: "Machines",
    description: "Forming station with guarded front opening.",
    accent: "#E58A62",
    specs: [
      { label: "Force", value: "250 t" },
      { label: "Cycle", value: "18 s" },
    ],
    defaults: { cycleTime: 6, force: 250, inputProduct: "any", outputProduct: "stamped" },
  },
  {
    kind: "weld",
    name: "Robotic Weld Cell",
    category: "Machines",
    description: "Two-station welding cell with fume extraction.",
    accent: "#E8C24D",
    specs: [
      { label: "Stations", value: "2" },
      { label: "Cycle", value: "64 s" },
    ],
    defaults: { cycleTime: 7, stations: 2, inputProduct: "any", outputProduct: "welded" },
  },
  {
    kind: "packaging",
    name: "Case Packer",
    category: "Machines",
    description: "End-of-line carton erecting and packing machine.",
    accent: "#C98BD0",
    specs: [
      { label: "Rate", value: "18 ppm" },
      { label: "Format", value: "RSC" },
    ],
    defaults: { cycleTime: 4, inputProduct: "any", outputProduct: "carton" },
  },
  {
    kind: "amr",
    name: "Autonomous Mobile Robot",
    category: "Logistics",
    description: "LiDAR-guided AMR with configurable transport loop.",
    accent: "#35B5C4",
    specs: [
      { label: "Capacity", value: "500 kg" },
      { label: "Speed", value: "1.2 m/s" },
    ],
    defaults: { capacity: 500, speed: 1.2 },
  },
  {
    kind: "forklift",
    name: "Counterbalance Forklift",
    category: "Logistics",
    description: "Manual logistics vehicle for pallet handling.",
    accent: "#F0A92E",
    specs: [
      { label: "Lift", value: "4.8 m" },
      { label: "Load", value: "2.0 t" },
    ],
    defaults: { lift: 4.8, load: 2 },
  },
  {
    kind: "rack",
    name: "Pallet Racking",
    category: "Storage",
    description: "Four-level selective pallet storage bay.",
    accent: "#E07B2A",
    specs: [
      { label: "Levels", value: "4" },
      { label: "Bays", value: "2" },
    ],
    defaults: { levels: 4, bays: 2 },
  },
  {
    kind: "crates",
    name: "Euro Pallet",
    category: "Storage",
    description: "Pallet the robot stacks boxes onto - grid size is configurable.",
    badge: "Target",
    accent: "#B88A55",
    specs: [
      { label: "Size", value: "1.2 x 0.8" },
      { label: "Slots", value: "24" },
    ],
    defaults: { cols: 3, rows: 2, layers: 4, gap: 0.04, product: "carton", retainFull: false },
  },
  {
    kind: "fence",
    name: "Safety Fence",
    category: "Safety",
    description: "Modular perimeter guarding.",
    accent: "#F2B705",
    specs: [
      { label: "Height", value: "2.0 m" },
      { label: "Length", value: "3.0 m" },
    ],
    defaults: { height: 2, panelWidth: 1.5, gateOpen: false, gateSegment: 0 },
  },
  {
    kind: "cabinet",
    name: "Control Cabinet",
    category: "Safety",
    description: "PLC and safety controller cabinet for the line.",
    accent: "#8DA2C7",
    specs: [
      { label: "Type", value: "PLC-S7" },
      { label: "IP", value: "IP54" },
    ],
    defaults: { type: "PLC-S7", voltage: 400 },
  },
  {
    kind: "wall",
    name: "Partition Wall",
    category: "Building",
    description: "Floor-to-ceiling modular partition panel.",
    accent: "#9FB3C8",
    specs: [
      { label: "Length", value: "6.0 m" },
      { label: "Height", value: "4.0 m" },
    ],
    defaults: { length: 6, height: 4, surfaceMaterial: "mid" },
  },
  {
    kind: "operator",
    name: "Operator",
    category: "Building",
    description: "Human mannequin for safety and ergonomics checks.",
    accent: "#2FB7C6",
    specs: [
      { label: "Height", value: "1.78 m" },
      { label: "Task", value: "Assembly" },
    ],
    defaults: { task: "patrol", walkSpeed: 1, hat: "hardhat", glasses: false, ears: false, headphones: false, earrings: false, sourceId: "", targetId: "" },
  },
  {
    kind: "kuka", name: "KUKA Industrial Robot", category: "Robots",
    description: "Orange heavy-payload articulated robot for demanding cells.",
    badge: "KUKA", accent: "#F07B30",
    specs: [{ label: "Payload", value: "16 kg" }, { label: "Reach", value: "2.4 m" }],
    defaults: { payload: 16, speed: 78, gripper: "parallel", brand: "KUKA", outputMode: "operation-end" },
  },
  {
    kind: "fanuc", name: "FANUC Industrial Robot", category: "Robots",
    description: "Yellow high-speed robot for tending, assembly and palletizing.",
    badge: "FANUC", accent: "#F2C230",
    specs: [{ label: "Payload", value: "12 kg" }, { label: "Reach", value: "2.2 m" }],
    defaults: { payload: 12, speed: 80, gripper: "vacuum", brand: "FANUC", outputMode: "operation-end" },
  },
  {
    kind: "mobile-robot", name: "Mobile Manipulator", category: "Robots",
    description: "Wheeled delivery robot that replaces a human transport task.",
    badge: "Mobile", accent: "#4BC1B8",
    specs: [{ label: "Capacity", value: "40 kg" }, { label: "Task", value: "Carry" }],
    defaults: { task: "carry", walkSpeed: 1.3, sourceId: "", targetId: "", payload: 40, speed: 60, gripper: "parallel" },
  },
  {
    kind: "collector", name: "Receive Box", category: "Logistics",
    description: "Open bin that catches products falling from an open conveyor and counts them.",
    badge: "Counter", accent: "#D0A263",
    specs: [{ label: "Capacity", value: "500 pcs" }, { label: "Count", value: "Live" }],
    defaults: { capacity: 500, width: 1.0, depth: 0.8, height: 0.55 },
  },
  {
    kind: "button", name: "Push Button", category: "Automation",
    description: "Manual, toggle or timed control that emits a signal over a wire.",
    accent: "#DE5C52",
    specs: [{ label: "Signal", value: "Boolean" }, { label: "Mode", value: "Toggle" }],
    defaults: { signal: false, activeDuration: 0, connectedTo: "", address: "DI-01" },
  },
  {
    kind: "laser", name: "Laser Trigger", category: "Automation",
    description: "Through-beam emitter and receiver. A blocked beam sends a part-present signal.",
    badge: "Sensor", accent: "#F05C5C",
    specs: [{ label: "Beam", value: "3.0 m" }, { label: "Type", value: "PNP" }],
    defaults: { range: 3.0, signal: false, connectedTo: "", address: "DI-02", normallyClosed: false },
  },
  {
    kind: "color-sensor", name: "Color Sensor", category: "Automation",
    description: "Laser-based material color detector with an independent output for each selected color.",
    badge: "Sensor", accent: "#C084FC",
    specs: [{ label: "Beam", value: "3.0 m" }, { label: "Outputs", value: "Per material" }],
    defaults: { range: 3.0, signal: false, connectedTo: "", address: "DI-04", autoRange: true },
  },
  {
    kind: "sensor", name: "Proximity Sensor", category: "Automation",
    description: "Detects parts within a configurable radius and emits a signal.",
    accent: "#63C5F0",
    specs: [{ label: "Range", value: "0.8 m" }, { label: "Output", value: "24 V" }],
    defaults: { radius: 0.8, signal: false, connectedTo: "", address: "DI-03" },
  },
  {
    kind: "plc", name: "PLC Control", category: "Automation",
    description: "Small local signal controller. Wires connect robot and machine logic.",
    accent: "#8FA9C2",
    specs: [{ label: "Inputs", value: "8" }, { label: "Outputs", value: "8" }],
    defaults: { connectedTo: "", address: "PLC-01", signal: false },
  },
  {
    kind: "light", name: "Factory Light", category: "Lighting",
    description: "Work light for the factory. Works with shadows and enhanced illumination.",
    accent: "#FFE5A6",
    specs: [{ label: "Type", value: "Spot" }, { label: "Power", value: "120 W" }],
    defaults: { lightType: "spot", intensity: 35, color: "#FFF2D2", castShadow: true, distance: 8, height: 4.2 },
  },
  {
    kind: "paint", name: "Paint Station", category: "Machines",
    description: "Spray booth where robots apply the target finish to an existing product.",
    accent: "#EBCB76",
    specs: [{ label: "Cycle", value: "5 s" }, { label: "Finish", value: "Gloss" }],
    defaults: { cycleTime: 5, inputProduct: "any", outputProduct: "painted", paintColor: "#D6534C" },
  },
  {
    kind: "cutter", name: "Laser Cutter", category: "Machines",
    description: "Precision cutting cell for sheet, board and panel products.",
    accent: "#F5A555",
    specs: [{ label: "Power", value: "6 kW" }, { label: "Cycle", value: "7 s" }],
    defaults: { cycleTime: 7, inputProduct: "any", outputProduct: "window" },
  },
  {
    kind: "inspection", name: "Quality Inspection Station", category: "Machines",
    description: "Vision-based quality control for individual parts; inspected parts keep their identity.",
    badge: "Quality", accent: "#58B9DD",
    specs: [{ label: "Cycle", value: "4 s" }, { label: "Type", value: "Machine vision" }],
    defaults: { cycleTime: 4, inputProduct: "any", outputProduct: "machined" },
  },
  {
    kind: "assembly", name: "Assembly Station", category: "Machines",
    description: "Combines several input parts into one assembled object.",
    badge: "Assembly", accent: "#96B7D1",
    specs: [{ label: "Parts", value: "2" }, { label: "Cycle", value: "6 s" }],
    defaults: { cycleTime: 6, inputProduct: "any", outputProduct: "window", requiredParts: 2 },
  },
  {
    kind: "kiln", name: "Industrial Kiln", category: "Machines",
    description: "Long-cycle furnace for ceramics, bricks and glass.",
    accent: "#DC8154",
    specs: [{ label: "Temp", value: "1150 °C" }, { label: "Cycle", value: "12 s" }],
    defaults: { cycleTime: 12, inputProduct: "clay", outputProduct: "brick" },
  },
  {
    kind: "lathe", name: "CNC Turning Lathe", category: "Machines",
    description: "High-precision turning center with automatic chuck and tailstock.",
    accent: "#79A6C7",
    specs: [{ label: "Speed", value: "4,500 rpm" }, { label: "Cycle", value: "8 s" }],
    defaults: { cycleTime: 8, inputProduct: "any", outputProduct: "machined", spindle: 4500 },
  },
  {
    kind: "grinder", name: "Surface Grinder", category: "Machines",
    description: "Finishing cell for flat surfaces, tools and hardened parts.",
    accent: "#A4B3C1",
    specs: [{ label: "Surface", value: "0.4 µm" }, { label: "Cycle", value: "9 s" }],
    defaults: { cycleTime: 9, inputProduct: "any", outputProduct: "machined" },
  },
  {
    kind: "light-panel", name: "LED Ceiling Panel", category: "Lighting",
    description: "Large diffuse ceiling panel for even, shadow-soft production light.",
    accent: "#FFF4D7",
    specs: [{ label: "Type", value: "Rect area" }, { label: "Power", value: "80 W" }],
    defaults: { lightType: "area", intensity: 25, color: "#fff4dc", castShadow: false, distance: 10, height: 4.5 },
  },
  {
    kind: "light-flood", name: "High-Bay Flood Light", category: "Lighting",
    description: "Focused high-bay fixture for robot cells and inspection areas.",
    accent: "#FFE2A8",
    specs: [{ label: "Type", value: "Spot" }, { label: "Power", value: "200 W" }],
    defaults: { lightType: "spot", intensity: 55, color: "#ffe8c2", castShadow: true, distance: 14, height: 5.0 },
  },
];

export function getDef(kind: ComponentKind): ComponentDef {
  return COMPONENTS.find((component) => component.kind === kind) ?? COMPONENTS.find((component) => component.kind === "robot")!;
}

let itemCounter = 0;

export function makeItem(
  kind: ComponentKind,
  position: Vec3 = [0, 0, 0],
  rotation = 0,
  overrides: Partial<SceneItem> = {},
): SceneItem {
  const def = getDef(kind);
  itemCounter += 1;
  const isConveyor = kind === "conveyor" || kind === "roller";
  const isRobot = ["robot", "cobot", "kuka", "fanuc"].includes(kind);
  return {
    id: `item-${Date.now().toString(36)}-${itemCounter}`,
    kind,
    name: def.name,
    position,
    rotation,
    scale: 1,
    color: def.accent,
    visible: true,
    locked: false,
    props: { ...def.defaults },
    points: kind === "platform" ? [[-Number(overrides.props?.width ?? 4)/2,-Number(overrides.props?.depth ?? 4)/2],[Number(overrides.props?.width ?? 4)/2,-Number(overrides.props?.depth ?? 4)/2],[Number(overrides.props?.width ?? 4)/2,Number(overrides.props?.depth ?? 4)/2],[-Number(overrides.props?.width ?? 4)/2,Number(overrides.props?.depth ?? 4)/2]] : kind === "wall" ? [[-Number(overrides.props?.length ?? 6)/2,0],[Number(overrides.props?.length ?? 6)/2,0]] : kind === "fence" ? [[-1.5, 0], [1.5, 0]] : isConveyor
      ? [
          [-2.5, 0],
          [0, 0],
          [2.5, 0],
        ]
      : undefined,
    script: isRobot ? blankScript : undefined,
    ...overrides,
  };
}
