import assert from 'node:assert/strict';
import { Engine } from '../src/sim/engine';
import { makeItem } from '../src/data/library';

// The scene may accumulate hundreds of real objects without silently disabling
// every feeder or deleting products that happen to rest on the floor.
const e = new Engine();
const feeders = Array.from({length: 12}, (_, i) => makeItem('feeder', [40 + i * 2, 0, 40], 0, {props: {active: true, interval: 4, product: 'carton'}}));
e.sync(feeders);
for (let i = 0; i < 200; i++) e.spawn('carton', -30 + (i % 20) * 2, .13, -30 + Math.floor(i / 20) * 2);
e.setRunning(true);
for (let i = 0; i < 80; i++) e.step(1 / 60);
assert.equal(e.stats.spawned, 212, 'all twelve feeders continue beyond 180 existing parts');
assert.equal(e.boxes.length, 212, 'floor products are not silently culled');
assert.equal(e.boxes.filter(box => box.state === 'dying').length, 0);
console.log('large scenes: 200 retained parts and twelve simultaneously operating feeders OK');
