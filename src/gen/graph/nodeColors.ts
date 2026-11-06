import { PORT_COLORS } from './registry';
import type { NodeDef } from './types';
const NODE_COLORS: Record<string,string> = {
  'part.feeder':'#dd9a4c', 'part.conveyor':'#4da5d0', 'part.robot':'#a880db',
  'part.machine':'#61b995', 'part.pallet':'#d8839b', 'part.human':'#d7bf63',
  'part.laser':'#d86262', 'part.color-sensor':'#c084fc', 'part.sensor':'#63bfe6',
  'part.button':'#dd8d5f', 'part.plc':'#819cba',
  'part.platform':'#8298aa', 'part.stairs':'#d6ac4a', 'part.wall':'#9fb3c8',
};
/** Palette and canvas use precisely the same node accent. */
export const nodeColor = (def: NodeDef) => NODE_COLORS[def.type] ?? PORT_COLORS[def.outputs[0]?.type ?? 'config'] ?? '#7da7ca';
