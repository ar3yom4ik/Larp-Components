import assert from 'node:assert/strict';
import { makeItem } from '../src/data/library';
import { Engine, BELT_TOP } from '../src/sim/engine';
import { signalTargetsPatch } from '../src/utils/signalPorts';
import { createRustLogicStepper } from '../src/sim/wasm/kernel';

// The real visual workflow must wait for a direct IN pulse, perform a place,
// and send the operation-end OUT pulse onward to a feeder (including via PLC).
for (const hybrid of [false, true]) {
  const belt = makeItem('conveyor', [-2, 0, 0], 0, { points: [[0, 0], [1, 0], [2, 0]], props: { speed: 0.6, active: true, stopper: true } });
  const pallet = makeItem('crates', [-0.3, 0, 2.9], 0, { props: { product: 'carton', cols: 3, rows: 2, layers: 4, gap: 0.04 } });
  const feeder = makeItem('feeder', [6, 0, 0], 0, { props: { active: true, product: 'carton', interval: 0.5 } });
  const plc = makeItem('plc', [7, 0, 0], 0, { props: { connectedTo: feeder.id } });
  const robot = makeItem('robot', [0.3, 0, 1.45], 0, { props: { gripper: 'vacuum', speed: 70, outputMode: 'operation-end', connectedTo: plc.id }, program: { mode: 'palletize', sourceId: belt.id, targetId: pallet.id, repeat: true, delay: 0, clearance: 0.3 } });
  const button = makeItem('button', [-4, 0, 0], 0, { props: { signal: false, connectedTo: robot.id } });
  const second = makeItem('button', [-5, 0, 0], 0, { props: { signal: false, connectedTo: robot.id } });
  const e = new Engine();
  const logic = hybrid ? createRustLogicStepper() : null;
  e.logicStepper = logic;
  try {
    e.sync([belt, pallet, feeder, plc, robot, button, second]);
    e.spawn('carton', -0.35, BELT_TOP + 0.13, 0);
    e.setRunning(true);
    const tick = (n: number) => { for (let i = 0; i < n; i++) e.step(1 / 60); };
    tick(5 * 60);
    assert.equal(e.robots.get(robot.id)?.cycles, 0, 'direct robot input prevents automatic picking');
    assert.equal(e.stats.spawned, 1, 'operation-end feeder stays quiet while robot moves home');
    e.setButton(button.id, true); e.setButton(button.id, false); // shorter than a simulation frame
    tick(15 * 60);
    assert.equal(e.robots.get(robot.id)?.cycles, 1, `pulse completes one robot place (${hybrid ? 'Rust logic' : 'TypeScript'})`);
    assert.equal(e.stats.spawned, 2, 'operation-end pulse reaches the PLC and triggers one feeder');
    assert.equal(e.pendingRobotSignals(robot.id), 0);
    // Independent source pulses while busy/no product are queued; removing one
    // source discards just its branch, and unrelated edits preserve the rest.
    e.setButton(button.id, true);
    tick(2 * 60);
    assert.equal(e.pendingRobotSignals(robot.id), 1, 'a held source creates only one queued edge');
    e.setButton(button.id, false);
    e.setButton(second.id, true); e.setButton(second.id, false);
    tick(2);
    assert.equal(e.pendingRobotSignals(robot.id), 2);
    e.sync([belt, pallet, feeder, plc, robot, { ...button, ...signalTargetsPatch(button, []) }, second]);
    assert.equal(e.pendingRobotSignals(robot.id), 1);
    e.sync([belt, pallet, feeder, plc, robot, { ...button, ...signalTargetsPatch(button, []) }, { ...second, props: { ...second.props, wireColor: '#123456' } }]);
    assert.equal(e.pendingRobotSignals(robot.id), 1, 'unrelated scene edits retain queued edges');
    e.sync([belt, pallet, feeder, plc, robot, { ...button, ...signalTargetsPatch(button, []) }, { ...second, visible: false }]);
    assert.equal(e.pendingRobotSignals(robot.id), 0, 'hiding a source discards its queued edge');
    tick(60);
    assert.equal(e.robots.get(robot.id)?.cycles, 1, 'a hidden connected source does not make a gated robot automatic');
    e.reset();
    assert.equal(e.pendingRobotSignals(robot.id), 0, 'reset discards queued pulses');
  } finally { logic?.dispose(); }
}
// Scripted programs explicitly consume the same edge queue, including a pulse
// shorter than one frame, rather than advancing repeatedly on a held input.
async function scriptedSignals() {
  const robot = makeItem('robot', [0, 0, 0], 0, { name: 'Script robot', script: "await robot.waitForSignal(); log('first'); await robot.waitForSignal(); log('second');" });
  const button = makeItem('button', [1, 0, 0], 0, { props: { signal: false, connectedTo: robot.id } });
  const e = new Engine(); e.sync([robot, button]); e.setRunning(true);
  const tick = async (n: number) => { for (let i = 0; i < n; i++) { e.step(1 / 60); await Promise.resolve(); } };
  await tick(10);
  assert.ok(!e.logs.some(line => line.text.includes('[Script robot] first')));
  e.setButton(button.id, true);
  await tick(30);
  assert.ok(e.logs.some(line => line.text.includes('[Script robot] first')));
  assert.ok(!e.logs.some(line => line.text.includes('[Script robot] second')), 'held input does not advance a second wait');
  e.setButton(button.id, false); e.setButton(button.id, true); e.setButton(button.id, false);
  await tick(30);
  assert.ok(e.logs.some(line => line.text.includes('[Script robot] second')), 'short edge is queued for scripts');
}
void scriptedSignals().then(() => console.log('robot signals: queued inputs, scripts, held/hidden sources, operation-end output, PLC and Rust parity OK'));
