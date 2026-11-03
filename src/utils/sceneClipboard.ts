import { makeItem } from '../data/library';
import type { SceneItem, Vec3 } from '../types';

/** Snapshot mutable layout fields while retaining shared imported asset bytes. */
export function snapshotSceneItems(items: readonly SceneItem[]): SceneItem[] {
  return items.map(item => ({
    ...item,
    position: [...item.position] as Vec3,
    props: { ...item.props },
    signalTargets: item.signalTargets ? [...item.signalTargets] : undefined,
    signalChannels: item.signalChannels?.map(channel => ({ ...channel })),
    signalRoutes: item.signalRoutes?.map(route => ({ ...route })),
    points: item.points?.map(point => [...point] as [number, number]),
    pointHeights: item.pointHeights ? [...item.pointHeights] : undefined,
    program: item.program ? { ...item.program } : undefined,
  }));
}

/** Copy a selection together, retaining internal connections and relative poses.
 * References to objects outside the selection keep pointing to the originals. */
export function copySceneItems(items: readonly SceneItem[], offset: Vec3): SceneItem[] {
  const source = snapshotSceneItems(items);
  const copies = source.map(item => {
    const { id: _id, kind, position, rotation, ...rest } = item;
    return makeItem(kind, [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]], rotation, {
      ...rest,
      name: `${item.name} copy`,
      props: { ...item.props, ...(item.imported ? { catalogBaseId: typeof item.props.catalogBaseId === 'string' ? item.props.catalogBaseId : item.id } : {}) },
    });
  });
  const ids = new Map(source.map((item, index) => [item.id, copies[index].id]));
  const remap = (value: string) => ids.get(value) ?? value;
  for (const item of copies) {
    for (const key of ['connectedTo', 'mountedTo', 'sourceId', 'targetId', 'machineId', 'sharedBeltId', 'mergeTargetId']) {
      const value = item.props[key];
      if (typeof value === 'string') item.props[key] = remap(value);
    }
    if (item.signalTargets) item.signalTargets = item.signalTargets.map(remap);
    if (item.signalRoutes) item.signalRoutes = item.signalRoutes.map(route => ({ ...route, targetId: remap(route.targetId) }));
    if (item.program) item.program = { ...item.program, sourceId: remap(item.program.sourceId), targetId: remap(item.program.targetId), machineId: item.program.machineId ? remap(item.program.machineId) : undefined };
  }
  return copies;
}
