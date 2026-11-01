import assert from 'node:assert/strict';
import { Engine } from '../src/sim/engine';
import { DEFAULT_GEN, generateFactory, parsePrompt } from '../src/sim/generator';
import { enable, snapshot, difference } from '../benchmarks/hybrid-utils';

const scenarios=[
  generateFactory({...DEFAULT_GEN,stages:1,operators:false,fences:false}),
  generateFactory(parsePrompt('metalworking line with 1 cell, human operator',DEFAULT_GEN)),
  generateFactory({...DEFAULT_GEN,stages:3,lanes:2,operators:true,staff:4,fences:false}),
];
for(let index=0;index<scenarios.length;index++) {
  const ts=new Engine(),hybrid=new Engine(),dispose=enable(hybrid);
  ts.stepBudgetMs=40;hybrid.stepBudgetMs=40;
  ts.sync(structuredClone(scenarios[index]));hybrid.sync(structuredClone(scenarios[index]));
  ts.setRunning(true);hybrid.setRunning(true);
  try {
    for(let frame=0;frame<60*60;frame++) {
      ts.step(1/60);hybrid.step(1/60);await Promise.resolve();await Promise.resolve();
      assert.equal(difference(snapshot(ts),snapshot(hybrid)),null,`scene ${index} frame ${frame}`);
    }
    assert.ok(ts.stats.spawned>0,`scene ${index} must spawn products`);
  } finally {ts.setRunning(false);hybrid.setRunning(false);dispose();}
}
console.log('Combined Rust hybrid: selected state matched TypeScript every frame in three 60-second scenes (1e-8 relative tolerance)');
