import type { SceneItem, Vec3 } from '../types';

/** Row-major XYZ Euler matrix in the same order as the Three.js scene groups. */
export function rotationMatrix(rotationX: number, rotationY: number, rotationZ: number): [number, number, number, number, number, number, number, number, number] {
  const x = rotationX * Math.PI / 180, y = rotationY * Math.PI / 180, z = rotationZ * Math.PI / 180;
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c];
}

export function rotateVector(m: ReturnType<typeof rotationMatrix>, [x, y, z]: Vec3): Vec3 {
  return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
}

export function unrotateVector(m: ReturnType<typeof rotationMatrix>, [x, y, z]: Vec3): Vec3 {
  return [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
}

export function itemLocalToWorld(item: SceneItem, local: Vec3, scale = true): Vec3 {
  const rotated = rotateVector(rotationMatrix(item.rotationX ?? 0, item.rotation, item.rotationZ ?? 0), local);
  const k = scale ? item.scale : 1;
  return [item.position[0] + rotated[0] * k, item.position[1] + rotated[1] * k, item.position[2] + rotated[2] * k];
}
