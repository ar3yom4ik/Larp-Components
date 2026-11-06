/** The numbered control channels used by the factory graph and generated scenes.
 * A channel's function describes both what its input does and what its output
 * reports. Material-flow edges are deliberately not signal channels. */
export interface SignalChannel {
  port: number;
  mode: string;
  /** Absent means inherit the component's wire colour. */
  color?: string;
  /** Base material color selected for a color-sensor output. */
  material?: string;
  /** Optional picker identity; the matched base color remains in material. */
  materialRef?: string;
}

export interface SignalRoute {
  output: number;
  targetId: string;
  input: number;
}

export interface SignalFunction {
  value: string;
  label: string;
  help: string;
}

/** New detector/button nodes are sources, never signal receivers. */
export function signalAcceptsInput(kind: string): boolean {
  return !['part.laser','part.sensor','part.button','part.color-sensor','laser','sensor','button','color-sensor'].includes(kind);
}

const sensor: SignalFunction[] = [
  {value:'detected', label:'Detected', help:'The output is high while a part is detected.'},
  {value:'clear', label:'Clear', help:'The output is high while the enabled detector is clear.'},
  // Kept for old saved projects; source-only UIs do not offer this legacy mode.
  {value:'relay', label:'Relay input', help:'Pass this input through to this output without using the detector.'},
];
const button: SignalFunction[] = [
  {value:'pressed', label:'Pressed', help:'The output is high while the button is pressed.'},
  {value:'relay', label:'Relay input', help:'Pass this input through to this output.'},
  {value:'invert', label:'Invert input', help:'Output the inverse of this connected input.'},
];
const colorSensor: SignalFunction[] = [
  {value:'match',label:'Material colour detected',help:'High when a part or object in the beam has the selected base material colour.'},
];
const plc: SignalFunction[] = [
  {value:'relay', label:'Relay input', help:'Pass this input through to this output.'},
  {value:'invert', label:'Invert input', help:'Output the inverse of this connected input.'},
];
const robot: SignalFunction[] = [
  {value:'operation-end', label:'Start → operation end', help:'A rising input starts one operation; the output pulses when an operation ends.'},
  {value:'moving', label:'Start → moving', help:'A rising input starts one operation; the output is high while the robot moves or holds a part.'},
];
const feeder: SignalFunction[] = [
  {value:'spawned', label:'Feed → part released', help:'A rising input releases one part; the output pulses when a part is released.'},
];
const conveyor: SignalFunction[] = [
  {value:'running', label:'Run → running', help:'An active input runs the conveyor; the output is high while it is running.'},
  {value:'stopped', label:'Run → stopped', help:'An active input runs the conveyor; the output is high while it is stopped.'},
];
const machine: SignalFunction[] = [
  {value:'busy', label:'Enable → busy', help:'A connected input enables starting a machine cycle; the output is high during the cycle.'},
  {value:'ready', label:'Enable → ready', help:'A connected input enables starting a machine cycle; the output is high while the machine is idle.'},
];
const human: SignalFunction[] = [
  {value:'working', label:'Enable → working', help:'A connected input enables the next task; the output is high while the operator is working.'},
  {value:'completed', label:'Enable → completed', help:'A connected input enables the next task; the output pulses when the operator completes a task.'},
];
const pallet: SignalFunction[] = [
  {value:'full', label:'Enable → full', help:'The input enables the output; the output is high when the pallet is full.'},
  {value:'available', label:'Enable → available', help:'The input enables the output; the output is high while the pallet has space.'},
];

const machineKinds = new Set(['part.machine','cnc','press','weld','packaging','paint','cutter','inspection','assembly','kiln','lathe','grinder']);

export function signalFunctions(kind: string): readonly SignalFunction[] {
  if (kind === 'part.color-sensor' || kind === 'color-sensor') return colorSensor;
  if (kind === 'part.laser' || kind === 'part.sensor' || kind === 'laser' || kind === 'sensor') return sensor;
  if (kind === 'part.button' || kind === 'button') return button;
  if (kind === 'part.plc' || kind === 'plc') return plc;
  if (['part.robot','robot','cobot','kuka','fanuc'].includes(kind)) return robot;
  if (kind === 'part.feeder' || kind === 'feeder') return feeder;
  if (['part.conveyor','conveyor','roller'].includes(kind)) return conveyor;
  if (machineKinds.has(kind)) return machine;
  if (kind === 'part.human' || kind === 'operator') return human;
  if (kind === 'part.pallet' || kind === 'crates') return pallet;
  return [];
}

export function signalFunction(kind: string, value: unknown): SignalFunction | undefined {
  const options = signalFunctions(kind);
  return options.find(option => option.value === value) ?? options[0];
}

/** A channel's runtime key is separate from every ordinary component id. */
export function signalChannelKey(id: string, port: number): string {
  return `\u0000io:${encodeURIComponent(id)}:${port}`;
}

export function validSignalPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
