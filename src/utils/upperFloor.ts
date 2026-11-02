import type { SceneItem } from "../types";

/** One definition of upper-floor dimensions for rendering, support and physics.
 * Clamp imported/old project values too, not just the inspector sliders. */
export function upperFloorDimensions(item: Pick<SceneItem, "kind" | "props" | "scale">) {
  const dim = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
  };
  const width = dim(item.props.width, item.kind === "stairs" ? 1.2 : 4, .4, 20);
  const depth = dim(item.props.depth, 4, .4, 20);
  const length = dim(item.props.length, 4, .4, 20);
  const height = dim(item.props.height, 2.4, .2, 10);
  // Scale is applied by the parent group. Size the risers in world units so
  // enlarged stairs remain climbable; cap shapes for pathological projects.
  const scale = dim(item.scale, 1, .2, 3);
  const steps = Math.max(2, Math.min(150, Math.ceil(height * scale / .2)));
  return {width, depth, length, height, steps};
}
