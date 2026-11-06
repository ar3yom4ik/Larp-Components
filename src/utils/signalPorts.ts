import type { SceneItem, Vec3 } from '../types';
import { isRobotKind } from './kinds';
import { itemLocalToWorld } from './transform';
import { conveyorWidth } from './conveyor';
import { signalAcceptsInput, signalFunctions } from './signalChannels';

export const DEFAULT_WIRE_COLOR = '#4da9d8';

/** Sensors, buttons and PLCs are evaluated by the logic stepper. */
export function isLogicSource(item: SceneItem): boolean {
  return ['button', 'sensor', 'laser', 'color-sensor', 'plc'].includes(item.kind);
}

/** Robots publish a host-managed moving/holding signal as well. */
export function isSignalSource(item: SceneItem): boolean {
  return isLogicSource(item) || isRobotKind(item.kind) || (signalFunctions(item.kind).length > 0 && (!!item.signalChannels?.length || !!item.signalRoutes?.length || !!item.props.connectedTo || !!item.signalTargets?.length));
}

/** Output ports can only be edited on visible, unlocked sources. */
export function canSignalOutput(item: SceneItem): boolean {
  return item.visible !== false && !item.locked && (isSignalSource(item) || signalFunctions(item.kind).length > 0);
}

/** PLCs and feeders consume signals; robots and conveyors expose trigger/script endpoints. */
export function canSignalInput(item: SceneItem, sourceId: string): boolean {
  if (item.visible === false || item.id === sourceId || !signalFunctions(item.kind).length) return false;
  if (!signalAcceptsInput(item.kind)) return false;
  return true;
}

/** The first destination uses the legacy field; subsequent branches live on
 * the item. Filtering here also tolerates old or partially edited projects. */
export function legacySignalTargets(item: SceneItem): string[] {
  const first = typeof item.props.connectedTo === 'string' ? item.props.connectedTo : '';
  const extra = Array.isArray(item.signalTargets) ? item.signalTargets : [];
  return [...new Set([first, ...extra].filter((id): id is string => typeof id === 'string' && !!id && id !== item.id))];
}

export function signalTargets(item: SceneItem): string[] {
  return [...new Set([...legacySignalTargets(item), ...(item.signalRoutes ?? []).map(route => route.targetId)].filter(id => id && id !== item.id))];
}

export function signalTargetsPatch(item: SceneItem, targets: string[]): Partial<SceneItem> {
  const clean = [...new Set(targets.filter((id) => id && id !== item.id))];
  const keep = new Set(clean);
  const routes = (item.signalRoutes ?? []).filter(route => keep.has(route.targetId));
  const removed = (item.signalRoutes ?? []).filter(route => !keep.has(route.targetId));
  let legacy = legacySignalTargets(item).filter(id => keep.has(id));
  const known = new Set([...legacy, ...routes.map(route => route.targetId)]);
  const added = clean.filter(id => !known.has(id));
  if (item.signalChannels?.length) {
    // The scene editor has one visible OUT. Preserve a rerouted channel when
    // possible, otherwise use the first numbered output for new scene wires.
    const template = removed.length === 1 && added.length === 1 ? removed[0] : undefined;
    for (const id of added) routes.push({output:template?.output ?? item.signalChannels[0].port, targetId:id, input:template?.input ?? 1});
  } else legacy = [...legacy,...added];
  return { props: { ...item.props, connectedTo: legacy[0] ?? '' }, signalTargets: legacy.length > 1 ? legacy.slice(1) : undefined, signalRoutes: routes.length ? routes : undefined };
}

/** Old projects have no wire colour, and imported projects may contain invalid values. */
export function signalWireColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_WIRE_COLOR;
}

/** Attachment points are in model-local coordinates; account for each instance's
 * position, rotation and scale so wires stay attached when components are edited. */
export function signalAnchor(item: SceneItem, end: 'source' | 'target'): Vec3 {
  let local: Vec3;
  if (item.kind === 'button') local = [0.16, 0.85, 0];
  else if (item.kind === 'sensor') local = [0, item.props.mountedTo ? 0.15 : 1.08, 0.1];
  else if (item.kind === 'laser' || item.kind === 'color-sensor') { const range = Number(item.props.range); local = [Math.max(0.5, Number.isFinite(range) && range > 0 ? range : 3) / 2, item.props.mountedTo ? 0.1 : 0.85, 0]; }
  else if (item.kind === 'plc') local = [0.45, 0.9, 0];
  else if (item.kind === 'feeder') local = [0.43, 2.1, 0];
  else if (item.kind === 'conveyor' || item.kind === 'roller') local = [0, 0.8, conveyorWidth(item) / 2];
  else if (['robot', 'cobot', 'kuka', 'fanuc'].includes(item.kind)) local = [0.4, 0.55, 0];
  else local = [0, end === 'source' ? 0.7 : 0.8, 0];
  return itemLocalToWorld(item, local, item.kind !== 'conveyor' && item.kind !== 'roller');
}

/** A null output denotes the unnumbered legacy signal. Numbered ports remain
 * independent even when several of them lead to the same target component. */
export function signalOutputConnections(item: SceneItem, output: number | null): {targetId:string; input:number}[] {
  return output === null
    ? legacySignalTargets(item).map(targetId => ({targetId,input:1}))
    : (item.signalRoutes ?? []).filter(route => route.output === output).map(({targetId,input}) => ({targetId,input}));
}

export function signalPortConnectionPatch(item: SceneItem, output: number | null, targetId: string, input: number, connect: boolean): Partial<SceneItem> {
  let legacy = legacySignalTargets(item);
  let routes = [...(item.signalRoutes ?? [])];
  let channels = item.signalChannels;
  if (output === null && input === 1) {
    legacy = legacy.filter(id => id !== targetId);
    if (connect) legacy.push(targetId);
  } else {
    const port = output ?? 1;
    if (output === null && connect && !channels?.some(channel => channel.port === port)) {
      channels = [...(channels ?? []),{port,mode:signalFunctions(item.kind)[0]?.value ?? 'relay'}];
    }
    routes = routes.filter(route => !(route.output === port && route.targetId === targetId && route.input === input));
    if (connect) routes.push({output:port,targetId,input});
  }
  return {props:{...item.props,connectedTo:legacy[0] ?? ''},signalTargets:legacy.length > 1 ? legacy.slice(1) : undefined,
    signalRoutes:routes.length ? routes : undefined, ...(channels !== item.signalChannels ? {signalChannels:channels} : {})};
}
