import './components';
import { makeItem } from '../../data/library';
import { DEFAULT_GEN, validateFactory } from '../../sim/generator';
import { programToCode } from '../../sim/programCode';
import { samplePath } from '../../sim/spline';
import { resolveMountedSensors } from '../../utils/sensorMount';
import type { ComponentKind, SceneItem } from '../../types';
import { indexGraph, makeNode, topoSort, uid, validateGraph } from './graph';
import { ensurePickupSensor, upgradePickupSensors } from './pickupSensors';
import { channelMode, signalPortNumber, signalRows } from './signal';
import { signalWireColor } from '../../utils/signalPorts';
import type { GraphLink, GraphNode, NodeGraph, PlantResult } from './types';
import type { CompileResult } from './compile';

/** A working physical line, independent of the legacy settings-graph storage. */
export function defaultComponentGraph(): NodeGraph {
  const feeder = makeNode('part.feeder', 40, 80);
  const belt = makeNode('part.conveyor', 300, 80);
  const robot = makeNode('part.robot', 820, 80);
  const machine = makeNode('part.machine', 560, 400);
  const belt2 = makeNode('part.conveyor', 1080, 80);
  const robot2 = makeNode('part.robot', 1600, 80);
  const pallet = makeNode('part.pallet', 1860, 80);
  const wire = (from: GraphNode, out: string, to: GraphNode, input: string): GraphLink => ({id:uid('l'),from:{node:from.id,port:out},to:{node:to.id,port:input}});
  const graph: NodeGraph = {version:1,signalSchema:2,nodes:[feeder,belt,robot,machine,belt2,robot2,pallet],links:[wire(feeder,'out',belt,'in'),wire(belt,'out',robot,'in'),wire(machine,'machine',robot,'machine'),wire(robot,'out',belt2,'in'),wire(belt2,'out',robot2,'in'),wire(robot2,'out',pallet,'in')]};
  return ensurePickupSensor(ensurePickupSensor(graph,belt.id,robot.id),belt2.id,robot2.id);
}

interface FlowEnd { x: number; z: number; palletZ?: number; pickupBack?: number; side?: number; station?: number }
interface MergeEntry { sourceId: string; along: number; side: number }

/** Compile a DAG of physical parts. Multiple workers can share a belt as
 * competing consumers; other fan-out still needs an explicit splitter. */
export function compileComponentGraph(graph: NodeGraph): CompileResult {
  graph = upgradePickupSensors(graph);
  const start = performance.now();
  const connectedIds = new Set(graph.links.flatMap((link) => [link.from.node, link.to.node]));
  const structure = (node:GraphNode) => ['part.platform','part.stairs','part.wall'].includes(node.type);
  // Layout parts are standalone scene objects, not material-flow modules.
  const activeGraph = { ...graph, nodes: graph.nodes.filter((node) => connectedIds.has(node.id) || structure(node)) };
  const diagnostics = validateGraph(activeGraph);
  for (const node of graph.nodes) if (!connectedIds.has(node.id) && !structure(node)) diagnostics.push({id:`inactive:${node.id}`,severity:'info',nodeId:node.id,message:'Disconnected part is inactive.'});
  const error = (message: string, nodeId?: string) => diagnostics.push({id:`component:${diagnostics.length}`,severity:'error',message,nodeId});
  const { byId, incoming, outgoing } = indexGraph(activeGraph);
  const { order } = topoSort(activeGraph);
  const inFlow = (id: string) => (incoming.get(id) ?? []).filter((link) => link.to.port === 'in' && link.from.port === 'out');
  const outFlow = (id: string) => (outgoing.get(id) ?? []).filter((link) => link.from.port === 'out' && link.to.port === 'in');
  const machineIn = (id: string) => (incoming.get(id) ?? []).filter((link) => link.to.port === 'machine');
  const automation = (node: GraphNode) => ['part.laser','part.color-sensor','part.sensor','part.button','part.plc'].includes(node.type);
  if (graph.nodes.some((node) => !node.type.startsWith('part.'))) error('Physical modules cannot be mixed with legacy settings nodes.');
  const feeders = activeGraph.nodes.filter((node) => node.type === 'part.feeder');
  if (!feeders.length) error('Add a feeder to start a production line.');

  const reachable = new Set(feeders.map((node) => node.id));
  for (const node of order) {
    if (automation(node) || structure(node)) continue;
    const ins = inFlow(node.id), outs = outFlow(node.id);
    const predecessors = ins.map((link) => byId.get(link.from.node));
    const nextTypes = outs.map(link => byId.get(link.to.node)?.type);
    const next = outs.length === 1 ? nextTypes[0] : undefined;
    const sharedWorkers = node.type === 'part.conveyor' && outs.length > 1 && nextTypes.every(type => type === 'part.robot' || type === 'part.human');
    if (predecessors.some((parent) => parent && reachable.has(parent.id))) reachable.add(node.id);
    if (outs.length > 1 && !sharedWorkers) error('Splitting material into multiple outputs is not supported yet.', node.id);
    if (node.type === 'part.feeder' && next !== 'part.conveyor') error('A feeder must connect to a conveyor.', node.id);
    if (node.type === 'part.conveyor') {
      if (predecessors.some((parent) => !parent || !['part.feeder','part.robot','part.human','part.conveyor'].includes(parent.type))) error('A conveyor must receive material from a feeder, robot or conveyor.', node.id);
      if (new Set(ins.map((link) => link.from.node)).size !== ins.length) error('A conveyor cannot merge the same source twice.', node.id);
      if (!sharedWorkers && !['part.conveyor','part.robot','part.human'].includes(next ?? '')) error('A conveyor must feed another conveyor or a robot.', node.id);
    }
    if (node.type === 'part.robot' || node.type === 'part.human') {
      if (predecessors.length !== 1 || predecessors[0]?.type !== 'part.conveyor' || !['part.conveyor','part.pallet'].includes(next ?? '')) error('A robot needs a source conveyor and a target conveyor or pallet.', node.id);
      if (next === 'part.pallet' && machineIn(node.id).length) error('A palletizing robot cannot tend a machine. Connect a conveyor and another robot before the pallet.', node.id);
    }
    if (node.type === 'part.pallet' && (predecessors.length !== 1 || !['part.robot','part.human'].includes(predecessors[0]?.type ?? ''))) error('A pallet must be connected to a robot.', node.id);
  }

  const reachesPallet = new Set(activeGraph.nodes.filter((node) => node.type === 'part.pallet').map((node) => node.id));
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    if (outFlow(node.id).some((link) => reachesPallet.has(link.to.node))) reachesPallet.add(node.id);
  }
  for (const feeder of feeders) if (!reachesPallet.has(feeder.id)) error('Connect the material flow to a pallet.', feeder.id);
  const machineIds = new Set<string>();
  for (const node of activeGraph.nodes) {
    if (node.type === 'part.robot' || node.type === 'part.human') for (const link of machineIn(node.id)) machineIds.add(link.from.node);
    if (node.type !== 'part.machine' && !automation(node) && !structure(node) && !reachable.has(node.id)) error('This part is not connected to a production line.', node.id);
  }
  for (const node of activeGraph.nodes.filter((entry) => entry.type === 'part.machine')) {
    if (!machineIds.has(node.id)) error('This part is not connected to a production line.', node.id);
    if ((outgoing.get(node.id) ?? []).filter((link) => link.from.port === 'machine').length > 1) error('A machine can be attached to only one robot.', node.id);
  }
  if (diagnostics.some((entry) => entry.severity === 'error')) return {plant:null,diagnostics,results:new Map(),ms:performance.now()-start};

  const value = (node: GraphNode, key: string, fallback: string | number | boolean) => node.params[key] ?? fallback;
  const number = (node: GraphNode, key: string, fallback: number, min: number, max: number) => {
    const n = Number(value(node, key, fallback));
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
  };
  // Keep independent networks apart and group the feeders of each merged line.
  const groups = new Map<string, GraphNode[]>();
  for (const feeder of feeders) {
    let node = feeder;
    while (outFlow(node.id).length) node = byId.get(outFlow(node.id)[0].to.node)!;
    const group = groups.get(node.id);
    if (group) group.push(feeder); else groups.set(node.id, [feeder]);
  }
  const lanes = new Map<string, number>();
  let lane = 0;
  for (const group of groups.values()) for (const feeder of group) lanes.set(feeder.id, lane++ * 9);

  const items: SceneItem[] = [];
  const instances = new Map<string, SceneItem>();
  // A robot feeding a merge must place onto its own generated inlet, not the
  // distant shared belt. Conveyor and feeder inputs use the very same geometry.
  const mergeConnectors = new Map<string, SceneItem>();
  const ends = new Map<string, FlowEnd>();
  for (const part of order) {
    if (part.type === 'part.machine' || automation(part) || structure(part)) continue;
    const ins = inFlow(part.id);
    const parents = ins.map((link) => ({ node: byId.get(link.from.node)!, end: ends.get(link.from.node)! }));
    let item: SceneItem;
    if (part.type === 'part.feeder') {
      const z = lanes.get(part.id)!;
      item = makeItem('feeder', [0.85,0,z], 0, {name:'Feeder',props:{active:true,interval:number(part,'interval',5,0.5,60),product:String(value(part,'product','billet'))}});
      ends.set(part.id, {x:0,z});
    } else if (part.type === 'part.conveyor') {
      const requestedLength = number(part, 'length', 4, 2, 8);
      const consumers = outFlow(part.id);
      // Two opposite-side stations fit per 3 m of belt. Extend automatically
      // when more workers share this physical belt; no explicit branch nodes.
      const stationLength = consumers.length > 1 ? 2 + Math.floor((consumers.length-1)/2)*3 : 0;
      const beltLength = Math.max(requestedLength,stationLength);
      const kind = value(part,'kind','conveyor') === 'roller' ? 'roller' : 'conveyor';
      const speed = number(part,'speed',0.6,-Number.MAX_VALUE,Number.MAX_VALUE);
      const width = number(part,'width',.62,.1,100);
      const next = byId.get(outFlow(part.id)[0].to.node)!;
      if (parents.length === 1) {
        const {x,z} = parents[0].end;
        item = makeItem(kind, [x,0,z], 0, {name:`Conveyor ${instances.size}`,points:[[0,0],[beltLength/2,0],[beltLength,0]],props:{active:true,stopper:['part.robot','part.human'].includes(next.type),speed,width}});
        ends.set(part.id, {x:x+beltLength,z});
      } else {
        const sorted = [...parents].sort((a,b) => a.end.z - b.end.z);
        const primary = sorted[Math.floor((sorted.length-1)/2)];
        const z = primary.end.z;
        const secondary = sorted.filter((parent) => parent !== primary).sort((a,b) => Math.abs(a.end.z-z) - Math.abs(b.end.z-z) || a.end.z-b.end.z);
        const side = value(part,'mergeStyle','multi-head') === 'side';
        const farthest = Math.max(...parents.map((parent) => parent.end.x));
        const spread = Math.max(...parents.map((parent) => Math.abs(parent.end.z-z)));
        const x = farthest + (side ? 3 : Math.max(3, spread * 0.8 + 1.5));
        const length = side ? Math.max(beltLength, 1.9 + secondary.length * 1.2) : beltLength;
        const entries: MergeEntry[] = [{sourceId:primary.node.id,along:0.2,side:0}, ...secondary.map((parent,index) => ({sourceId:parent.node.id,along:side ? 1.1 + index*1.2 : 0.2,side:Math.sign(parent.end.z-z)}))];
        item = makeItem(kind, [x,0,z], 0, {name:`${side ? 'Side-entry' : 'Multi-head'} conveyor ${instances.size}`,points:[[0,0],[length/2,0],[length,0]],props:{active:true,stopper:['part.robot','part.human'].includes(next.type),speed,width,mergeStyle:side?'side':'multi-head',mergeInputs:parents.length,mergeEntries:JSON.stringify(entries.map(({along,side:entrySide}) => ({along,side:entrySide})))}});
        // Each incoming path is a real conveyor, so the viewport and simulation
        // use the same visible geometry rather than a decorative graph edge.
        for (const parent of [primary,...secondary]) {
          const entry = entries.find((candidate) => candidate.sourceId === parent.node.id)!;
          const sx = parent.end.x, sz = parent.end.z, ex = x + entry.along;
          const dx = ex-sx, dz = z-sz;
          const points: [number,number][] = !entry.side
            ? [[0,0],[dx/2,0],[dx,0]]
            : side
              ? [[0,0],[dx*0.42,0],[dx,0],[dx,dz*0.82],[dx,dz]]
              : [[0,0],[dx*0.32,0],[dx*0.72,dz*0.58],[dx,dz]];
          const source = instances.get(parent.node.id)!;
          const connector = makeItem(source.kind === 'roller' ? 'roller' : 'conveyor', [sx,0,sz], 0, {name:`${side ? 'Side entry' : 'Merge head'} ${items.length+1}`,points,props:{active:true,stopper:false,speed:Math.min(Number(source.props.speed) || speed,speed),mergeTargetId:item.id,mergeEntryS:entry.along,mergeStyle:side?'side':'multi-head',mergeSide:entry.side}});
          items.push(connector);
          mergeConnectors.set(`${parent.node.id}:${part.id}`, connector);
        }
        ends.set(part.id, {x:x+length,z});
      }
    } else if (part.type === 'part.human' || part.type === 'part.robot') {
      const parent = parents[0];
      const siblings = outFlow(parent.node.id);
      const station = siblings.findIndex(link => link.to.node === part.id);
      const shared = parent.node.type === 'part.conveyor' && siblings.length > 1;
      const side = shared && station % 2 === 1 ? -1 : 1;
      const pickupBack = shared ? 0.35 + Math.floor(station/2)*3 : undefined;
      const x = parent.end.x - (pickupBack === undefined ? 0 : pickupBack - 0.35);
      const z = parent.end.z;
      if (part.type === 'part.human') {
        item = makeItem('operator',[x+0.3,0,z+side*1.45],0,{name:`Operator ${instances.size}`,props:{task:'carry',walkSpeed:number(part,'walkSpeed',1,0.3,2),hat:'hardhat'}});
      } else {
        const kind = String(value(part,'kind','robot'));
        const robotKind = (['robot','cobot','kuka','fanuc'].includes(kind) ? kind : 'robot') as ComponentKind;
        item = makeItem(robotKind,[x+0.3,0,z+side*1.45],0,{name:`Robot ${instances.size}`,props:{payload:robotKind==='cobot'?5:12,speed:number(part,'speed',70,1,100),gripper:String(value(part,'gripper','vacuum'))}});
      }
      // Separate downstream branches from the shared source belt.
      ends.set(part.id, shared ? {x:x+0.6,z:z+side*2.9,palletZ:z+side*2.9,pickupBack,side,station} : {x:x+0.6,z});
    } else {
      const {x,z,palletZ} = parents[0].end;
      item = makeItem('crates',[x-0.3,0,palletZ ?? z+2.9],0,{name:'Pallet',props:{product:String(value(part,'product','machined')),cols:number(part,'cols',3,1,8),rows:number(part,'rows',2,1,8),layers:number(part,'layers',4,1,10),gap:0.04}});
    }
    instances.set(part.id,item);
    items.push(item);
  }

  for (const part of activeGraph.nodes.filter(structure)) {
    const kind=part.type.slice(5) as 'platform'|'stairs'|'wall';
    const material=String(value(part,'surfaceMaterial',kind==='wall'?'mid':'steel'));
    const props:SceneItem['props']={height:kind==='platform' ? Math.round(number(part,'height',2,0,10)) : number(part,'height',kind==='wall'?4:2,kind==='wall'?.2:0,kind==='wall'?20:10),surfaceMaterial:material};
    if(kind!=='wall')props.width=number(part,'width',kind==='stairs'?1.2:4,.4,20);
    if(kind==='platform')props.depth=number(part,'depth',4,.4,20);
    else props.length=number(part,'length',kind==='wall'?6:4,.4,kind==='wall'?100:20);
    const item=makeItem(kind,[number(part,'x',0,-200,200),0,number(part,'z',6,-200,200)],number(part,'rotation',0,-360,360),{name:part.title || (kind==='platform'?'Elevated platform':kind==='stairs'?'Industrial stairs':'Spline wall'),props});
    instances.set(part.id,item);items.push(item);
  }

  for (const part of order) {
    if (part.type !== 'part.robot' && part.type !== 'part.human') continue;
    const robot = instances.get(part.id)!;
    const source = instances.get(inFlow(part.id)[0].from.node)!;
    const targetNodeId = outFlow(part.id)[0].to.node;
    const target = mergeConnectors.get(`${part.id}:${targetNodeId}`) ?? instances.get(targetNodeId)!;
    const station = ends.get(part.id);
    if (station?.pickupBack !== undefined) robot.props = {...robot.props,sharedBeltId:source.id,pickupBack:station.pickupBack,pickupSide:station.side ?? 1,pickupIndex:station.station ?? 0};
    const machineNode = byId.get(machineIn(part.id)[0]?.from.node ?? '');
    let machine: SceneItem | undefined;
    if (machineNode) {
      const kind = String(value(machineNode,'kind','cnc'));
      const allowed = ['cnc','press','weld','packaging','paint','cutter','inspection','assembly','kiln','lathe','grinder'];
      machine = makeItem((allowed.includes(kind)?kind:'cnc') as ComponentKind,[robot.position[0],0,robot.position[2]+(ends.get(part.id)?.side ?? 1)*2.9],180,{name:`Machine ${items.length}`,props:{cycleTime:number(machineNode,'cycleTime',6,1,60),inputProduct:String(value(machineNode,'inputProduct','billet')),outputProduct:String(value(machineNode,'outputProduct','machined')),requiredParts:kind==='assembly'?2:1}});
      items.push(machine); instances.set(machineNode.id,machine);
    }
    if (part.type === 'part.human') {
      robot.props = {...robot.props,task:machine?'tend':'carry',sourceId:source.id,targetId:target.id,machineId:machine?.id ?? '',...(ends.get(part.id)?.pickupBack !== undefined ? {pickupBack:ends.get(part.id)!.pickupBack!,pickupSide:ends.get(part.id)!.side!} : {})};
      continue;
    }
    const mode = machine ? (machine.kind==='assembly' ? 'assemble' : machine.kind==='paint' ? 'paint' : 'tend') : target.kind==='crates' ? 'palletize' : 'transfer';
    robot.program = {mode,sourceId:source.id,targetId:target.id,machineId:machine?.id,repeat:true,delay:0,clearance:0.3,...(ends.get(part.id)?.pickupBack !== undefined ? {pickupBack:ends.get(part.id)!.pickupBack} : {})};
    robot.script = programToCode(robot.program);
  }
  // Automation nodes are real scene objects, not implicit compiler side effects.
  // Their signal wires and material flow are independent graphs.
  for (const part of activeGraph.nodes.filter(automation)) {
    const kind = part.type.slice(5) as 'laser' | 'color-sensor' | 'sensor' | 'button' | 'plc';
    const signalIn = (incoming.get(part.id) ?? []).filter(link => signalPortNumber(link.to.port,'in') !== null);
    const signalOut = (outgoing.get(part.id) ?? []).filter(link => signalPortNumber(link.from.port,'out') !== null);
    const robotNode = signalOut.map(link => byId.get(link.to.node)).find(node => node?.type === 'part.robot');
    const robot = robotNode ? instances.get(robotNode.id) : undefined;
    const mountChoice = String(value(part,'mountedTo','auto'));
    let beltNode: GraphNode | undefined;
    if (mountChoice !== 'none' && mountChoice !== 'auto') beltNode = byId.get(mountChoice);
    if (mountChoice === 'auto') {
      beltNode = (incoming.get(part.id) ?? []).filter(link => link.to.port === 'mount').map(link => byId.get(link.from.node)).find(node => node?.type === 'part.conveyor');
      if (!beltNode && robotNode) beltNode = byId.get(inFlow(robotNode.id)[0]?.from.node ?? '');
    }
    const belt = beltNode?.type === 'part.conveyor' ? instances.get(beltNode.id) : undefined;
    const neighbour = robot ?? signalOut.map(link => instances.get(link.to.node)).find(Boolean) ?? signalIn.map(link => instances.get(link.from.node)).find(Boolean);
    const position: [number,number,number] = neighbour ? [neighbour.position[0]-.8,0,neighbour.position[2]-.8] : [0,0,0];
    const props: SceneItem['props'] = {
      signal: value(part,'signal',false) === true,
      address: String(value(part,'address',kind === 'button' ? 'DI-01' : kind === 'laser' ? 'DI-02' : kind === 'sensor' ? 'DI-03' : 'PLC-01')),
      wireColor: signalWireColor(value(part,'wireColor','#4da9d8')),
    };
    if (kind === 'button') props.activeDuration = number(part,'activeDuration',0,0,300);
    if (kind === 'laser' || kind === 'color-sensor') { props.range = number(part,'range',3,.1,100); props.autoRange = value(part,'autoRange',true) !== false; props.normallyClosed = value(part,'normallyClosed',false) === true; }
    if (kind === 'sensor') props.radius = number(part,'radius',.8,.2,100);
    if ((kind === 'laser' || kind === 'color-sensor' || kind === 'sensor' || kind === 'button') && belt) {
      const length = samplePath(belt.points ?? [[-2,0],[2,0]],.1,belt.pointHeights).length;
      const authored = number(part,'mountPosition',-1,-1,1);
      const pickupBack = robot?.program?.sourceId === belt.id ? (robot.program.pickupBack ?? .3) : length*.15;
      props.mountedTo = belt.id;
      props.mountPosition = authored >= 0 ? authored : Math.max(0,Math.min(1,(length-pickupBack)/Math.max(length,.001)));
    }
    const title = part.title || (kind === 'laser' ? 'Laser trigger' : kind === 'color-sensor' ? 'Color sensor' : kind === 'sensor' ? 'Proximity sensor' : kind === 'button' ? 'Push button' : 'PLC control');
    const item = makeItem(kind,position,0,{name:`${title} ${items.length+1}`,props});
    instances.set(part.id,item); items.push(item);
  }

  // Persist each independent output function/colour and the exact source/target
  // port numbers so the simulation, 3D wires and saved projects agree.
  for (const part of activeGraph.nodes) {
    const item = instances.get(part.id);
    if (!item) continue;
    const relevant = new Set<number>([1]);
    for (const link of incoming.get(part.id) ?? []) {
      const input = signalPortNumber(link.to.port,'in'); if (input !== null) relevant.add(input);
    }
    for (const link of outgoing.get(part.id) ?? []) {
      const output = signalPortNumber(link.from.port,'out'); if (output !== null) relevant.add(output);
    }
    for (const key of Object.keys(part.io ?? {})) { const port=Number(key); if (Number.isSafeInteger(port) && port>0) relevant.add(port); }
    item.signalChannels = signalRows(graph,part).filter(port => relevant.has(port)).map(port => ({
      port, mode:channelMode(part,port), ...(part.io?.[String(port)]?.color ? {color:signalWireColor(part.io[String(port)].color)} : {}), ...(part.type === 'part.color-sensor' && part.io?.[String(port)]?.material ? {material:part.io[String(port)].material} : {}),
    }));
    // Per-input overrides reference graph nodes; resolve them to scene IDs only
    // after all physical instances have been created.
    if (part.type === 'part.robot') {
      item.props.outputMode = channelMode(part,1);
      if (item.program) for (const [key,settings] of Object.entries(part.io ?? {})) {
        if (!settings.programSource && !settings.programTarget && !settings.programMode) continue;
        const source = settings.programSource ? instances.get(settings.programSource) : undefined;
        const target = settings.programTarget ? instances.get(settings.programTarget) : undefined;
        if ((settings.programSource && !source) || (settings.programTarget && !target)) {
          diagnostics.push({id:`program:${part.id}:${key}`,severity:'warning',nodeId:part.id,message:`Input ${key} workflow refers to a component that is not in this factory.`});
          continue;
        }
        (item.programs ??= {})[key] = {...item.program,sourceId:source?.id ?? item.program.sourceId,targetId:target?.id ?? item.program.targetId,
          mode:(settings.programMode as typeof item.program.mode | undefined) ?? item.program.mode,repeat:true};
      }
    }
  }
  for (const link of graph.links) {
    const output = signalPortNumber(link.from.port,'out'), input = signalPortNumber(link.to.port,'in');
    if (output === null || input === null) continue;
    const source = instances.get(link.from.node), target = instances.get(link.to.node);
    if (!source || !target) continue;
    (source.signalRoutes ??= []).push({output,targetId:target.id,input});
  }
  const resolvedItems = resolveMountedSensors(items);
  const warnings = validateFactory(resolvedItems);
  warnings.forEach((message,index) => diagnostics.push({id:`reach:${index}`,severity:'warning',message}));
  const plant: PlantResult = {options:{...DEFAULT_GEN},items:resolvedItems,summary:`${feeders.length} production line(s) · ${items.length} components`,warnings};
  return {plant,diagnostics,results:new Map(),ms:Math.round((performance.now()-start)*10)/10};
}
