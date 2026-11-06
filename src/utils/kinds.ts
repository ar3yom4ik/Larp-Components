import type { ComponentKind } from '../types';
export const ROBOT_KINDS: ComponentKind[] = ['robot', 'cobot', 'kuka', 'fanuc'];
export const isRobotKind = (kind: ComponentKind) => ROBOT_KINDS.includes(kind);
