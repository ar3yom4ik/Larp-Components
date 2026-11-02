import assert from 'node:assert/strict';
import { Engine } from '../src/sim/engine';
import { makeItem } from '../src/data/library';
import { signalTargetsPatch } from '../src/utils/signalPorts';

const belt = makeItem('conveyor', [0, 0, 0], 0, {props:{speed: .6, active: true}});
const button = makeItem('button', [4, 0, 0], 0, {props:{signal:false, activeDuration:0, connectedTo:belt.id}});
const e = new Engine(); e.sync([belt, button]);
assert.equal(e.conveyors.get(belt.id)?.active, false, 'wired inactive button stops the conveyor');
e.pressButton(button.id); assert.equal(e.conveyors.get(belt.id)?.active, true);
e.pressButton(button.id); assert.equal(e.conveyors.get(belt.id)?.active, false);
assert.equal(button.props.signal, false, 'clicks do not change the saved initial state');
// Independent branches are ORed, and a hidden wire cannot switch an otherwise
// signal-controlled conveyor back to automatic running.
const other = makeItem('button', [6,0,0], 0, {props:{signal:true, connectedTo:belt.id}});
e.sync([belt, button, other]); assert.equal(e.conveyors.get(belt.id)?.active, true);
e.sync([belt, button, {...other, visible:false}]); assert.equal(e.conveyors.get(belt.id)?.active, false);
e.sync([belt, {...button, ...signalTargetsPatch(button, [])}]);
assert.equal(e.conveyors.get(belt.id)?.active, true, 'disconnect restores the manual running state');
// A timed click is a retriggerable simulation-time pulse.
const timed = {...button, props:{...button.props, activeDuration:.5}};
e.sync([belt, timed]); e.setRunning(true); e.pressButton(timed.id);
for(let i=0;i<20;i++) e.step(1/60);
assert.equal(e.signalState.get(timed.id), true);
e.pressButton(timed.id);
for(let i=0;i<20;i++) e.step(1/60);
assert.equal(e.signalState.get(timed.id), true, 'second click restarts the pulse');
for(let i=0;i<11;i++) e.step(1/60);
assert.equal(e.signalState.get(timed.id), false); assert.equal(e.conveyors.get(belt.id)?.active, false);
e.pressButton(timed.id); e.reset();
assert.equal(e.signalState.get(timed.id), false); assert.equal(e.conveyors.get(belt.id)?.active, false);
const initiallyOn = {...timed, props:{...timed.props, signal:true}};
e.sync([belt, initiallyOn]); assert.equal(e.signalState.get(timed.id), true);
e.setButton(timed.id, false); e.reset();
assert.equal(e.signalState.get(timed.id), true, 'reset restores authored initial state');
assert.equal(e.conveyors.get(belt.id)?.active, true);
console.log('buttons and conveyors: initial states, toggles, timed pulses, reset, multi-input and disconnect OK');
