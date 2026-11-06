import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeItem } from '../src/data/library';
import { importedModelSize } from '../src/data/products';
import type { ImportedModelData } from '../src/types';
import { sceneItemsInBox } from '../src/utils/boxSelection';
import { copySceneItems, snapshotSceneItems } from '../src/utils/sceneClipboard';
import { importedCollisionBoxes } from '../src/utils/modelCollision';
import { modelAxisRotation, orientModelSize, orientModelVector } from '../src/utils/modelAxis';
import { parseProject, serializeProject } from '../src/utils/project';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';

// The projected bounds, rather than the item origin, determine box hits.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
for (const [id, x] of [['left', -3], ['middle', 0], ['right', 3]] as const) {
  const item = new THREE.Group(); item.userData.sceneItemId = id; item.position.x = x;
  item.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())); scene.add(item);
}
const canvas = {left:0, top:0, right:400, bottom:400};
const allowed = new Set(['left','middle','right']);
const center = sceneItemsInBox(scene, camera, canvas, {left:195, top:195, right:205, bottom:205}, allowed);
assert.deepEqual(center, ['middle']);
const all = sceneItemsInBox(scene, camera, canvas, {left:0, top:0, right:400, bottom:400}, new Set(['left','middle']));
assert.deepEqual(all, ['left','middle'], 'only eligible item roots are selected');
scene.children[0].visible = false;
assert.deepEqual(sceneItemsInBox(scene, camera, canvas, {left:0, top:0, right:400, bottom:400}, allowed), ['middle','right']);

const belt = makeItem('conveyor', [2, 1, 3]);
const feeder = makeItem('feeder', [4, 1, 3]);
const sensor = makeItem('laser', [2, 1, 3], 30, { props: { mountedTo:belt.id, connectedTo:feeder.id, mountPosition:.5 }, signalTargets:[feeder.id, 'external'], signalRoutes:[{output:1,targetId:feeder.id,input:2}] });
const robot = makeItem('robot', [5, 1, 3], 0, { program:{mode:'palletize',sourceId:belt.id,targetId:feeder.id,machineId:'external',repeat:true,delay:0,clearance:.3} });
const original = [belt, feeder, sensor, robot], snap = snapshotSceneItems(original);
snap[0].position[0] = 999;
assert.equal(belt.position[0], 2, 'clipboard snapshots do not mutate original positions');
const copied = copySceneItems(original, [.8, 0, .8]);
const [newBelt, newFeeder, newSensor, newRobot] = copied;
assert.notEqual(newBelt.id, belt.id); assert.notEqual(newFeeder.id, feeder.id);
assert.equal(newSensor.props.mountedTo, newBelt.id); assert.equal(newSensor.props.connectedTo, newFeeder.id);
assert.deepEqual(newSensor.signalTargets, [newFeeder.id, 'external']);
assert.equal(newSensor.signalRoutes?.[0].targetId, newFeeder.id);
assert.equal(newRobot.program?.sourceId, newBelt.id); assert.equal(newRobot.program?.targetId, newFeeder.id); assert.equal(newRobot.program?.machineId, 'external');
assert.ok(Math.abs(newFeeder.position[0] - newBelt.position[0] - 2) < 1e-9);

// X-up is consistent across the visible model, dimensions, collision shapes,
// and persisted projects (including a portable source attribution).
assert.deepEqual(orientModelVector([2, 3, 4], 'x'), [-3, 2, 4]);
assert.deepEqual(orientModelSize([2, 3, 4], 'x'), [3, 2, 4]);
const rotated = new THREE.Vector3(2,3,4).applyEuler(new THREE.Euler(...modelAxisRotation('x')));
assert.ok(rotated.distanceTo(new THREE.Vector3(-3,2,4)) < 1e-9);
const model: ImportedModelData = {
  asset:{id:'asset-1',entry:'object.glb',files:[{path:'object.glb',dataUrl:'data:application/octet-stream;base64,AA=='}],source:{provider:'Gobkit',title:'Test asset',url:'https://gobkit.com/freebies',license:'CC0 1.0'}},
  axis:'x', units:'cm', materials:[], meshCount:1, triangleCount:12, sourceSize:[2,3,4],
  collision:{min:[0,0,0],max:[2,3,4],boxes:[{center:[1,1.5,2],size:[2,3,4]}]},
};
assert.deepEqual(importedModelSize(model,2), [.06,.04,.08]);
const box = importedCollisionBoxes(model,2)![0];
assert.deepEqual(box.center, [0,.02,0]); assert.deepEqual(box.size, [.06,.04,.08]);
const imported = makeItem('imported-model', [0,0,0], 0, { imported:model, scale:2 });
const serialized = serializeProject({projectName:'Selection',layoutName:'Test',activeLayoutId:null,items:[imported],workpieces:[imported]});
const restored = parseProject(readProjectArchive(createProjectArchive(serialized)));
assert.equal(restored.items[0].imported?.axis, 'x'); assert.equal(restored.items[0].scale,2);
assert.deepEqual(restored.items[0].imported?.asset.source, model.asset.source);
const unsafe = JSON.parse(serialized.slice(serialized.indexOf("\n") + 1));
const asset = Object.values(unsafe.assets ?? {})[0] as {source?: {url:string}} | undefined;
assert.ok(asset?.source);
if (asset?.source) { asset.source.url = 'javascript:alert(1)'; assert.equal(parseProject(JSON.stringify(unsafe)).items[0].imported?.asset.source, undefined); }
console.log('selection tools: projected bounds, copied links, X-up collision/dimensions and archive provenance OK');
