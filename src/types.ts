export type Category =
  | "Robots"
  | "Conveyors"
  | "Machines"
  | "Logistics"
  | "Storage"
  | "Safety"
  | "Building"
  | "Automation"
  | "Lighting";

export type ComponentKind =
  | "robot"
  | "cobot"
  | "conveyor"
  | "roller"
  | "feeder"
  | "cnc"
  | "press"
  | "weld"
  | "packaging"
  | "amr"
  | "forklift"
  | "rack"
  | "crates"
  | "fence"
  | "cabinet"
  | "wall"
  | "operator"
  | "kuka"
  | "fanuc"
  | "mobile-robot"
  | "collector"
  | "button"
  | "laser"
  | "sensor"
  | "plc"
  | "light"
  | "paint"
  | "cutter"
  | "inspection"
  | "assembly"
  | "kiln"
  | "lathe"
  | "grinder"
  | "light-panel"
  | "light-flood"
  | "imported-model"
  | "platform"
  | "stairs";

export type Vec3 = [number, number, number];

export type GripperKind = "vacuum" | "parallel" | "three-finger" | "magnetic" | "soft" | "paint";

export interface RobotProgram {
  mode: "palletize" | "transfer" | "tend" | "paint" | "assemble";
  sourceId: string;
  targetId: string;
  machineId?: string;
  repeat: boolean;
  delay: number;
  clearance: number;
  paintColor?: string;
}

export interface ComponentSpec {
  label: string;
  value: string;
}

export interface ComponentDef {
  kind: ComponentKind;
  name: string;
  category: Category;
  description: string;
  badge?: string;
  accent: string;
  specs: ComponentSpec[];
  defaults: Record<string, string | number | boolean>;
}

/** All source bytes are bundled into the project so imports remain portable. */
export interface ModelResource { path: string; dataUrl: string }
export interface ModelAsset { id: string; entry: string; files: ModelResource[] }
export type ModelUnits = "auto" | "m" | "mm" | "cm" | "in" | "ft";
export type TextureSlot = "map" | "normalMap" | "roughnessMap" | "metalnessMap" | "aoMap" | "emissiveMap" | "alphaMap" | "bumpMap" | "displacementMap";
export interface TextureOverride { name: string; dataUrl: string }
export interface ImportedMaterial {
  name: string; color: string; roughness: number; metalness: number; opacity: number;
  emissive: string; emissiveIntensity: number; doubleSided: boolean;
  mapStrength: number; normalStrength: number; roughnessStrength: number; metalnessStrength: number;
  aoStrength: number; emissiveMapStrength: number; alphaStrength: number; bumpStrength: number; displacementStrength: number;
  present: TextureSlot[];
  /** Missing key means preserve the source; null explicitly removes the map. */
  textures: Partial<Record<TextureSlot, TextureOverride | null>>;
}
export interface ImportedModelData {
  asset: ModelAsset;
  axis: "y" | "z";
  units: ModelUnits;
  materials: ImportedMaterial[];
  meshCount: number;
  triangleCount: number;
  /** Source-space bounds before the axis/unit conversion; absent on older imports. */
  sourceSize?: Vec3;
  rigged?: boolean;
  animationNames?: string[];
}
export type WorkerMotionRole = "idle" | "walk" | "work";
export interface WorkerMotion { asset: ModelAsset; clipIndex: number; clipNames: string[] }
export interface WorkerSettings {
  appearance: "default" | "classic" | "custom";
  model?: ImportedModelData;
  motions: Partial<Record<WorkerMotionRole, WorkerMotion>>;
  height: number;
  groundFeet?: boolean;
  forward: "+z" | "-z" | "+x" | "-x";
}

export interface SceneItem {
  id: string;
  kind: ComponentKind;
  name: string;
  position: Vec3;
  /** Yaw in degrees (the legacy rotation field). */
  rotation: number;
  /** Optional X/Z Euler angles in degrees; omitted in legacy projects. */
  rotationX?: number;
  rotationZ?: number;
  scale: number;
  color?: string;
  locked?: boolean;
  visible?: boolean;
  props: Record<string, string | number | boolean>;
  /** Additional signal destinations. The first remains in props.connectedTo
   * for compatibility with older single-target projects. */
  signalTargets?: string[];
  /** Spline control points in item-local XZ coordinates (conveyors). */
  points?: [number, number][];
  /** Local Y offsets for conveyor/roller spline points; absent in legacy projects. */
  pointHeights?: number[];
  /** Robot program (JavaScript using the Larp robot API). */
  script?: string;
  program?: RobotProgram;
  /** Present only for imported-model components. */
  imported?: ImportedModelData;
  /** Rig, appearance and optional per-role animation assets for human operators. */
  worker?: WorkerSettings;
}

export interface LayoutPreset {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  accent: string;
  stats: { label: string; value: string }[];
  items: SceneItem[];
}

export type CameraPreset = "iso" | "top" | "front" | "back" | "left" | "right" | "room";
export type ToolMode = "select" | "move" | "rotate";
