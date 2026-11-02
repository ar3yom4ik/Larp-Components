import './components';
import { makeItem } from '../../data/library';
import { DEFAULT_GEN, validateFactory } from '../../sim/generator';
import { programToCode } from '../../sim/programCode';
import type { ComponentKind, SceneItem } from '../../types';
import { indexGraph, makeNode, topoSort, uid, validateGraph } from './graph';
import type { GraphLink, GraphNode, NodeGraph, PlantResult } from './types';
import type { CompileResult } from './compile';

/** A working physical line, independent of the legacy settings-graph storage. */
export function defaultComponentGraph(): NodeGraph {
  const feeder = makeNode('part.feeder', 40, 80);
  const belt = makeNode('part.conveyor', 300, 80);
  const robot = makeNode('part.robot', 560, 80);
  const machine = makeNode('part.machine', 300, 340);
  const belt2 = makeNode('part.conveyor', 820, 80);
  const robot2 = makeNode('part.robot', 1080, 80);
  const pallet = makeNode('part.pallet', 1340, 80);
  const wire = (from: GraphNode, out: string, to: GraphNode, input: string): GraphLink => ({id:uid('l'),from:{node:from.id,port:out},to:{node:to.id,port:input}});
  return {version:1,nodes:[feeder,belt,robot,machine,belt2,robot2,pallet],links:[wire(feeder,'out',belt,'in'),wire(belt,'out',robot,'in'),wire(machine,'machine',robot,'machine'),wire(robot,'out',belt2,'in'),wire(belt2,'out',robot2,'in'),wire(robot2,'out',pallet,'in')]};
}

interface FlowEnd { x: number; z: number }
interface MergeEntry { sourceId: string; along: number; side: number }

/** Compile a DAG of physical parts. Conveyors can merge, but material fan-out
 * is still rejected until the simulator has explicit splitter routing. */
export function compileComponentGraph(graph: NodeGraph): CompileResult {
  const start = performance.now();
  const connectedIds = new Set(graph.links.flatMap((link) => [link.from.node, link.to.node]));
  const activeGraph = { ...graph, nodes: graph.nodes.filter((node) => connectedIds.has(node.id)) };
  const diagnostics = validateGraph(activeGraph);
  for (const node of graph.nodes) if (!connectedIds.has(node.id)) diagnostics.push({id:`inactive:${node.id}`,severity:'info',nodeId:node.id,message:'Disconnected part is inactive.'});
  const error = (message: string, nodeId?: string) => diagnostics.push({id:`component:${diagnostics.length}`,severity:'error',message,nodeId});
  const { byId, incoming, outgoing } = indexGraph(activeGraph);
  const { order } = topoSort(activeGraph);
  const inFlow = (id: string) => (incoming.get(id) ?? []).filter((link) => link.to.port === 'in' && link.from.port === 'out');
  const outFlow = (id: string) => (outgoing.get(id) ?? []).filter((link) => link.from.port === 'out' && link.to.port === 'in');
  const machineIn = (id: string) => (incoming.get(id) ?? []).filter((link) => link.to.port === 'machine');
  if (graph.nodes.some((node) => !node.type.startsWith('part.'))) error('Physical modules cannot be mixed with legacy settings nodes.');
  const feeders = activeGraph.nodes.filter((node) => node.type === 'part.feeder');
  if (!feeders.length) error('Add a feeder to start a production line.');

  const reachable = new Set(feeders.map((node) => node.id));
  for (const node of order) {
    const ins = inFlow(node.id), outs = outFlow(node.id);
    const predecessors = ins.map((link) => byId.get(link.from.node));
    const next = outs.length === 1 ? byId.get(outs[0].to.node)?.type : undefined;
    if (predecessors.some((parent) => parent && reachable.has(parent.id))) reachable.add(node.id);
    if (outs.length > 1) error('Splitting material into multiple outputs is not supported yet.', node.id);
    if (node.type === 'part.feeder' && next !== 'part.conveyor') error('A feeder must connect to a conveyor.', node.id);
    if (node.type === 'part.conveyor') {
      if (predecessors.some((parent) => !parent || !['part.feeder','part.robot','part.human','part.conveyor'].includes(parent.type))) error('A conveyor must receive material from a feeder, robot or conveyor.', node.id);
      if (ins.length > 1 && predecessors.some((parent) => parent?.type !== 'part.conveyor')) error('To merge lines, connect conveyor outputs to the same conveyor input.', node.id);
      if (new Set(ins.map((link) => link.from.node)).size !== ins.length) error('A conveyor cannot merge the same source twice.', node.id);
      if (!['part.conveyor','part.robot','part.human'].includes(next ?? '')) error('A conveyor must feed another conveyor or a robot.', node.id);
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
    if (node.type !== 'part.machine' && !reachable.has(node.id)) error('This part is not connected to a production line.', node.id);
  }
  for (const node of activeGraph.nodes.filter((entry) => entry.type === 'part.machine')) {
    if (!machineIds.has(node.id)) error('This part is not connected to a production line.', node.id);
    if ((outgoing.get(node.id) ?? []).filter((link) => link.from.port === 'machine').length > 1) error('A machine can be attached to only one robot.', node.id);
  }
  const extraConnectors = activeGraph.nodes.reduce((sum, node) => node.type === 'part.conveyor' && inFlow(node.id).length > 1 ? sum + inFlow(node.id).length : sum, 0);
  if (activeGraph.nodes.length + extraConnectors > 500) error('The built factory would exceed the 500-component project limit.');
  if (diagnostics.some((entry) => entry.severity === 'error')) return {plant:null,diagnostics,results:new Map(),ms:performance.now()-start};

  const value = (node: GraphNode, key: string, fallback: string | number) => node.params[key] ?? fallback;
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
  const ends = new Map<string, FlowEnd>();
  for (const part of order) {
    if (part.type === 'part.machine') continue;
    const ins = inFlow(part.id);
    const parents = ins.map((link) => ({ node: byId.get(link.from.node)!, end: ends.get(link.from.node)! }));
    let item: SceneItem;
    if (part.type === 'part.feeder') {
      const z = lanes.get(part.id)!;
      item = makeItem('feeder', [0.85,0,z], 0, {name:'Feeder',props:{active:true,interval:number(part,'interval',5,0.5,60),product:String(value(part,'product','billet'))}});
      ends.set(part.id, {x:0,z});
    } else if (part.type === 'part.conveyor') {
      const requestedLength = number(part, 'length', 4, 2, 8);
      const kind = value(part,'kind','conveyor') === 'roller' ? 'roller' : 'conveyor';
      const speed = number(part,'speed',0.6,0.1,3);
      const next = byId.get(outFlow(part.id)[0].to.node)!;
      if (parents.length === 1) {
        const {x,z} = parents[0].end;
        item = makeItem(kind, [x,0,z], 0, {name:`Conveyor ${instances.size}`,points:[[0,0],[requestedLength/2,0],[requestedLength,0]],props:{active:true,stopper:['part.robot','part.human'].includes(next.type),speed}});
        ends.set(part.id, {x:x+requestedLength,z});
      } else {
        const sorted = [...parents].sort((a,b) => a.end.z - b.end.z);
        const primary = sorted[Math.floor((sorted.length-1)/2)];
        const z = primary.end.z;
        const secondary = sorted.filter((parent) => parent !== primary).sort((a,b) => Math.abs(a.end.z-z) - Math.abs(b.end.z-z) || a.end.z-b.end.z);
        const side = value(part,'mergeStyle','multi-head') === 'side';
        const farthest = Math.max(...parents.map((parent) => parent.end.x));
        const spread = Math.max(...parents.map((parent) => Math.abs(parent.end.z-z)));
        const x = farthest + (side ? 3 : Math.max(3, spread * 0.8 + 1.5));
        const length = side ? Math.max(requestedLength, 1.9 + secondary.length * 1.2) : requestedLength;
        const entries: MergeEntry[] = [{sourceId:primary.node.id,along:0.2,side:0}, ...secondary.map((parent,index) => ({sourceId:parent.node.id,along:side ? 1.1 + index*1.2 : 0.2,side:Math.sign(parent.end.z-z)}))];
        item = makeItem(kind, [x,0,z], 0, {name:`${side ? 'Side-entry' : 'Multi-head'} conveyor ${instances.size}`,points:[[0,0],[length/2,0],[length,0]],props:{active:true,stopper:['part.robot','part.human'].includes(next.type),speed,mergeStyle:side?'side':'multi-head',mergeInputs:parents.length,mergeEntries:JSON.stringify(entries.map(({along,side:entrySide}) => ({along,side:entrySide})))}});
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
        }
        ends.set(part.id, {x:x+length,z});
      }
    } else if (part.type === 'part.human') {
      const {x,z} = parents[0].end;
      item = makeItem('operator',[x+0.3,0,z+1.45],0,{name:`Operator ${instances.size}`,props:{task:'carry',walkSpeed:number(part,'walkSpeed',1,0.3,2),hat:'hardhat'}});
      ends.set(part.id, {x:x+0.6,z});
    } else if (part.type === 'part.robot') {
      const {x,z} = parents[0].end;
      const kind = String(value(part,'kind','robot'));
      const robotKind = (['robot','cobot','kuka','fanuc'].includes(kind) ? kind : 'robot') as ComponentKind;
      item = makeItem(robotKind,[x+0.3,0,z+1.45],0,{name:`Robot ${instances.size}`,props:{payload:robotKind==='cobot'?5:12,speed:number(part,'speed',70,1,100),gripper:String(value(part,'gripper','vacuum'))}});
      ends.set(part.id, {x:x+0.6,z});
    } else {
      const {x,z} = parents[0].end;
      item = makeItem('crates',[x-0.3,0,z+2.9],0,{name:'Pallet',props:{product:String(value(part,'product','machined')),cols:number(part,'cols',3,1,8),rows:number(part,'rows',2,1,8),layers:number(part,'layers',4,1,10),gap:0.04}});
    }
    instances.set(part.id,item);
    items.push(item);
  }

  for (const part of order) {
    if (part.type !== 'part.robot' && part.type !== 'part.human') continue;
    const robot = instances.get(part.id)!;
    const source = instances.get(inFlow(part.id)[0].from.node)!;
    const target = instances.get(outFlow(part.id)[0].to.node)!;
    const machineNode = byId.get(machineIn(part.id)[0]?.from.node ?? '');
    let machine: SceneItem | undefined;
    if (machineNode) {
      const kind = String(value(machineNode,'kind','cnc'));
      const allowed = ['cnc','press','weld','packaging','paint','cutter','inspection','assembly','kiln','lathe','grinder'];
      machine = makeItem((allowed.includes(kind)?kind:'cnc') as ComponentKind,[robot.position[0],0,robot.position[2]+2.9],180,{name:`Machine ${items.length}`,props:{cycleTime:number(machineNode,'cycleTime',6,1,60),inputProduct:String(value(machineNode,'inputProduct','billet')),outputProduct:String(value(machineNode,'outputProduct','machined')),requiredParts:kind==='assembly'?2:1}});
      items.push(machine); instances.set(machineNode.id,machine);
    }
    if (part.type === 'part.human') {
      robot.props = {...robot.props,task:machine?'tend':'carry',sourceId:source.id,targetId:target.id,machineId:machine?.id ?? ''};
      continue;
    }
    const mode = machine ? (machine.kind==='assembly' ? 'assemble' : machine.kind==='paint' ? 'paint' : 'tend') : target.kind==='crates' ? 'palletize' : 'transfer';
    robot.program = {mode,sourceId:source.id,targetId:target.id,machineId:machine?.id,repeat:true,delay:0,clearance:0.3};
    robot.script = programToCode(robot.program);
  }
  const warnings = validateFactory(items);
  warnings.forEach((message,index) => diagnostics.push({id:`reach:${index}`,severity:'warning',message}));
  const plant: PlantResult = {options:{...DEFAULT_GEN},items,summary:`${feeders.length} production line(s) · ${items.length} components`,warnings};
  return {plant,diagnostics,results:new Map(),ms:Math.round((performance.now()-start)*10)/10};
}
