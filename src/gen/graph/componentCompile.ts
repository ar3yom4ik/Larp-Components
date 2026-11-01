import './components';
import { makeItem } from '../../data/library';
import { DEFAULT_GEN, validateFactory } from '../../sim/generator';
import { programToCode } from '../../sim/programCode';
import type { ComponentKind, SceneItem } from '../../types';
import { makeNode, uid, validateGraph } from './graph';
import type { GraphLink, GraphNode, NodeGraph, PlantResult } from './types';
import type { CompileResult } from './compile';

/** A simple working physical line, independent of the legacy settings-graph storage. */
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

/** Compile physical parts from their material connections. Independent lines are
 * supported; unsupported split/merge flows are rejected rather than silently changed. */
export function compileComponentGraph(graph: NodeGraph): CompileResult {
  const start = performance.now();
  // Loose nodes are templates; only connected nodes participate in validation/build.
  const connectedIds = new Set(graph.links.flatMap(link => [link.from.node, link.to.node]));
  const activeGraph = { ...graph, nodes: graph.nodes.filter(node => connectedIds.has(node.id)) };
  const diagnostics = validateGraph(activeGraph);
  for (const node of graph.nodes) if (!connectedIds.has(node.id)) diagnostics.push({id:`inactive:${node.id}`,severity:'info',nodeId:node.id,message:'Disconnected part is inactive.'});
  const error = (message:string, nodeId?:string) => diagnostics.push({id:`component:${diagnostics.length}`,severity:'error',message,nodeId});
  const byId = new Map(graph.nodes.map(n=>[n.id,n]));
  if (graph.nodes.some(n=>!n.type.startsWith('part.'))) error('Physical modules cannot be mixed with legacy settings nodes.');
  const feeders = activeGraph.nodes.filter(n=>n.type==='part.feeder');
  if (!feeders.length) error('Add a feeder to start a production line.');
  const visited = new Set<string>();
  const chains: GraphNode[][] = [];
  for (const feeder of feeders) {
    const chain: GraphNode[] = [];
    let node: GraphNode | undefined = feeder;
    while (node && !visited.has(node.id)) {
      visited.add(node.id); chain.push(node);
      const next: GraphLink[] = graph.links.filter(l=>l.from.node===node!.id && l.from.port==='out');
      if (next.length > 1) { error('Branching material flow is not supported yet.', node.id); break; }
      node = next.length ? byId.get(next[0].to.node) : undefined;
    }
    if (node && visited.has(node.id)) error('Material lines cannot merge or form a loop.', node.id);
    if (chain.at(-1)?.type !== 'part.pallet') error('Connect the material flow to a pallet.', feeder.id);
    chain.forEach((entry, index) => {
      const prev = chain[index-1]?.type;
      const next = chain[index+1]?.type;
      if (entry.type==='part.feeder' && next!=='part.conveyor') error('A feeder must connect to a conveyor.', entry.id);
      if (entry.type==='part.conveyor' && !['part.feeder','part.robot','part.human','part.conveyor'].includes(prev)) error('A conveyor must receive material from a feeder, robot or conveyor.',entry.id);
      if (entry.type==='part.conveyor' && !['part.conveyor','part.robot','part.human'].includes(next)) error('A conveyor must feed another conveyor or a robot.',entry.id);
      if ((entry.type==='part.robot' || entry.type==='part.human') && (prev!=='part.conveyor' || !['part.conveyor','part.pallet'].includes(next))) error('A robot needs a source conveyor and a target conveyor or pallet.',entry.id);
      if (entry.type==='part.pallet' && !['part.robot','part.human'].includes(prev)) error('A pallet must be connected to a robot.',entry.id);
      if ((entry.type==='part.robot' || entry.type==='part.human') && next==='part.pallet' && graph.links.some(l=>l.to.node===entry.id && l.to.port==='machine')) error('A palletizing robot cannot tend a machine. Connect a conveyor and another robot before the pallet.',entry.id);
    });
    chains.push(chain);
  }
  const machineIds = new Set(graph.links.filter(l=>l.to.port==='machine' && visited.has(l.to.node)).map(l=>l.from.node));
  for (const part of activeGraph.nodes) if (!visited.has(part.id) && !machineIds.has(part.id)) error('This part is not connected to a production line.',part.id);
  for (const machineId of machineIds) {
    if (graph.links.filter(l=>l.from.node===machineId && l.from.port==='machine').length > 1) error('A machine can be attached to only one robot.',machineId);
  }
  if (diagnostics.some(d=>d.severity==='error')) return {plant:null,diagnostics,results:new Map(),ms:performance.now()-start};

  const items: SceneItem[] = [];
  const instances = new Map<string,SceneItem>();
  const get = (n:GraphNode, k:string, fallback:string|number) => n.params[k] ?? fallback;
  for (const [lineIndex, chain] of chains.entries()) {
  let x = 0;
  const z = lineIndex * 9;
  for (const [partIndex, part] of chain.entries()) {
    let item:SceneItem;
    if (part.type==='part.feeder') {
      item = makeItem('feeder',[0.85,0,z],0,{name:'Feeder',props:{active:true,interval:Number(get(part,'interval',5)),product:String(get(part,'product','billet'))}});
    } else if (part.type==='part.conveyor') {
      const length = Math.max(2,Math.min(8,Number(get(part,'length',4)) || 4));
      const kind = get(part,'kind','conveyor') === 'roller' ? 'roller' : 'conveyor';
      item = makeItem(kind,[x,0,z],0,{name:`Conveyor ${instances.size}`,points:[[0,0],[length/2,0],[length,0]],props:{active:true,stopper:['part.robot','part.human'].includes(chain[partIndex+1]?.type),speed:Number(get(part,'speed',0.6))}});
      x += length;
    } else if (part.type==='part.human') {
      item = makeItem('operator',[x+0.3,0,z+1.45],0,{name:`Operator ${instances.size}`,props:{task:'carry',walkSpeed:Number(get(part,'walkSpeed',1)),hat:'hardhat'}});
      x += 0.6;
    } else if (part.type==='part.robot') {
      const kind = String(get(part,'kind','robot'));
      const robotKind = (['robot','cobot','kuka','fanuc'].includes(kind) ? kind : 'robot') as ComponentKind;
      item = makeItem(robotKind,[x+0.3,0,z+1.45],0,{name:`Robot ${instances.size}`,props:{payload:robotKind==='cobot'?5:12,speed:Number(get(part,'speed',70)),gripper:String(get(part,'gripper','vacuum'))}});
      x += 0.6;
    } else {
      item = makeItem('crates',[x-0.3,0,z+2.9],0,{name:'Pallet',props:{product:String(get(part,'product','machined')),cols:Number(get(part,'cols',3)),rows:Number(get(part,'rows',2)),layers:Number(get(part,'layers',4)),gap:0.04}});
    }
    instances.set(part.id,item); items.push(item);
  }
  for (let i=0;i<chain.length;i++) {
    const part=chain[i]; if (part.type!=='part.robot' && part.type!=='part.human') continue;
    const robot=instances.get(part.id)!;
    const source=instances.get(chain[i-1].id)!; const target=instances.get(chain[i+1].id)!;
    const machineLink=graph.links.find(l=>l.to.node===part.id && l.to.port==='machine');
    const machineNode=machineLink ? byId.get(machineLink.from.node) : undefined;
    let machine:SceneItem|undefined;
    if (machineNode) {
      const kind=String(get(machineNode,'kind','cnc'));
      const allowed=['cnc','press','weld','packaging','paint','cutter','inspection','assembly','kiln','lathe','grinder'];
      machine=makeItem((allowed.includes(kind)?kind:'cnc') as ComponentKind,[robot.position[0],0,z+4.35],180,{name:`Machine ${i}`,props:{cycleTime:Number(get(machineNode,'cycleTime',6)),inputProduct:String(get(machineNode,'inputProduct','billet')),outputProduct:String(get(machineNode,'outputProduct','machined')),requiredParts:kind==='assembly'?2:1}});
      items.push(machine); instances.set(machineNode.id,machine);
    }
    if (part.type === 'part.human') {
      robot.props = {...robot.props, task: machine ? 'tend' : 'carry', sourceId:source.id, targetId:target.id, machineId:machine?.id ?? ''};
      continue;
    }
    const mode = machine ? (machine.kind==='assembly' ? 'assemble' : machine.kind==='paint' ? 'paint' : 'tend') : target.kind==='crates' ? 'palletize' : 'transfer';
    robot.program={mode,sourceId:source.id,targetId:target.id,machineId:machine?.id,repeat:true,delay:0,clearance:0.3};
    robot.script=programToCode(robot.program);
  }
  }
  const warnings=validateFactory(items);
  warnings.forEach((message,index)=>diagnostics.push({id:`reach:${index}`,severity:'warning',message}));
  const plant:PlantResult={options:{...DEFAULT_GEN},items,summary:`${chains.length} production line(s) · ${items.length} components`,warnings};
  return {plant,diagnostics,results:new Map(),ms:Math.round((performance.now()-start)*10)/10};
}
