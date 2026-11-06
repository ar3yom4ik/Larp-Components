import assert from 'node:assert/strict';
import { createEmissiveMRT } from '../src/components/emissiveMrt';

const targets = createEmissiveMRT();
assert.equal(targets.has('output'), true);
assert.equal(targets.has('emissive'), true);
assert.equal(targets.getBlendMode('emissive'), targets.getBlendMode('output'), 'emission must use the material alpha/blending');
const clear = targets.getClearColor('emissive');
assert.ok(clear);
assert.deepEqual([clear.r, clear.g, clear.b, clear.a], [0, 0, 0, 0], 'scene background must not contribute to bloom');
// The fourth channel is the scene output alpha, not an implicit opaque 1.
const node = targets.get('emissive') as unknown as { nodeType: string; nodes: Array<{ components?: string; node?: { name: string } }> };
assert.equal(node.nodeType, 'vec4');
assert.equal(node.nodes.length, 2);
assert.equal(node.nodes[1].components, 'w');
assert.equal(node.nodes[1].node?.name, 'Output');
console.log('Emissive WebGPU MRT configuration passed');
