/**
 * Node-graph data model for the AI Factory generator.
 *
 * The graph is the source of truth; it compiles down to `GenOptions` and then to scene
 * items through the existing, verified layout engine. That keeps the editor and the
 * factory builder decoupled: new node types only need to add a definition, never touch
 * the layout code.
 *
 * Naming follows the references this was modelled on:
 * - ComfyUI: a registry of node definitions with typed inputs/outputs and one `evaluate`.
 * - UE Blueprints: typed data pins, values pulled lazily along wires.
 * - Dataflow engines: a DAG evaluated in topological order with cycle diagnostics.
 */
import type { GenOptions, ProcessStep } from '../../sim/generator';
import type { SceneItem } from '../../types';

/** Port types. Two ports connect when their types match exactly. */
export type PortType =
  | 'signal'   // runtime control signal; may form feedback loops
  | 'flow'     // material handoff between physical modules
  | 'mount'    // physical placement only, never a runtime signal
  | 'machine'  // machine attachment to a robot
  | 'intent'   // tagged meaning extracted from a prompt
  | 'config'   // partial GenOptions patch
  | 'cells'    // ordered process chain
  | 'robot'    // RobotSpec
  | 'layout'   // LayoutSpec
  | 'pallet'   // PalletSpec
  | 'staff'    // StaffSpec
  | 'safety'   // SafetySpec
  | 'plant'    // compiled factory description
  | 'items'    // scene items
  | 'text'     // free text
  | 'number'   // numeric value
  | 'boolean'; // flag

export interface PortDef {
  key: string;
  label: string;
  type: PortType;
  /** Required inputs must be connected, otherwise the node is reported as incomplete. */
  required?: boolean;
  /** Accepts several wires (merged left to right); otherwise one wire replaces the old one. */
  many?: boolean;
  help?: string;
}

export type ParamKind = 'number' | 'select' | 'boolean' | 'text' | 'string' | 'color' | 'nodeRef' | 'seed' | 'product' | 'multi' | 'product-list';

export interface ParamDef {
  key: string;
  label: string;
  kind: ParamKind;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  /** Permit typed numeric values beyond the convenient slider bounds. */
  unbounded?: boolean;
  /** Internal migration metadata, not an editable setting. */
  hidden?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
}

export type NodeCategory = 'Input' | 'Process' | 'Resources' | 'Layout' | 'Output';

/** Everything a node needs to produce its outputs. Inputs may be arrays when `many`. */
export interface EvalContext {
  node: GraphNode;
  params: Record<string, unknown>;
  inputs: Record<string, unknown[]>;
  graph: NodeGraph;
  /** Nodes already evaluated upstream, for nodes that inspect their neighbours. */
  results: Map<string, Record<string, unknown>>;
  report: (message: string, severity?: Diagnostic['severity']) => void;
}

export interface NodeDef {
  type: string;
  title: string;
  category: NodeCategory;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  /** Short line under the title in the editor. */
  summary?: (params: Record<string, unknown>) => string;
  evaluate: (ctx: EvalContext) => Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type: string;
  /** Editor position in graph space. */
  x: number;
  y: number;
  params: Record<string, unknown>;
  /** User-facing override of the definition title. */
  title?: string;
  /** Collapsed nodes hide parameters but keep their connection ports. */
  collapsed?: boolean;
  /** Settings for independent, numbered signal I/O pairs. */
  io?: Record<string, { mode?: string; color?: string; material?: string; materialRef?:string; programSource?: string; programTarget?: string; programMode?: string }>;
}

export interface PortRef { node: string; port: string }

export interface GraphLink {
  id: string;
  from: PortRef;
  to: PortRef;
}

/** Visual frame around graph nodes. Frames do not participate in compilation. */
export interface GraphGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
}

export interface NodeGraph {
  version: 1;
  /** Existing version-1 graphs without this marker are upgraded to explicit pickup sensors. */
  signalSchema?: 1 | 2;
  nodes: GraphNode[];
  links: GraphLink[];
  /** Optional editor-only frames; old version-1 graphs need not contain them. */
  groups?: GraphGroup[];
  /** Prompt text kept with the graph so a saved graph re-analyses identically. */
  note?: string;
}

export interface Diagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  port?: string;
}

/* ----- typed payloads carried on the wires ----- */

export interface Tag {
  id: string;
  kind: string;
  label: string;
  weight: number;
  /** Character range in the source text, used to show what matched. */
  span: [number, number];
  term: string;
  negated: boolean;
}

export interface IntentPayload {
  tags: Tag[];
  /** Options the text asked for, already validated against the tag rules. */
  patch: Partial<GenOptions>;
  chain: ProcessStep[];
  notes: string[];
  /** 0..1 — how much of the request was understood. */
  confidence: number;
}

/**
 * Section payloads are *partial by design*: a node only emits the fields the user
 * actually set. Anything left out is decided by the prompt or the defaults, so an
 * untouched node never silently overrides what the sentence asked for.
 */
export interface RobotSpec {
  brand?: 'robot' | 'kuka' | 'fanuc';
  cobot?: boolean;
  gripper?: GenOptions['gripper'];
  payload?: number;
  speed?: number;
}

export interface LayoutSpec {
  style?: GenOptions['style'];
  lanes?: number;
  columns?: number;
  seed?: number;
}

export interface PalletSpec { cols?: number; rows?: number; layers?: number }

export interface StaffSpec {
  enabled?: boolean;
  count?: number;
  task?: GenOptions['staffTask'];
}

export interface SafetySpec { fences?: boolean; cabinets?: boolean }

export interface ProcessChain {
  steps: ProcessStep[];
  /** True when the chain came from the prompt rather than an explicit node. */
  fromText?: boolean;
}

export interface PlantResult {
  options: GenOptions;
  items: SceneItem[];
  summary: string;
  warnings: string[];
}
