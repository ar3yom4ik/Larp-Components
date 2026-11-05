import type { PtpPoint, PtpProgram, Vec3 } from '../types';

/** Strict validation for projects and graph-built programs. */
export function cleanPtpPoints(value: unknown): PtpPoint[] {
  const data: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(data)) throw new Error('Invalid PTP points');
  const ids = new Set<string>();
  return data.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid PTP point');
    const p = candidate as Partial<PtpPoint>;
    if (typeof p.id !== 'string' || !p.id || p.id.length > 128 || ids.has(p.id) || !Array.isArray(p.position) || p.position.length !== 3 || !p.position.every(n => typeof n === 'number' && Number.isFinite(n))) throw new Error('Invalid PTP point');
    ids.add(p.id);
    return {
      id:p.id, name:typeof p.name === 'string' ? p.name.slice(0,120) : `PTP ${index + 1}`,
      position:p.position.map(n => Math.max(-200,Math.min(200,n))) as Vec3,
      speed:typeof p.speed === 'number' && Number.isFinite(p.speed) ? Math.max(1,Math.min(100,p.speed)) : 100,
      dwell:typeof p.dwell === 'number' && Number.isFinite(p.dwell) ? Math.max(0,Math.min(300,p.dwell)) : 0,
    };
  });
}
export function cleanPtpProgram(value: unknown): PtpProgram {
  if (!value || typeof value !== 'object') throw new Error('Invalid PTP program');
  const p=value as Partial<PtpProgram>;
  return {enabled:p.enabled === true, repeat:p.repeat === true, points:cleanPtpPoints(p.points)};
}
export function newPtpPoint(position:Vec3, index:number):PtpPoint {
  const id = globalThis.crypto?.randomUUID?.() ?? `ptp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {id, name:`PTP ${index + 1}`, position:[...position], speed:100, dwell:0};
}
export const emptyPtp = ():PtpProgram => ({enabled:false,repeat:false,points:[]});
