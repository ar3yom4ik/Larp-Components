import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeItem } from '../src/data/library';
import { itemLocalToWorld } from '../src/utils/transform';
import { signalAnchor } from '../src/utils/signalPorts';
import { Engine, BELT_TOP } from '../src/sim/engine';
import { serializeProject, parseProject } from '../src/utils/project';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';

const item = makeItem('sensor', [4, 2.5, -3], 37, { rotationX: 28, rotationZ: -21, scale: 1.5 });
const local: [number, number, number] = [0, 1.08, 0.1];
const expected = new THREE.Vector3(...local).multiplyScalar(item.scale).applyEuler(new THREE.Euler(item.rotationX! * Math.PI / 180, item.rotation * Math.PI / 180, item.rotationZ! * Math.PI / 180)).add(new THREE.Vector3(...item.position));
const actual = itemLocalToWorld(item, local);
assert.ok(expected.distanceTo(new THREE.Vector3(...actual)) < 1e-10, 'XYZ local-to-world matches the rendered group');
assert.deepEqual(signalAnchor(item, 'source'), actual, 'wires follow all transform axes');
const disk = serializeProject({ projectName: '3D', layoutName: 'Transforms', activeLayoutId: null, items: [item] });
const [restored] = parseProject(readProjectArchive(createProjectArchive(disk))).items;
assert.equal(restored.rotationX, 28); assert.equal(restored.rotation, 37); assert.equal(restored.rotationZ, -21);
assert.deepEqual(restored.position, item.position);
const [old] = parseProject(serializeProject({ projectName: 'Old', layoutName: 'Legacy', activeLayoutId: null, items: [makeItem('sensor')] })).items;
assert.equal(old.rotationX, undefined, 'old yaw-only projects remain valid');

// Lift a complete functioning line: spawn, supports, robot IK and pallet slots
// all share the same world-space Y.
{
  const belt = makeItem('conveyor', [-2, 2, 0], 0, { points: [[0, 0], [1, 0], [2, 0]], props: { speed: 0.6, active: true, stopper: true } });
  const feeder = makeItem('feeder', [-1.7, 2, 0], 0, { props: { active: true, interval: 4, product: 'carton' } });
  const pallet = makeItem('crates', [-0.3, 2, 2.9], 0, { props: { product: 'carton', cols: 3, rows: 2, layers: 4, gap: 0.04 } });
  const robot = makeItem('robot', [0.3, 2, 1.45], 0, { props: { gripper: 'vacuum', speed: 70 }, program: { mode: 'palletize', sourceId: belt.id, targetId: pallet.id, repeat: true, delay: 0, clearance: 0.3 } });
  const e = new Engine();
  {
    e.sync([belt, feeder, pallet, robot]);
    assert.equal(e.conveyors.get(belt.id)?.top, 2 + BELT_TOP);
    assert.equal(e.feeders.get(feeder.id)?.y, 3.12);
    assert.ok(Math.abs(e.pallets.get(pallet.id)!.slot(0).y - 2.152) < 1e-10);
    assert.ok(e.robots.get(robot.id)!.homeTip()[1] > 2.5);
    e.setRunning(true);
    for (let frame = 0; frame < 65 * 60; frame++) e.step(1 / 60);
    assert.ok(e.robots.get(robot.id)!.cycles > 0, 'elevated line did not place a part');
    assert.equal(e.stats.lost, 0);
    // Move a belt while a product is resting on it; it follows its support.
    const b = e.spawn('carton', -1, 2 + BELT_TOP + 0.13, 0);
    for (let frame = 0; frame < 5; frame++) e.step(1 / 60);
    assert.equal(b.convId, belt.id);
    const oldY = b.y;
    e.sync([{ ...belt, position: [-2, 3, 0] }, feeder, pallet, robot]);
    assert.ok(Math.abs(b.y - oldY - 1) < 1e-9, 'resting product moves vertically with the edited conveyor');
  }
}

// Robot local/world kinematics remain inverses even for a tilted, scaled base.
{
  const e = new Engine();
  const robot = makeItem('robot', [5, 3, -2], 43, { rotationX: 22, rotationZ: -18, scale: 1.3 });
  e.sync([robot]);
  const rt = e.robots.get(robot.id)!;
  const local: [number, number, number] = [1, 1.2, -0.3];
  const world = rt.toWorld(local), back = rt.toLocal(world);
  assert.ok(back.every((v, i) => Math.abs(v - local[i]) < 1e-10));
  assert.ok(world.every((v, i) => Math.abs(v - itemLocalToWorld(robot, local)[i]) < 1e-10));
}

// An elevated sensor cannot trigger from a product on a different floor.
{
  const sensor = makeItem('sensor', [4, 3, 0], 0, { props: { radius: 0.8 } });
  const e = new Engine();
  {
    e.sync([sensor]); const ground = e.spawn('carton', 4, 0.8, 0); e.setRunning(true); e.step(1 / 60);
    assert.equal(e.signalState.get(sensor.id), false);
    ground.state = 'dead'; const elevated = e.spawn('carton', 4, 3.8, 0); e.step(1 / 60);
    assert.equal(e.signalState.get(sensor.id), true);
    e.sync([{ ...sensor, position: [4, 0, 0] }]); e.step(1 / 60);
    assert.equal(e.signalState.get(sensor.id), false, 'ground sensor must not sense a product on the upper floor');
    elevated.state = 'dead'; e.spawn('carton', 4, 0.8, 0); e.step(1 / 60);
    assert.equal(e.signalState.get(sensor.id), true, 'ground sensor still sees a product at its own height');
  }
}
console.log('scene transforms: XYZ, wires, archive, elevated line, robot kinematics and detector heights OK');
