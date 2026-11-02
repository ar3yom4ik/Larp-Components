import assert from 'node:assert/strict';
import { makeItem } from '../src/data/library';
import { Engine } from '../src/sim/engine';
import { createRustFeederStepper, createRustLogicStepper } from '../src/sim/wasm/kernel';
import { canSignalInput, canSignalOutput, signalAnchor, signalTargets, signalTargetsPatch, signalWireColor, DEFAULT_WIRE_COLOR } from '../src/utils/signalPorts';
import { serializeProject, parseProject } from '../src/utils/project';
import { createProjectArchive, readProjectArchive } from '../src/utils/projectArchive';
import type { SceneItem } from '../src/types';

const tick = (engine: Engine, frames = 1) => { for (let i = 0; i < frames; i++) engine.step(1 / 60); };
const clearOutput = (engine: Engine) => { engine.boxes.length = 0; };
const feeder = makeItem('feeder', [0, 0, 0], 0, { props: { interval: 0.5, active: true, product: 'carton' } });
const button = makeItem('button', [-3, 0, 0], 0, { props: { signal: false, connectedTo: feeder.id, wireColor: '#0055ff' } });
const second = makeItem('button', [3, 0, 0], 0, { props: { signal: false, connectedTo: feeder.id, wireColor: '#ff2200' } });
assert.ok(canSignalInput(feeder, button.id), 'feeders expose an input port');
assert.equal(signalWireColor(button.props.wireColor), '#0055ff');
assert.equal(signalWireColor('not a color'), DEFAULT_WIRE_COLOR);
const rotated = { ...button, position: [1, 2, 3] as [number, number, number], rotation: 90, scale: 2 };
const anchor = signalAnchor(rotated, 'source');
assert.ok(Math.abs(anchor[0] - 1) < 1e-9 && Math.abs(anchor[1] - 3.7) < 1e-9 && Math.abs(anchor[2] - 2.68) < 1e-9, 'wire endpoints follow position, scale and rotation');
const targetAnchor = signalAnchor(feeder, 'target');
assert.deepEqual(targetAnchor, [0.43, 2.1, 0], 'wire ends at the feeder housing');

// Old projects still run an unwired feeder on its timer.
{
  const e = new Engine(); e.sync([feeder]); e.setRunning(true); tick(e, 50);
  assert.equal(e.stats.spawned, 1, 'unwired feeder remains automatic');
}

// Each source has its own edge. Holding one high does not repeat, and another
// source can trigger while the first is held. Scene edits do not invent edges.
{
  const e = new Engine(); e.sync([feeder, button, second]); e.setRunning(true); tick(e, 180);
  assert.equal(e.stats.spawned, 0, 'connected feeder does not auto-spawn');
  e.setButton(button.id, true); tick(e); assert.equal(e.stats.spawned, 1);
  clearOutput(e); tick(e, 120); assert.equal(e.stats.spawned, 1, 'held signal makes only one part');
  e.sync([feeder, { ...button, props: { ...button.props, wireColor: '#112233' } }, second]);
  assert.equal(e.signalState.get(button.id), true, 'unrelated edits preserve live button state');
  tick(e, 60); assert.equal(e.stats.spawned, 1, 'editing does not retrigger');
  e.setButton(second.id, true); tick(e); assert.equal(e.stats.spawned, 2, 'second source has an independent rising edge');
  clearOutput(e); e.setButton(button.id, false); e.setButton(button.id, true); tick(e, 31);
  assert.equal(e.stats.spawned, 3, 'release and repress requests another part');
  clearOutput(e); tick(e, 120); assert.equal(e.stats.spawned, 3);
}

// A source can fan out to multiple destinations, with one edge delivered to
// every feeder. Removing a branch leaves the others connected.
{
  const anotherFeeder = makeItem('feeder', [4, 0, 0], 0, { props: { interval: 0.5, active: true, product: 'carton' } });
  const branched = { ...button, ...signalTargetsPatch(button, [feeder.id, anotherFeeder.id]) };
  assert.deepEqual(signalTargets(branched), [feeder.id, anotherFeeder.id]);
  const e = new Engine(); e.sync([feeder, anotherFeeder, branched]); e.setRunning(true); tick(e, 80);
  assert.equal(e.stats.spawned, 0);
  e.setButton(button.id, true); tick(e);
  assert.equal(e.stats.spawned, 2, 'both feeders receive one signal');
  clearOutput(e); tick(e, 90); assert.equal(e.stats.spawned, 2, 'branches do not repeat on a held signal');
  const single = { ...branched, ...signalTargetsPatch(branched, [anotherFeeder.id]) };
  assert.deepEqual(signalTargets(single), [anotherFeeder.id]);
  e.sync([anotherFeeder, single]); e.setButton(button.id, false); e.setButton(button.id, true); tick(e);
  assert.equal(e.stats.spawned, 3, 'remaining branch still works');
  const disk = serializeProject({ projectName: 'Branched', layoutName: 'Signals', activeLayoutId: null, items: [feeder, anotherFeeder, branched] });
  const reloaded = parseProject(readProjectArchive(createProjectArchive(disk)));
  assert.deepEqual(signalTargets(reloaded.items[2]), [feeder.id, anotherFeeder.id], 'branch targets survive archive round-trip');
}

// A short pulse must not be lost between simulation/render frames. Pending
// requests wait for clearance, and are discarded if their source is disconnected.
{
  const e = new Engine(); e.sync([feeder, button, second]); e.setRunning(true);
  const blocker = e.spawn('carton', 0, 1.12, 0); const before = e.stats.spawned;
  e.setButton(button.id, true); e.setButton(button.id, false); tick(e);
  assert.equal(e.stats.spawned, before); assert.equal(e.pendingFeederSignals(feeder.id), 1, 'blocked request is queued');
  blocker.state = 'dead'; tick(e); assert.equal(e.stats.spawned, before + 1, 'queued pulse is delivered after clearing');
  assert.equal(e.pendingFeederSignals(feeder.id), 0);
  clearOutput(e); tick(e, 31);
  const blocker2 = e.spawn('carton', 0, 1.12, 0); const beforeDisconnect = e.stats.spawned;
  e.setButton(button.id, true); e.setButton(button.id, false); tick(e);
  assert.equal(e.pendingFeederSignals(feeder.id), 1);
  e.sync([feeder, { ...button, props: { ...button.props, connectedTo: '' } }, second]);
  blocker2.state = 'dead'; tick(e, 60);
  assert.equal(e.stats.spawned, beforeDisconnect, 'disconnect cancels requests from that source');
  e.setButton(second.id, true); tick(e); assert.equal(e.stats.spawned, beforeDisconnect + 1);
}

// Supply and disabled state are respected. Hidden but still-wired sources keep
// a feeder signal-controlled instead of unexpectedly starting the timer.
{
  const stocked = { ...feeder, props: { ...feeder.props, requireSupply: true } };
  const e = new Engine(); e.sync([stocked, button]); e.feeders.get(feeder.id)!.supply = 0; e.setRunning(true);
  e.setButton(button.id, true); e.setButton(button.id, false); tick(e);
  assert.equal(e.stats.spawned, 0); assert.equal(e.pendingFeederSignals(feeder.id), 1);
  e.feeders.get(feeder.id)!.supply = 1; tick(e); assert.equal(e.stats.spawned, 1);
  e.sync([stocked, { ...button, visible: false }]); clearOutput(e); tick(e, 120);
  assert.equal(e.stats.spawned, 1, 'hiding a wired source does not enable automatic feeding');
  e.sync([{ ...stocked, props: { ...stocked.props, active: false } }, button]);
  e.setButton(button.id, true); e.setButton(button.id, false); tick(e);
  e.sync([stocked, button]); tick(e, 60);
  assert.equal(e.stats.spawned, 1, 'pulses while inactive are not replayed later');
}

// Proximity, laser and PLC outputs all work as feeder sources, including a
// signal that is high when first connected and a simulation reset.
for (const kind of ['sensor', 'laser', 'plc'] as const) {
  const e = new Engine();
  const source = makeItem(kind, [4, 0, 0], 0, { props: { connectedTo: feeder.id, radius: 0.8, range: 3, signal: kind === 'plc' } });
  e.sync([feeder, source]);
  if (kind !== 'plc') e.spawn('carton', 4, 0.8, 0);
  const before = e.stats.spawned;
  e.setRunning(true); tick(e, 4);
  assert.equal(e.stats.spawned, before + 1, `${kind} activation feeds a part`);
  // Clear only the feeder output, keeping the detected object in place.
  e.boxes = e.boxes.filter((box) => Math.abs(box.x - 4) < 0.5);
  tick(e, 15); assert.equal(e.stats.spawned, before + 1, `${kind} held signal does not repeat`);
}
{
  const e = new Engine(); const high = { ...button, props: { ...button.props, signal: true } };
  e.sync([feeder, high]); e.setRunning(true); tick(e); assert.equal(e.stats.spawned, 1);
  e.reset(); tick(e); assert.equal(e.stats.spawned, 1, 'reset rearms an initially high signal once');
}

// Every supported robot type can publish its moving/holding state to a feeder.
// Unlike the earlier property-only connection, the wire must actually gate it.
for (const kind of ['robot', 'cobot', 'kuka', 'fanuc'] as const) {
  const e = new Engine();
  const robot = makeItem(kind, [5, 0, 0], 0, { props: { connectedTo: feeder.id } });
  assert.ok(canSignalOutput(robot), `${kind} exposes an output port`);
  e.sync([feeder, robot]); e.setRunning(true); tick(e, 80);
  assert.equal(e.stats.spawned, 0, `${kind}-connected feeder must not run automatically`);
  const held = e.spawn('carton', 5, 0.8, 0); held.state = 'held';
  const rt = e.robots.get(robot.id)!; rt.held = held;
  tick(e, 3); assert.equal(e.stats.spawned, 2, `${kind} holding signal feeds one part`);
  e.boxes = e.boxes.filter((box) => box === held);
  e.sync([feeder, { ...robot, props: { ...robot.props, wireColor: '#13579b' } }]);
  tick(e, 90); assert.equal(e.stats.spawned, 2, `${kind} held signal does not repeat after edits`);
  rt.held = null; held.state = 'dead'; tick(e, 2);
  e.sync([feeder, { ...robot, visible: false }]); tick(e, 100);
  assert.equal(e.stats.spawned, 2, `hidden ${kind} keeps the feeder signal-controlled`);
}

// Disconnecting a robot while high and reconnecting it once idle must not
// replay a stale high state and cause an unexpected part.
{
  const e = new Engine(); const robot = makeItem('robot', [5, 0, 0], 0, { props: { connectedTo: feeder.id } });
  e.sync([feeder, robot]); e.setRunning(true);
  const held = e.spawn('carton', 5, 0.8, 0); held.state = 'held'; const rt = e.robots.get(robot.id)!; rt.held = held;
  tick(e, 3); assert.equal(e.stats.spawned, 2);
  e.boxes = []; e.sync([feeder, { ...robot, props: { ...robot.props, connectedTo: '' } }]);
  rt.held = null; tick(e, 2);
  e.sync([feeder, robot]); tick(e, 100);
  assert.equal(e.stats.spawned, 2, 'reconnecting an idle robot does not replay its old output');
}

// Robot signals must also flow through a PLC when the experimental Rust logic
// stepper is enabled; robot signals are owned by TypeScript, not logic nodes.
{
  const first = makeItem('feeder', [0, 0, 0], 0, { props: { interval: 0.5, active: true, product: 'carton' } });
  const secondFeeder = makeItem('feeder', [4, 0, 0], 0, { props: { interval: 0.5, active: true, product: 'carton' } });
  const plc = makeItem('plc', [7, 0, 0], 0, { props: { connectedTo: secondFeeder.id } });
  const robot = makeItem('robot', [10, 0, 0], 0, { props: { connectedTo: first.id }, signalTargets: [plc.id] });
  const ts = new Engine(), hybrid = new Engine(), rustLogic = createRustLogicStepper(); hybrid.logicStepper = rustLogic;
  try {
    for (const e of [ts, hybrid]) {
      e.sync(structuredClone([first, secondFeeder, plc, robot])); e.setRunning(true);
      const held = e.spawn('carton', 10, 0.8, 0); held.state = 'held'; e.robots.get(robot.id)!.held = held;
    }
    for (let frame = 0; frame < 20; frame++) {
      tick(ts); tick(hybrid);
      assert.equal(hybrid.stats.spawned, ts.stats.spawned, `robot/PLC hybrid spawn parity at frame ${frame}`);
      assert.equal(hybrid.signalState.get(plc.id), ts.signalState.get(plc.id), `robot/PLC hybrid signal parity at frame ${frame}`);
    }
    assert.equal(ts.stats.spawned, 3, 'direct robot and PLC branches each feed one part');
  } finally { rustLogic.dispose(); }
}

// Signal mode stays on the host even when experimental Rust feeders/logic are enabled.
{
  const ts = new Engine(), hybrid = new Engine();
  const rustFeeder = createRustFeederStepper(), rustLogic = createRustLogicStepper();
  hybrid.feederStepper = rustFeeder; hybrid.logicStepper = rustLogic;
  const auto = makeItem('feeder', [0, 0, 0], 0, { props: { interval: 0.5, active: true, product: 'carton' } });
  const items: SceneItem[] = [auto, feeder, button];
  try {
    for (const e of [ts, hybrid]) { e.sync(structuredClone(items)); e.feeders.get(auto.id)!.timer = 0; e.setRunning(true); e.setButton(button.id, true); }
    for (let frame = 0; frame < 100; frame++) {
      if (frame === 40) for (const e of [ts, hybrid]) clearOutput(e);
      tick(ts); tick(hybrid);
      assert.equal(hybrid.stats.spawned, ts.stats.spawned, `hybrid spawn parity at frame ${frame}`);
      assert.equal(hybrid.pendingFeederSignals(feeder.id), ts.pendingFeederSignals(feeder.id));
      if (frame === 0) { assert.equal(ts.stats.spawned, 1, 'overlapping feeders do not spawn on top of each other'); assert.equal(ts.pendingFeederSignals(feeder.id), 1); }
    }
    assert.equal(ts.pendingFeederSignals(feeder.id), 0, 'signal request is eventually delivered');
  } finally { rustFeeder.dispose(); rustLogic.dispose(); }
}

const text = serializeProject({ projectName: 'Colored wires', layoutName: 'Signals', activeLayoutId: null, items: [feeder, button, second] });
const project = parseProject(readProjectArchive(createProjectArchive(text)));
assert.equal(project.items[1].props.wireColor, '#0055ff');
assert.equal(project.items[2].props.wireColor, '#ff2200');
assert.equal(project.items[1].props.connectedTo, feeder.id);
console.log('signal feeders: independent edges, robot/PLC outputs, short pulses, blocking, supply, reset, Rust parity, anchors and wire colors OK');
