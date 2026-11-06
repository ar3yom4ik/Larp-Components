import assert from 'node:assert/strict';
import {DEFAULT_GEN,generateFactory} from '../src/sim/generator';
import {Engine} from '../src/sim/engine';
for(const [mode,kind] of [['laser','laser'],['proximity','sensor']] as const){
 const items=generateFactory({...DEFAULT_GEN,operators:false,fences:false,pickupSensor:mode});
 const sensors=items.filter(i=>i.kind===kind),robots=items.filter(i=>i.program);
 assert.equal(sensors.length,robots.length);assert.ok(sensors.every(s=>s.props.mountedTo&&robots.some(r=>r.id===s.props.connectedTo)));
 const e=new Engine();e.sync(items);e.setRunning(true);
 for(let i=0;i<160*60;i++){e.step(1/60);await Promise.resolve();await Promise.resolve();}
 assert.ok(e.stats.placed>0,`${mode} form-generated factory should produce: ${JSON.stringify(e.stats)}`);
}
assert.ok(!generateFactory({...DEFAULT_GEN,pickupSensor:'none'}).some(i=>i.kind==='laser'||i.kind==='sensor'));
console.log('generator form: mounted laser and proximity pickup, signals and live output OK');
