import assert from 'node:assert/strict';
import '../src/gen/graph/components';
import { connect, insertNodeInLink, makeNode, parseGraph, removeNode, serializeGraph } from '../src/gen/graph/graph';
import { arrangeGraphNodes, copyGraphSelection, estimatedNodeHeight, groupNodes, NODE_WIDTH, pasteGraphSelection, removeGraphNodes } from '../src/gen/graph/layout';
import type { NodeGraph } from '../src/gen/graph/types';

const a=makeNode('part.feeder',0,0,{product:'carton'});
const b=makeNode('part.conveyor',230,0,{speed:0.7});
const c=makeNode('part.robot',500,0);
const d=makeNode('part.pallet',760,0);
let graph:NodeGraph={version:1,nodes:[a,b,c,d],links:[]};
for(const [from,to] of [[a,b],[b,c],[c,d]]) {
  const result=connect(graph,{node:from.id,port:'out'},{node:to.id,port:'in'});
  assert.ok(result.ok); graph=result.graph;
}
const grouped=groupNodes(graph,[a.id,b.id],'Materials','#aabbcc');
assert.ok(grouped.group);
const roundtrip=parseGraph(serializeGraph(grouped.graph));
assert.deepEqual(roundtrip.groups,[grouped.group]);
assert.equal(roundtrip.links.length,graph.links.length);
const bad=parseGraph({...graph,groups:[{id:'abc',name:'',color:'url(x)',nodeIds:[a.id,'missing',a.id,b.id]},{id:'abc',name:'Second',color:'#000000',nodeIds:[b.id,c.id]}]});
assert.equal(bad.groups?.length,2);
assert.deepEqual(bad.groups?.[0].nodeIds,[a.id,b.id]);
assert.equal(bad.groups?.[0].name,'Group');
assert.equal(bad.groups?.[0].color,'#5973a6');
assert.deepEqual(bad.groups?.[1].nodeIds,[c.id]);
assert.notEqual(bad.groups?.[0].id,bad.groups?.[1].id);
assert.equal(parseGraph(graph).groups,undefined,'old version-one graphs are accepted');

const snapshot=copyGraphSelection(grouped.graph,[a.id,b.id]);
assert.equal(snapshot.links.length,1,'only internal links are copied');
assert.equal(snapshot.groups.length,1);
const pasted=pasteGraphSelection(grouped.graph,snapshot,36);
assert.equal(pasted.nodes.length,2); assert.equal(pasted.groups.length,1);
assert.deepEqual(pasted.groups[0].nodeIds,pasted.nodes.map(node=>node.id));
assert.equal(pasted.groups[0].color,'#aabbcc');
assert.equal(pasted.nodes[0].x,a.x+36); assert.equal(pasted.nodes[1].params.speed,0.7);
const copiedLink=pasted.graph.links.find(link=>link.from.node===pasted.nodes[0].id&&link.to.node===pasted.nodes[1].id);
assert.ok(copiedLink); assert.notEqual(copiedLink.id,snapshot.links[0].id);
assert.equal(copyGraphSelection(grouped.graph,[a.id]).groups.length,0,'partial frame is not duplicated');
assert.deepEqual(removeGraphNodes(grouped.graph,[a.id]).groups?.[0].nodeIds,[b.id]);
assert.deepEqual(removeNode(grouped.graph,a.id).groups?.[0].nodeIds,[b.id]);
assert.equal(removeGraphNodes(grouped.graph,[a.id,b.id]).groups?.length,0);
const regroup=groupNodes(grouped.graph,[b.id,c.id],'New','#123456');
assert.deepEqual(regroup.graph.groups?.map(group=>group.nodeIds),[[a.id],[b.id,c.id]]);

const layout=arrangeGraphNodes({...graph,nodes:graph.nodes.map(node=>({...node,x:0,y:0}))},graph.nodes.map(node=>node.id));
for(let i=1;i<layout.nodes.length;i++) assert.ok(layout.nodes[i].x>=layout.nodes[i-1].x+NODE_WIDTH+48);
const collapsed={...b,collapsed:true};
assert.ok(estimatedNodeHeight(collapsed)>26,'collapsed node reserves its visible port rows');
assert.ok(estimatedNodeHeight(collapsed)<estimatedNodeHeight(b));

const wire=graph.links.find(link=>link.from.node===b.id&&link.to.node===c.id)!;
const inserted=makeNode('part.conveyor',250,15);
const insertion=insertNodeInLink({...graph,nodes:[...graph.nodes,inserted]},inserted.id,wire.id);
assert.ok(insertion.ok);
const out=insertion.graph.nodes.find(node=>node.id===inserted.id)!;
const source=insertion.graph.nodes.find(node=>node.id===b.id)!;
const target=insertion.graph.nodes.find(node=>node.id===c.id)!;
const downstream=insertion.graph.nodes.find(node=>node.id===d.id)!;
assert.ok(out.x>=source.x+NODE_WIDTH+48);
assert.ok(target.x>=out.x+NODE_WIDTH+48);
assert.equal(downstream.x-d.x,target.x-c.x,'downstream layout moves together');
assert.ok(insertion.graph.links.some(link=>link.from.node===b.id&&link.to.node===inserted.id));
assert.ok(insertion.graph.links.some(link=>link.from.node===inserted.id&&link.to.node===c.id));
console.log('graph layout: groups, defensive persistence, cloning, rearrangement and insertion spacing OK');
