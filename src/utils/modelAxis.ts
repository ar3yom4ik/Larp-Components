import type { ModelUpAxis, Vec3 } from '../types';

/** Rotate source coordinates into the editor's Y-up world. */
export function modelAxisRotation(axis: ModelUpAxis): Vec3 {
  return axis === 'z' ? [-Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
}

export function orientModelVector([x, y, z]: Vec3, axis: ModelUpAxis): Vec3 {
  return axis === 'z' ? [x, z, -y] : axis === 'x' ? [-y, x, z] : [x, y, z];
}

export function orientModelSize([x, y, z]: Vec3, axis: ModelUpAxis): Vec3 {
  return axis === 'z' ? [x, z, y] : axis === 'x' ? [y, x, z] : [x, y, z];
}
