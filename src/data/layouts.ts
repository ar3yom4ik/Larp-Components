import type { LayoutPreset, SceneItem, Vec3 } from "../types";
import { DEFAULT_GEN, generateFactory, type GenOptions } from "../sim/generator";

function preset(
  id: string,
  name: string,
  eyebrow: string,
  description: string,
  accent: string,
  options: Partial<GenOptions>,
  stats: { label: string; value: string }[],
): LayoutPreset {
  return { id, name, eyebrow, description, accent, stats, items: generateFactory({ ...DEFAULT_GEN, ...options }) };
}

export const LAYOUTS: LayoutPreset[] = [
  preset(
    "tending-l",
    "Machine Tending Line",
    "Featured layout",
    "Feeder, CNC tending robot and palletizer on an L-shaped spline line.",
    "#6DBE45",
    { seed: 7, style: "L", stages: 1 },
    [
      { label: "Robots", value: "2" },
      { label: "Spline", value: "L" },
    ],
  ),
  preset(
    "palletizing",
    "Palletizing Line",
    "Logistics",
    "High-rate carton feed with a robot stacking pallets.",
    "#E0A030",
    { seed: 3, style: "straight", stages: 0, rate: 16 },
    [
      { label: "Rate", value: "16/min" },
      { label: "Robots", value: "1" },
    ],
  ),
  preset(
    "cobot-cell",
    "Cobot Machining Cell",
    "Compact cell",
    "Collaborative robots tending a CNC with a compact pallet.",
    "#35B5C4",
    { seed: 11, style: "straight", stages: 1, cobot: true, rate: 8 },
    [
      { label: "Cobots", value: "2" },
      { label: "Rate", value: "8/min" },
    ],
  ),
  preset(
    "u-plant",
    "U-Shaped Plant",
    "Large layout",
    "Two machining stages folded into a U to save floor space.",
    "#4DA3E8",
    { seed: 21, style: "U", stages: 2, rate: 14 },
    [
      { label: "Robots", value: "3" },
      { label: "Spline", value: "U" },
    ],
  ),
];

export const DEFAULT_LAYOUT = LAYOUTS[0];

export function cloneItems(items: SceneItem[]): SceneItem[] {
  return items.map((item) => ({
    ...item,
    position: [...item.position] as Vec3,
    props: { ...item.props },
    signalTargets: item.signalTargets ? [...item.signalTargets] : undefined,
    points: item.points ? item.points.map((p) => [...p] as [number, number]) : undefined,
  }));
}

export function defaultScene(): SceneItem[] {
  return cloneItems(DEFAULT_LAYOUT.items);
}
