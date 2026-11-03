import { connect, makeNode } from './graph';
import { estimatedNodeHeight, NODE_WIDTH } from './metrics';
import { migrateSensorMounts, signalPort } from './signal';
import type { NodeGraph } from './types';
import type { ConnectResult } from './graph';

function freeInput(graph: NodeGraph, id: string): number {
  const used = new Set(graph.links.filter(link => link.to.node === id).map(link => link.to.port));
  let port = 1;
  while (used.has(signalPort('in', port))) port++;
  return port;
}

/** Add the visible pickup detector and both signal wires for a conveyor/robot pair.
 * The direct material-flow wire remains intact: a sensor does not transport parts. */
export function ensurePickupSensor(graph: NodeGraph, beltId: string, robotId: string): NodeGraph {
  const belt = graph.nodes.find(node => node.id === beltId);
  const robot = graph.nodes.find(node => node.id === robotId);
  if (belt?.type !== 'part.conveyor' || robot?.type !== 'part.robot') return graph;
  const material = graph.links.some(link => link.from.node === beltId && link.from.port === 'out' && link.to.node === robotId && link.to.port === 'in');
  if (!material) return graph;

  const detectorLink = graph.links.find(link => link.to.node === robotId && link.to.port.startsWith('signal-in-') &&
    graph.nodes.some(node => node.id === link.from.node && ['part.laser','part.sensor'].includes(node.type)));
  if (detectorLink) {
    // Automatically generated pickup sensors follow the robot if its material
    // source changes. Manually wired sensors are left exactly as the user set them.
    const sensor = graph.nodes.find(node => node.id === detectorLink.from.node)!;
    if (sensor.params.automaticPickup !== true) return graph;
    const previous = graph.links.find(link => link.to.node === sensor.id && link.to.port === 'mount' &&
      graph.nodes.some(node => node.id === link.from.node && node.type === 'part.conveyor'));
    if (previous?.from.node === beltId) return graph;
    const base = previous ? {...graph,links:graph.links.filter(link => link.id !== previous.id)} : graph;
    return connect(base,{node:beltId,port:'attach'},{node:sensor.id,port:'mount'}).graph;
  }
  const detection = String(robot.params.detection ?? 'laser');
  if (detection === 'none') return graph;
  const type = detection === 'proximity' ? 'part.sensor' : 'part.laser';
  const gapStart = belt.x + NODE_WIDTH + 28;
  const gapEnd = robot.x - NODE_WIDTH - 28;
  let x: number, y: number;
  if (gapEnd >= gapStart) {
    x = Math.round((gapStart + gapEnd) / 2);
    y = Math.round((belt.y + robot.y) / 2);
  } else {
    x = Math.round((belt.x + robot.x) / 2);
    y = Math.round(Math.max(belt.y + estimatedNodeHeight(belt, graph), robot.y + estimatedNodeHeight(robot, graph)) + 55);
    // Keep migrated and interactively generated nodes readable even in dense graphs.
    while (graph.nodes.some(node => x < node.x + NODE_WIDTH + 24 && x + NODE_WIDTH + 24 > node.x && y < node.y + estimatedNodeHeight(node, graph) + 24 && y + 240 > node.y)) y += 280;
  }
  const sensor = makeNode(type,x,y,{automaticPickup:true});
  let next: NodeGraph = {...graph,nodes:[...graph.nodes,sensor]};
  const fromBelt = connect(next,{node:beltId,port:'attach'},{node:sensor.id,port:'mount'});
  if (!fromBelt.ok) return graph;
  next = fromBelt.graph;
  const toRobot = connect(next,{node:sensor.id,port:signalPort('out',1)},{node:robotId,port:signalPort('in',freeInput(next,robotId))});
  return toRobot.ok ? toRobot.graph : graph;
}

/** Dropping a loose detector onto a conveyor→robot material wire attaches it
 * electrically without pretending the detector itself transports material. */
export function attachPickupSensorToLink(graph: NodeGraph, sensorId: string, linkId: string): ConnectResult {
  const sensor = graph.nodes.find(node => node.id === sensorId);
  const link = graph.links.find(entry => entry.id === linkId);
  const belt = graph.nodes.find(node => node.id === link?.from.node);
  const robot = graph.nodes.find(node => node.id === link?.to.node);
  if (!sensor || !['part.laser','part.sensor'].includes(sensor.type) || !link || belt?.type !== 'part.conveyor' || robot?.type !== 'part.robot' || link.from.port !== 'out' || link.to.port !== 'in' || graph.links.some(entry => entry.from.node === sensorId || entry.to.node === sensorId)) return {ok:false,graph};
  const input = connect(graph,{node:belt.id,port:'attach'},{node:sensorId,port:'mount'});
  if (!input.ok) return {ok:false,graph,error:input.error};
  const output = connect(input.graph,{node:sensorId,port:signalPort('out',1)},{node:robot.id,port:signalPort('in',freeInput(input.graph,robot.id))});
  if (!output.ok) return {ok:false,graph,error:output.error};
  return {ok:true,graph:{...output.graph,nodes:output.graph.nodes.map(node => node.id === sensorId ? {...node,params:{...node.params,automaticPickup:true}} : node)}};
}

/** Upgrade old component graphs once. Afterwards deleting a detector stays deleted. */
export function upgradePickupSensors(graph: NodeGraph): NodeGraph {
  const hadSchema = graph.signalSchema !== undefined;
  graph = migrateSensorMounts(graph);
  if (hadSchema || !graph.nodes.some(node => node.type.startsWith('part.'))) return graph;
  let next: NodeGraph = {...graph,signalSchema:2};
  const byId = new Map(graph.nodes.map(node => [node.id,node]));
  for (const link of graph.links) {
    if (link.from.port === 'out' && link.to.port === 'in' && byId.get(link.from.node)?.type === 'part.conveyor' && byId.get(link.to.node)?.type === 'part.robot') {
      next = ensurePickupSensor(next,link.from.node,link.to.node);
    }
  }
  return next;
}
